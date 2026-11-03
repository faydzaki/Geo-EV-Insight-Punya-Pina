"""REST API Blueprint for GeoEV Insight.

Provides JSON endpoints for the Next.js frontend while keeping the existing
Dash application intact. Register this blueprint on the Flask server that
Dash creates:

    from flask_cors import CORS
    import api as api_module
    server.register_blueprint(api_module.bp)
    CORS(server, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

All endpoints require HTTP Basic Auth. Write endpoints (POST/PUT/PATCH) are
restricted to the admin account.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import secrets
from functools import wraps
from io import BytesIO

import pandas as pd
from flask import Blueprint, Response, jsonify, request

import database
from storytelling import compare_areas, comparison_quality

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------

bp = Blueprint("api", __name__, url_prefix="/api")

# ---------------------------------------------------------------------------
# Auth helpers
# (Credentials are read from env so that this module does not depend on the
# order of initialisation relative to app.py.)
# ---------------------------------------------------------------------------

def _get_admin():
    return os.getenv("GEOEV_ADMIN_USER", ""), os.getenv("GEOEV_ADMIN_PASSWORD", "")


def _get_viewer():
    return os.getenv("GEOEV_VIEWER_USER", ""), os.getenv("GEOEV_VIEWER_PASSWORD", "")


def _check_auth(username: str | None, password: str | None) -> bool:
    """Return True if credentials match admin OR viewer."""
    if not username or not password:
        return False
    admin_u, admin_p = _get_admin()
    viewer_u, viewer_p = _get_viewer()
    is_admin = secrets.compare_digest(username, admin_u) and secrets.compare_digest(password, admin_p)
    is_viewer = secrets.compare_digest(username, viewer_u) and secrets.compare_digest(password, viewer_p)
    return is_admin or is_viewer


def _is_admin(username: str | None, password: str | None) -> bool:
    if not username or not password:
        return False
    admin_u, admin_p = _get_admin()
    return secrets.compare_digest(username, admin_u) and secrets.compare_digest(password, admin_p)


def _unauthorized() -> Response:
    return Response(
        json.dumps({"error": "Autentikasi diperlukan"}),
        status=401,
        mimetype="application/json",
        headers={"WWW-Authenticate": 'Basic realm="GeoEV Insight API"'},
    )


def _forbidden() -> Response:
    return Response(
        json.dumps({"error": "Hanya admin yang dapat melakukan operasi ini"}),
        status=403,
        mimetype="application/json",
    )


def api_auth_required(f):
    """Decorator: require valid Basic Auth (admin or viewer)."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        username = auth.username if auth else None
        password = auth.password if auth else None
        if not _check_auth(username, password):
            return _unauthorized()
        return f(*args, **kwargs)
    return decorated


