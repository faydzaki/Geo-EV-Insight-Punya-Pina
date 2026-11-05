"""REST API Blueprint for GeoEV Insight.

Provides JSON endpoints for the Next.js frontend while keeping the existing
Dash application intact. Register this blueprint on the Flask server that
Dash creates:

    from flask_cors import CORS
    import api as api_module
    server.register_blueprint(api_module.bp)
    CORS(server, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

All endpoints require a valid JWT Bearer token obtained from POST /api/auth/login.
Write endpoints (POST/PUT/PATCH) are restricted to admin/super_admin roles.
User management endpoints are restricted to super_admin only.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta
from functools import wraps
from io import BytesIO

import pandas as pd
from flask import Blueprint, Response, jsonify, request

try:
    import jwt as _jwt
    _JWT_AVAILABLE = True
except ImportError:
    _JWT_AVAILABLE = False

import database
from storytelling import compare_areas, comparison_quality

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------

bp = Blueprint("api", __name__, url_prefix="/api")

# ---------------------------------------------------------------------------
# JWT Auth helpers
# ---------------------------------------------------------------------------

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "geoev-dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 8


def _make_jwt(user: dict) -> str:
    if not _JWT_AVAILABLE:
        raise RuntimeError("PyJWT is not installed. Run: pip install PyJWT>=2.8")
    payload = {
        "sub": str(user["id"]),       # PyJWT>=2.8 mensyaratkan sub berbentuk string
        "uid": user["id"],            # simpan integer di field terpisah
        "username": user["username"],
        "role": user["role"],
        "display_name": user.get("display_name") or user["username"],
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return _jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def _decode_jwt(token: str) -> dict:
    if not _JWT_AVAILABLE:
        raise RuntimeError("PyJWT is not installed. Run: pip install PyJWT>=2.8")
    return _jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM], options={"verify_sub": False})


def _get_jwt_user():
    """Extract user info dari Bearer JWT token. Return None jika tidak valid."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        return _decode_jwt(token)
    except Exception:
        return None


def jwt_auth_required(f):
    """Decorator: butuh JWT token valid."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = _get_jwt_user()
        if user is None:
            return jsonify({"error": "Autentikasi diperlukan"}), 401
        return f(*args, **kwargs)
    return decorated


def jwt_admin_required(f):
    """Decorator: butuh JWT token dengan role admin atau super_admin."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = _get_jwt_user()
        if user is None:
            return jsonify({"error": "Autentikasi diperlukan"}), 401
        if user.get("role") not in ("admin", "super_admin"):
            return jsonify({"error": "Akses admin diperlukan"}), 403
        return f(*args, **kwargs)
    return decorated