def api_admin_required(f):
    """Decorator: require admin credentials."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        username = auth.username if auth else None
        password = auth.password if auth else None
        if not _check_auth(username, password):
            return _unauthorized()
        if not _is_admin(username, password):
            return _forbidden()
        return f(*args, **kwargs)
    return decorated


def _current_actor() -> str:
    auth = request.authorization
    return auth.username if auth and auth.username else "api"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _err(message: str, status: int = 400) -> Response:
    return Response(
        json.dumps({"error": message}, ensure_ascii=False),
        status=status,
        mimetype="application/json",
    )


def _json_response(data, status: int = 200) -> Response:
    return Response(
        json.dumps(data, ensure_ascii=False, default=str),
        status=status,
        mimetype="application/json",
    )


def _parse_spklu_binary(file_bytes: bytes, filename: str):
    """Parse raw Excel bytes for SPKLU; delegates to app.py parser functions.

    We import lazily to avoid circular import at module load time.
    """
    if not filename.lower().endswith(".xlsx"):
        raise ValueError("File harus berformat .xlsx")
    if len(file_bytes) > 20 * 1024 * 1024:
        raise ValueError("Ukuran file maksimal 20 MB")
    # Import at call-time to avoid circular dependency.
    from app import parse_spklu  # noqa: PLC0415
    sheets = pd.read_excel(BytesIO(file_bytes), sheet_name=None, dtype=object)
    if not sheets:
        raise ValueError("File Excel tidak memiliki sheet")
    return parse_spklu(sheets)


def _parse_hcs_binary(file_bytes: bytes, filename: str):
    """Parse raw Excel bytes for HCS."""
    if not filename.lower().endswith(".xlsx"):
        raise ValueError("File harus berformat .xlsx")
    if len(file_bytes) > 20 * 1024 * 1024:
        raise ValueError("Ukuran file maksimal 20 MB")
    from app import parse_hcs  # noqa: PLC0415
    sheets = pd.read_excel(BytesIO(file_bytes), sheet_name=None, dtype=object)
    if not sheets:
        raise ValueError("File Excel tidak memiliki sheet")
    return parse_hcs(sheets)


def _site_row_to_dict(row: dict) -> dict:
    """Convert a DB row (dict) to the public SPKLU API shape."""
    try:
        rincian = json.loads(row.get("rincian") or "[]")
    except (ValueError, TypeError):
        rincian = []
    return {
        "id": row["id"],
        "nama": row["nama"],
        "alamat": row["alamat"],
        "pengelola": row["pengelola"],
        "provinsi": row["provinsi"],
        "wilayah": row["wilayah"],
        "lat": row["lat"],
        "lon": row["lon"],
        "daya": row["daya"],
        "unit": row["unit"],
        "connector": row["connector"],
        "rincian": rincian,
    }


def _apply_spklu_filters(sites_df: pd.DataFrame) -> pd.DataFrame:
    """Apply query-string filters from the current request to a SPKLU DataFrame."""
    result = sites_df.copy()

    prov = request.args.get("prov", "").strip()
    owner = request.args.get("owner", "").strip()
    area = request.args.get("area", "").strip()
    power = request.args.get("power", "all").strip()
    search = request.args.get("search", "").strip()

    if prov:
        result = result[result["provinsi"] == prov]
    if owner:
        result = result[result["pengelola"] == owner]
    if area:
        result = result[result["wilayah"] == area]

    if search:
        import unicodedata, re  # noqa: PLC0415

        def _norm(text: str) -> str:
            text = unicodedata.normalize("NFKC", str(text)).casefold()
            return re.sub(r"\s+", " ", text)

        query = _norm(search)
        result = result[result.apply(
            lambda r: query in _norm(str(r["nama"]) + " " + str(r["alamat"])),
            axis=1,
        )]

    if power != "all" and not result.empty:
        def _has_power(rincian_json):
            try:
                items = json.loads(rincian_json) if isinstance(rincian_json, str) else rincian_json
                for d in (items or []):
                    kw = float(d.get("kw", 0))
                    if (power == "low" and kw <= 22) or \
                       (power == "medium" and 22 < kw <= 50) or \
                       (power == "fast" and 50 < kw <= 100) or \
                       (power == "ultra" and kw > 100):
                        return True
            except (ValueError, TypeError):
                pass
            return False

        result = result[result["rincian"].map(_has_power)]

    return result


# ---------------------------------------------------------------------------
# Read endpoints
# ---------------------------------------------------------------------------

@bp.route("/spklu", methods=["GET"])
@api_auth_required
def list_spklu():
    """GET /api/spklu — list semua SPKLU aktif dengan filter opsional."""
    try:
        sites, _, metadata = database.load_data()
        if not sites.empty:
            sites = _apply_spklu_filters(sites)
        data = [_site_row_to_dict(row) for _, row in sites.iterrows()] if not sites.empty else []
        return _json_response({
            "data": data,
            "total": len(data),
            "updated": metadata.get("spklu_updated", ""),
        })
    except Exception as exc:
        logger.exception("GET /api/spklu failed")
        return _err(str(exc), 500)


@bp.route("/spklu/<int:site_id>", methods=["GET"])
@api_auth_required
def get_spklu(site_id: int):
    """GET /api/spklu/<id> — detail satu lokasi SPKLU termasuk rincian charger."""
    try:
        snapshot, token = database.get_site(site_id)
        return _json_response({
            "id": snapshot["id"],
            "nama": snapshot["nama"],
            "alamat": snapshot["alamat"],
            "pengelola": snapshot["pengelola"],
            "provinsi": snapshot["provinsi"],
            "wilayah": snapshot["wilayah"],
            "lat": snapshot["lat"],
            "lon": snapshot["lon"],
            "daya": snapshot["daya"],
            "unit": snapshot["unit"],
            "connector": snapshot["connector"],
            "aktif": snapshot.get("aktif", 1),
            "rincian": snapshot.get("details", []),
            "token": token,
        })
    except ValueError as exc:
        return _err(str(exc), 404)
    except Exception as exc:
        logger.exception("GET /api/spklu/%s failed", site_id)
        return _err(str(exc), 500)


@bp.route("/hcs", methods=["GET"])
@api_auth_required
def list_hcs():
    """GET /api/hcs — seluruh data HCS teragregasi."""
    try:
        _, hcs, metadata = database.load_data()
        data = hcs.to_dict("records") if not hcs.empty else []
        total_records = int(hcs["jumlah"].sum()) if not hcs.empty else 0
        return _json_response({
            "data": data,
            "total_records": total_records,
            "updated": metadata.get("hcs_updated", ""),
        })
    except Exception as exc:
        logger.exception("GET /api/hcs failed")
        return _err(str(exc), 500)


@bp.route("/metadata", methods=["GET"])
@api_auth_required
def get_metadata():
    """GET /api/metadata — timestamp terakhir update data."""
    try:
        _, _, metadata = database.load_data()
        return _json_response({
            "spklu_updated": metadata.get("spklu_updated", ""),
            "hcs_updated": metadata.get("hcs_updated", ""),
        })
    except Exception as exc:
        logger.exception("GET /api/metadata failed")
        return _err(str(exc), 500)


@bp.route("/compare", methods=["GET"])
@api_auth_required
def get_compare():
    """GET /api/compare — perbandingan HCS vs SPKLU per wilayah."""
    try:
        sites, hcs, _ = database.load_data()
        area = request.args.get("area", "Semua").strip() or "Semua"
        comparison = compare_areas(sites, hcs, area)
        quality = comparison_quality(sites, hcs)

        rows = []
        for _, r in comparison.iterrows():
            rows.append({
                "Wilayah": r["Wilayah"],
                "HCS": int(r["HCS"]),
                "SPKLU": int(r["SPKLU"]),
                "Rasio": round(float(r["Rasio"]), 2) if r["Rasio"] is not None and pd.notna(r["Rasio"]) else None,
                "Status": r["Status"],
            })

        return _json_response({
            "data": rows,
            "quality": quality,
        })
    except Exception as exc:
        logger.exception("GET /api/compare failed")
        return _err(str(exc), 500)


@bp.route("/quality", methods=["GET"])
@api_auth_required
def get_quality():
    """GET /api/quality — laporan kualitas data SPKLU."""
    try:
        sites, hcs, _ = database.load_data()
        issues = []
        if not sites.empty:
            for _, row in sites.iterrows():
                flags = []
                if row["provinsi"] == "Jawa Timur" and row["wilayah"] == "Tidak diketahui":
                    flags.append("Kabupaten/kota belum dikenali")
                if row["unit"] <= 0:
                    flags.append("Rincian charger kosong")
                if row["pengelola"] == "Tidak diketahui":
                    flags.append("Pengelola belum dikenali")
                if not (-9.8 <= row["lat"] <= -5.3 and 110 <= row["lon"] <= 116.5):
                    flags.append("Koordinat di luar cakupan")
                if flags:
                    issues.append({
                        "nama": row["nama"],
                        "provinsi": row["provinsi"],
                        "alamat": row["alamat"],
                        "masalah": "; ".join(flags),
                    })

        quality = comparison_quality(sites, hcs)
        kpis = {
            "issues_count": len(issues),
            "unmapped_jatim": quality["spklu_unmapped"],
            "hcs_area_count": int(hcs["wilayah"].nunique()) if not hcs.empty else 0,
        }
        return _json_response({"issues": issues, "kpis": kpis})
    except Exception as exc:
        logger.exception("GET /api/quality failed")
        return _err(str(exc), 500)


@bp.route("/history", methods=["GET"])
@api_admin_required
def get_history():
    """GET /api/history — riwayat 100 perubahan terakhir (admin only)."""
    try:
        rows = database.history(limit=100)
        return _json_response({"data": rows})
    except Exception as exc:
        logger.exception("GET /api/history failed")
        return _err(str(exc), 500)


@bp.route("/areas", methods=["GET"])
@api_auth_required
def get_areas():
    """GET /api/areas — daftar kabupaten/kota unik dari data SPKLU dan HCS."""
    try:
        sites, hcs, _ = database.load_data()
        areas: set[str] = set()
        if not sites.empty:
            areas |= set(sites["wilayah"].tolist())
        if not hcs.empty:
            areas |= set(hcs["wilayah"].tolist())
        areas.discard("Tidak diketahui")
        return _json_response({"areas": sorted(areas)})
    except Exception as exc:
        logger.exception("GET /api/areas failed")
        return _err(str(exc), 500)


# ---------------------------------------------------------------------------
# Write endpoints — admin only
# ---------------------------------------------------------------------------

@bp.route("/spklu", methods=["POST"])
@api_admin_required
def create_spklu():
    """POST /api/spklu — tambah SPKLU secara manual."""
    body = request.get_json(silent=True) or {}
    required = ("nama", "alamat", "pengelola", "provinsi", "wilayah", "lat", "lon", "details")
    missing = [f for f in required if f not in body]
    if missing:
        return _err("Field wajib tidak ada: " + ", ".join(missing), 400)

    request_id = str(body.get("request_id") or "")
    reason = str(body.get("reason") or "").strip()
    if not request_id:
        return _err("request_id wajib diisi", 400)
    if not reason:
        return _err("reason wajib diisi", 400)

    values = {
        "nama": body.get("nama"),
        "alamat": body.get("alamat"),
        "pengelola": body.get("pengelola"),
        "provinsi": body.get("provinsi"),
        "wilayah": body.get("wilayah"),
        "lat": body.get("lat"),
        "lon": body.get("lon"),
    }
    details = body.get("details", [])

    try:
        site_id = database.save_site_manual(
            values=values,
            details=details,
            actor=_current_actor(),
            reason=reason,
            request_id=request_id,
            site_id=None,
            expected=None,
        )
        return _json_response({"id": site_id, "message": "SPKLU berhasil ditambahkan"}, 201)
    except ValueError as exc:
        return _err(str(exc), 422)
    except Exception as exc:
        logger.exception("POST /api/spklu failed")
        return _err(str(exc), 500)


@bp.route("/spklu/<int:site_id>", methods=["PUT"])
@api_admin_required
def update_spklu(site_id: int):
    """PUT /api/spklu/<id> — edit SPKLU yang sudah ada."""
    body = request.get_json(silent=True) or {}
    required = ("nama", "alamat", "pengelola", "provinsi", "wilayah", "lat", "lon", "details", "reason", "request_id")
    missing = [f for f in required if f not in body]
    if missing:
        return _err("Field wajib tidak ada: " + ", ".join(missing), 400)

    request_id = str(body.get("request_id") or "").strip()
    reason = str(body.get("reason") or "").strip()
    expected = body.get("expected")  # snapshot token, may be None

    if not request_id:
        return _err("request_id wajib diisi", 400)
    if not reason:
        return _err("reason wajib diisi", 400)

    values = {
        "nama": body.get("nama"),
        "alamat": body.get("alamat"),
        "pengelola": body.get("pengelola"),
        "provinsi": body.get("provinsi"),
        "wilayah": body.get("wilayah"),
        "lat": body.get("lat"),
        "lon": body.get("lon"),
    }
    details = body.get("details", [])

    try:
        saved_id = database.save_site_manual(
            values=values,
            details=details,
            actor=_current_actor(),
            reason=reason,
            request_id=request_id,
            site_id=site_id,
            expected=expected,
        )
        return _json_response({"id": saved_id, "message": "SPKLU berhasil diperbarui"})
    except ValueError as exc:
        return _err(str(exc), 422)
    except Exception as exc:
        logger.exception("PUT /api/spklu/%s failed", site_id)
        return _err(str(exc), 500)


@bp.route("/spklu/<int:site_id>/status", methods=["PATCH"])
@api_admin_required
def set_spklu_status(site_id: int):
    """PATCH /api/spklu/<id>/status — aktifkan atau nonaktifkan SPKLU."""
    body = request.get_json(silent=True) or {}
    required = ("active", "reason", "request_id", "expected")
    missing = [f for f in required if f not in body]
    if missing:
        return _err("Field wajib tidak ada: " + ", ".join(missing), 400)

    try:
        active = int(body["active"])
    except (TypeError, ValueError):
        return _err("Field 'active' harus 0 atau 1", 400)

    reason = str(body.get("reason") or "").strip()
    request_id = str(body.get("request_id") or "").strip()
    expected = body.get("expected")

    if not reason:
        return _err("reason wajib diisi", 400)
    if not request_id:
        return _err("request_id wajib diisi", 400)

    try:
        database.set_site_active(
            site_id=site_id,
            active=active,
            expected=expected,
            actor=_current_actor(),
            reason=reason,
            request_id=request_id,
        )
        status_label = "diaktifkan" if active else "dinonaktifkan"
        return _json_response({"id": site_id, "active": active, "message": f"SPKLU berhasil {status_label}"})
    except ValueError as exc:
        return _err(str(exc), 422)
    except Exception as exc:
        logger.exception("PATCH /api/spklu/%s/status failed", site_id)
        return _err(str(exc), 500)


@bp.route("/hcs/adjust", methods=["POST"])
@api_admin_required
def adjust_hcs():
    """POST /api/hcs/adjust — koreksi jumlah HCS per wilayah dan merek."""
    body = request.get_json(silent=True) or {}
    required = ("area", "brand", "amount", "mode", "expected_count", "reason", "request_id")
    missing = [f for f in required if f not in body]
    if missing:
        return _err("Field wajib tidak ada: " + ", ".join(missing), 400)

    try:
        new_total = database.adjust_hcs(
            area=body["area"],
            brand=body["brand"],
            amount=body["amount"],
            mode=body["mode"],
            expected_count=body["expected_count"],
            actor=_current_actor(),
            reason=str(body.get("reason") or ""),
            request_id=str(body.get("request_id") or ""),
        )
        return _json_response({
            "area": body["area"],
            "brand": body["brand"],
            "new_total": new_total,
            "message": "Jumlah HCS berhasil diperbarui",
        })
    except ValueError as exc:
        return _err(str(exc), 422)
    except Exception as exc:
        logger.exception("POST /api/hcs/adjust failed")
        return _err(str(exc), 500)


# ---------------------------------------------------------------------------
# File upload endpoints — admin only
# ---------------------------------------------------------------------------

@bp.route("/upload/spklu", methods=["POST"])
@api_admin_required
def upload_spklu():
    """POST /api/upload/spklu — upload file Excel SPKLU (multipart/form-data)."""
    if "file" not in request.files:
        return _err("Field 'file' tidak ditemukan pada request", 400)

    uploaded = request.files["file"]
    filename = uploaded.filename or ""
    if not filename.lower().endswith(".xlsx"):
        return _err("File harus berformat .xlsx", 400)

    try:
        file_bytes = uploaded.read()
        rows, status = _parse_spklu_binary(file_bytes, filename)
        actor = _current_actor()
        result = database.save_spklu(rows, actor=actor, reason=f"Upload API: {filename}")
        return _json_response({
            "message": status,
            "inserted": result["inserted"],
            "updated": result["updated"],
            "total": result["total"],
        }, 200)
    except ValueError as exc:
        return _err(str(exc), 422)
    except Exception as exc:
        logger.exception("POST /api/upload/spklu failed")
        return _err(str(exc), 500)


@bp.route("/upload/hcs", methods=["POST"])
@api_admin_required
def upload_hcs():
    """POST /api/upload/hcs — upload file Excel HCS (multipart/form-data).

    Form fields:
      - file: the .xlsx file
      - mode: "replace" (default) or "add"
    """
    if "file" not in request.files:
        return _err("Field 'file' tidak ditemukan pada request", 400)

    uploaded = request.files["file"]
    filename = uploaded.filename or ""
    if not filename.lower().endswith(".xlsx"):
        return _err("File harus berformat .xlsx", 400)

    mode = request.form.get("mode", "replace").strip()
    if mode not in ("replace", "add"):
        return _err("Mode harus 'replace' atau 'add'", 400)

    try:
        file_bytes = uploaded.read()
        counts, _by_area, status = _parse_hcs_binary(file_bytes, filename)
        fingerprint = hashlib.sha256(file_bytes).hexdigest()
        actor = _current_actor()
        database.save_hcs(
            counts,
            actor=actor,
            reason=f"Upload API: {filename}",
            mode=mode,
            fingerprint=fingerprint,
        )
        return _json_response({"message": status, "mode": mode}, 200)
    except ValueError as exc:
        return _err(str(exc), 422)
    except Exception as exc:
        logger.exception("POST /api/upload/hcs failed")
        return _err(str(exc), 500)