def jwt_superadmin_required(f):
    """Decorator: butuh JWT token dengan role super_admin."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = _get_jwt_user()
        if user is None:
            return jsonify({"error": "Autentikasi diperlukan"}), 401
        if user.get("role") != "super_admin":
            return jsonify({"error": "Akses super admin diperlukan"}), 403
        return f(*args, **kwargs)
    return decorated


def _current_actor() -> str:
    user = _get_jwt_user()
    return user["username"] if user and user.get("username") else "api"


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
@jwt_auth_required
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
@jwt_auth_required
def get_spklu(site_id: int):
    """GET /api/spklu/<id> — detail satu lokasi SPKLU termasuk rincian charger."""
    try:
        snapshot, token = database.get_site(site_id)
        aktif_val = snapshot.get("aktif", 1)
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
            "aktif": aktif_val,
            "active": aktif_val,   # alias untuk frontend Next.js
            "rincian": snapshot.get("details", []),
            "token": token,
        })
    except ValueError as exc:
        return _err(str(exc), 404)
    except Exception as exc:
        logger.exception("GET /api/spklu/%s failed", site_id)
        return _err(str(exc), 500)


@bp.route("/hcs", methods=["GET"])
@jwt_auth_required
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
@jwt_auth_required
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
@jwt_auth_required
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
@jwt_auth_required
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
@jwt_admin_required
def get_history():
    """GET /api/history — riwayat 100 perubahan terakhir (admin only)."""
    try:
        rows = database.history(limit=100)
        return _json_response({"data": rows})
    except Exception as exc:
        logger.exception("GET /api/history failed")
        return _err(str(exc), 500)


@bp.route("/areas", methods=["GET"])
@jwt_auth_required
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
        return _json_response({"areas": sorted(areas), "data": sorted(areas)})
    except Exception as exc:
        logger.exception("GET /api/areas failed")
        return _err(str(exc), 500)


# ---------------------------------------------------------------------------
# Write endpoints — admin only
# ---------------------------------------------------------------------------

@bp.route("/spklu", methods=["POST"])
@jwt_admin_required
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
@jwt_admin_required
def update_spklu(site_id: int):
    """PUT /api/spklu/<id> — edit SPKLU yang sudah ada."""
    body = request.get_json(silent=True) or {}
    required = ("nama", "alamat", "pengelola", "provinsi", "wilayah", "lat", "lon", "details", "reason")
    missing = [f for f in required if f not in body]
    if missing:
        return _err("Field wajib tidak ada: " + ", ".join(missing), 400)

    request_id = str(body.get("request_id") or uuid.uuid4()).strip()
    reason = str(body.get("reason") or "").strip()
    expected = body.get("expected")  # snapshot token, may be None

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
@jwt_admin_required
def set_spklu_status(site_id: int):
    """PATCH /api/spklu/<id>/status — aktifkan atau nonaktifkan SPKLU."""
    body = request.get_json(silent=True) or {}
    required = ("active", "reason")
    missing = [f for f in required if f not in body]
    if missing:
        return _err("Field wajib tidak ada: " + ", ".join(missing), 400)

    try:
        active = int(body["active"])
    except (TypeError, ValueError):
        return _err("Field 'active' harus 0 atau 1", 400)

    reason = str(body.get("reason") or "").strip()
    request_id = str(body.get("request_id") or uuid.uuid4()).strip()
    expected = body.get("expected")

    if not reason:
        return _err("reason wajib diisi", 400)

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
@jwt_admin_required
def adjust_hcs():
    """POST /api/hcs/adjust — koreksi jumlah HCS per wilayah dan merek."""
    body = request.get_json(silent=True) or {}
    required = ("area", "brand", "amount", "mode", "reason")
    missing = [f for f in required if f not in body]
    if missing:
        return _err("Field wajib tidak ada: " + ", ".join(missing), 400)

    try:
        req_id = str(body.get("request_id") or uuid.uuid4())
        expected_cnt = body.get("expected_count")
        new_total = database.adjust_hcs(
            area=body["area"],
            brand=body["brand"],
            amount=body["amount"],
            mode=body["mode"],
            expected_count=expected_cnt,
            actor=_current_actor(),
            reason=str(body.get("reason") or ""),
            request_id=req_id,
        )
        return _json_response({
            "area": body["area"],
            "brand": body["brand"],
            "new_total": new_total,
            "total": new_total,
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
@jwt_admin_required
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
@jwt_admin_required
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



# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@bp.route("/auth/login", methods=["POST"])
def auth_login():
    """POST /api/auth/login — Login dan dapatkan JWT token."""
    if not _JWT_AVAILABLE:
        return jsonify({"error": "PyJWT belum terinstall di server"}), 503
    body = request.get_json(silent=True) or {}
    username = str(body.get("username") or "").strip()
    password = str(body.get("password") or "")
    if not username or not password:
        return jsonify({"error": "Username dan password wajib diisi"}), 400
    try:
        user = database.authenticate_user(username, password)
        if user is None:
            return jsonify({"error": "Username atau password salah"}), 401
        token = _make_jwt(user)
        return jsonify({
            "token": token,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "role": user["role"],
                "display_name": user.get("display_name") or user["username"],
            }
        })
    except Exception:
        logger.exception("Login failed")
        return jsonify({"error": "Login gagal"}), 500


@bp.route("/auth/me", methods=["GET"])
@jwt_auth_required
def auth_me():
    """GET /api/auth/me — Dapatkan info user yang sedang login."""
    user = _get_jwt_user()
    return jsonify(user)


@bp.route("/auth/change-password", methods=["POST"])
@jwt_auth_required
def auth_change_password():
    """POST /api/auth/change-password — Ganti password sendiri."""
    current = _get_jwt_user()
    body = request.get_json(silent=True) or {}
    old_pass = str(body.get("old_password") or "")
    new_pass = str(body.get("new_password") or "")
    if len(new_pass) < 8:
        return jsonify({"error": "Password baru minimal 8 karakter"}), 400
    try:
        user = database.authenticate_user(current["username"], old_pass)
        if user is None:
            return jsonify({"error": "Password lama salah"}), 400
        database.update_user(current["sub"], {"password": new_pass})
        return jsonify({"message": "Password berhasil diubah"})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        logger.exception("Change password failed")
        return jsonify({"error": "Gagal mengubah password"}), 500


# ---------------------------------------------------------------------------
# User management endpoints — admin or super_admin
# ---------------------------------------------------------------------------

@bp.route("/users", methods=["GET"])
@jwt_admin_required
def list_users():
    """GET /api/users — daftar semua user (admin & super_admin)."""
    try:
        all_users = database.get_all_users()
        # Jangan kirim password_hash
        safe = [{k: v for k, v in u.items() if k != "password_hash"} for u in all_users]
        # Format datetime and normalize active flag
        for u in safe:
            u["active"] = u.get("is_active", 1)
            for dt_key in ("created_at", "last_login"):
                if u.get(dt_key) and hasattr(u[dt_key], "strftime"):
                    u[dt_key] = u[dt_key].strftime("%d/%m/%Y %H:%M")
        return jsonify({"data": safe})
    except Exception:
        logger.exception("List users failed")
        return jsonify({"error": "Gagal memuat daftar user"}), 500


@bp.route("/users", methods=["POST"])
@jwt_admin_required
def create_user():
    """POST /api/users — buat user baru (admin & super_admin)."""
    body = request.get_json(silent=True) or {}
    try:
        uid = database.create_user(
            username=str(body.get("username") or "").strip(),
            password=str(body.get("password") or ""),
            role=str(body.get("role") or "viewer"),
            display_name=str(body.get("display_name") or ""),
        )
        return jsonify({"id": uid, "message": "User berhasil dibuat"}), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        logger.exception("Create user failed")
        return jsonify({"error": "Gagal membuat user"}), 500


@bp.route("/users/<int:user_id>", methods=["PUT"])
@jwt_admin_required
def update_user(user_id: int):
    """PUT /api/users/<id> — update user (admin & super_admin)."""
    body = request.get_json(silent=True) or {}
    try:
        database.update_user(user_id, body)
        return jsonify({"message": "User berhasil diperbarui"})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        logger.exception("Update user failed")
        return jsonify({"error": "Gagal memperbarui user"}), 500


@bp.route("/users/<int:user_id>", methods=["DELETE"])
@jwt_admin_required
def delete_user(user_id: int):
    """DELETE /api/users/<id> — hapus user (admin & super_admin)."""
    current = _get_jwt_user()
    try:
        database.delete_user(user_id, current_user_id=current["sub"])
        return jsonify({"message": "User berhasil dihapus"})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        logger.exception("Delete user failed")
        return jsonify({"error": "Gagal menghapus user"}), 500


# ---------------------------------------------------------------------------
# Export endpoints
# ---------------------------------------------------------------------------

@bp.route("/export/spklu", methods=["GET"])
@jwt_auth_required
def export_spklu():
    """GET /api/export/spklu — Export data SPKLU sebagai Excel (.xlsx)."""
    try:
        sites, _, _ = database.load_data()
        if sites.empty:
            return jsonify({"error": "Tidak ada data SPKLU"}), 404

        export_cols = ["id", "nama", "alamat", "pengelola", "provinsi", "wilayah",
                       "lat", "lon", "daya", "unit", "connector"]
        df = sites[export_cols].copy()
        df.columns = ["ID", "Nama", "Alamat", "Pengelola", "Provinsi",
                      "Kabupaten/Kota", "Latitude", "Longitude",
                      "Daya (kW)", "Unit Charger", "Konektor"]

        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="SPKLU")
        output.seek(0)

        return Response(
            output.read(),
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=spklu_export.xlsx"}
        )
    except Exception:
        logger.exception("Export SPKLU failed")
        return jsonify({"error": "Export gagal"}), 500


@bp.route("/export/spklu.csv", methods=["GET"])
@jwt_auth_required
def export_spklu_csv():
    """GET /api/export/spklu.csv — Export data SPKLU sebagai CSV."""
    try:
        sites, _, _ = database.load_data()
        if sites.empty:
            return jsonify({"error": "Tidak ada data SPKLU"}), 404
        export_cols = ["id", "nama", "alamat", "pengelola", "provinsi", "wilayah",
                       "lat", "lon", "daya", "unit", "connector"]
        df = sites[export_cols].copy()
        csv_data = df.to_csv(index=False)
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment; filename=spklu_export.csv"}
        )
    except Exception:
        logger.exception("Export SPKLU CSV failed")
        return jsonify({"error": "Export gagal"}), 500


@bp.route("/export/compare", methods=["GET"])
@jwt_auth_required
def export_compare():
    """GET /api/export/compare — Export data perbandingan HCS vs SPKLU sebagai Excel."""
    try:
        sites, hcs, _ = database.load_data()
        comparison = compare_areas(sites, hcs)
        if comparison.empty:
            return jsonify({"error": "Tidak ada data perbandingan"}), 404

        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            comparison.to_excel(writer, index=False, sheet_name="Perbandingan HCS SPKLU")
        output.seek(0)

        return Response(
            output.read(),
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=perbandingan_hcs_spklu.xlsx"}
        )
    except Exception:
        logger.exception("Export compare failed")
        return jsonify({"error": "Export gagal"}), 500


@bp.route("/export/hcs", methods=["GET"])
@jwt_auth_required
def export_hcs():
    """GET /api/export/hcs — Export rekap catatan HCS per wilayah & merk sebagai Excel."""
    try:
        _, hcs, _ = database.load_data()
        if hcs.empty:
            return jsonify({"error": "Tidak ada data HCS"}), 404

        # Sheet 1: rekap per kabupaten/kota
        by_area = (
            hcs.groupby("wilayah", as_index=False)["jumlah"]
            .sum()
            .rename(columns={"wilayah": "Kabupaten/Kota", "jumlah": "Jumlah Catatan HCS"})
            .sort_values("Jumlah Catatan HCS", ascending=False)
        )

        # Sheet 2: rekap per merk kendaraan
        by_brand = (
            hcs.groupby("merk", as_index=False)["jumlah"]
            .sum()
            .rename(columns={"merk": "Kategori Kendaraan", "jumlah": "Jumlah Catatan HCS"})
            .sort_values("Jumlah Catatan HCS", ascending=False)
        )

        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            by_area.to_excel(writer, index=False, sheet_name="Per Kabupaten Kota")
            by_brand.to_excel(writer, index=False, sheet_name="Per Kategori Kendaraan")
        output.seek(0)

        return Response(
            output.read(),
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=hcs_export.xlsx"},
        )
    except Exception:
        logger.exception("Export HCS failed")
        return jsonify({"error": "Export gagal"}), 500


@bp.route("/export/quality", methods=["GET"])
@jwt_auth_required
def export_quality():
    """GET /api/export/quality — Export daftar SPKLU bermasalah sebagai Excel."""
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
                        "Nama SPKLU": row["nama"],
                        "Provinsi": row["provinsi"],
                        "Alamat": row["alamat"],
                        "Pengelola": row["pengelola"],
                        "Kabupaten/Kota": row["wilayah"],
                        "Temuan": "; ".join(flags),
                    })

        if not issues:
            return jsonify({"error": "Tidak ada temuan — semua data sudah bersih"}), 404

        df = pd.DataFrame(issues)
        output = BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Audit SPKLU")
        output.seek(0)

        return Response(
            output.read(),
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=audit_spklu.xlsx"},
        )
    except Exception:
        logger.exception("Export quality failed")
        return jsonify({"error": "Export gagal"}), 500
