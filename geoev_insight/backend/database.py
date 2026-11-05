"""MySQL persistence for GeoEV Insight.

Only aggregated HCS counts are stored. Raw HCS customer identities and
residential coordinates are never inserted into this database.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime
import json
import hashlib
import math
import uuid
import os
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import (
    Column, DateTime, Float, ForeignKey, Integer, MetaData, String, Table,
    Text, create_engine, delete, insert, select, update,
)
from sqlalchemy.engine import URL
from sqlalchemy.exc import IntegrityError
from sqlalchemy.dialects.mysql import LONGTEXT

try:
    import bcrypt as _bcrypt
    _BCRYPT_AVAILABLE = True
except ImportError:
    _BCRYPT_AVAILABLE = False

BASE = Path(__file__).resolve().parent
load_dotenv(BASE / ".env", override=False)

_metadata = MetaData()
spklu = Table(
    "spklu", _metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("nama", String(255), nullable=False),
    Column("alamat", Text, nullable=False),
    Column("pengelola", String(32), nullable=False),
    Column("provinsi", String(50), nullable=False),
    Column("wilayah", String(120), nullable=False),
    Column("lat", Float, nullable=False),
    Column("lon", Float, nullable=False),
    Column("daya", Float, nullable=False),
    Column("unit", Integer, nullable=False),
    Column("connector", Integer, nullable=False),
    mysql_engine="InnoDB", mysql_charset="utf8mb4",
)
spklu_charger = Table(
    "spklu_charger", _metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("spklu_id", Integer, ForeignKey("spklu.id", ondelete="CASCADE"), nullable=False, index=True),
    Column("kelompok", String(32), nullable=False),
    Column("kapasitas_kw", Float, nullable=False),
    Column("unit", Integer, nullable=False),
    Column("connector", Integer, nullable=False),
    mysql_engine="InnoDB", mysql_charset="utf8mb4",
)
hcs_by_brand = Table(
    "hcs_by_brand", _metadata,
    Column("wilayah", String(120), primary_key=True),
    Column("merk", String(120), primary_key=True),
    Column("jumlah", Integer, nullable=False),
    mysql_engine="InnoDB", mysql_charset="utf8mb4",
)
metadata_values = Table(
    "metadata", _metadata,
    Column("k", String(80), primary_key=True),
    Column("v", String(255), nullable=False),
    mysql_engine="InnoDB", mysql_charset="utf8mb4",
)
upload_history = Table(
    "upload_history", _metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("dataset", String(16), nullable=False),
    Column("jumlah_baris", Integer, nullable=False),
    Column("waktu_upload", DateTime, nullable=False),
    mysql_engine="InnoDB", mysql_charset="utf8mb4",
)

# Additive schema only: existing SPKLU/HCS columns and IDs are preserved.
spklu_status = Table(
    "spklu_status", _metadata,
    Column("spklu_id", Integer, ForeignKey("spklu.id", ondelete="CASCADE"), primary_key=True),
    Column("aktif", Integer, nullable=False, default=1),
    mysql_engine="InnoDB", mysql_charset="utf8mb4",
)
change_log = Table(
    "change_log", _metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("request_id", String(80), nullable=False, unique=True),
    Column("dataset", String(16), nullable=False),
    Column("action", String(40), nullable=False),
    Column("target", String(255), nullable=False),
    Column("actor", String(120), nullable=False),
    Column("reason", Text, nullable=False),
    Column("before_json", Text().with_variant(LONGTEXT(), "mysql"), nullable=False),
    Column("after_json", Text().with_variant(LONGTEXT(), "mysql"), nullable=False),
    Column("created_at", DateTime, nullable=False),
    mysql_engine="InnoDB", mysql_charset="utf8mb4",
)

users = Table(
    "users", _metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("username", String(80), unique=True, nullable=False),
    Column("password_hash", String(255), nullable=False),
    Column("role", String(20), nullable=False, default="viewer"),  # super_admin, admin, viewer
    Column("display_name", String(120), nullable=True),
    Column("is_active", Integer, nullable=False, default=1),
    Column("created_at", DateTime, nullable=False),
    Column("last_login", DateTime, nullable=True),
    mysql_engine="InnoDB", mysql_charset="utf8mb4",
)

_engine = None


def _mysql_url():
    """Build driver URL safely even when the password has @, /, or #."""
    needed = ("DB_HOST", "DB_USER", "DB_NAME")
    absent = [key for key in needed if not os.getenv(key)]
    if os.getenv("DB_PASSWORD") is None:
        absent.append("DB_PASSWORD")
    if absent:
        raise RuntimeError("Konfigurasi MySQL belum lengkap di .env: " + ", ".join(absent))
    return URL.create(
        "mysql+pymysql", username=os.environ["DB_USER"],
        password=os.environ.get("DB_PASSWORD", ""), host=os.environ["DB_HOST"],
        port=int(os.getenv("DB_PORT", "3306")), database=os.environ["DB_NAME"],
        query={"charset": "utf8mb4"},
    )


def get_engine():
    global _engine
    if _engine is None:
        ssl_ca = os.getenv("DB_SSL_CA")
        opts = {"ssl": {"ca": ssl_ca}} if ssl_ca else {}
        _engine = create_engine(
            _mysql_url(), pool_pre_ping=True, pool_recycle=1800,
            pool_size=5, max_overflow=5, pool_timeout=20,
            connect_args=opts,
        )
    return _engine


def init_db():
    """Create required tables; the MySQL database itself must exist first."""
    try:
        _metadata.create_all(get_engine())
        try:
            with get_engine().begin() as conn:
                if conn.execute(select(metadata_values.c.k).where(metadata_values.c.k == "_write_lock")).first() is None:
                    conn.execute(insert(metadata_values).values(k="_write_lock", v="1"))
        except IntegrityError:
            pass  # Another worker initialized the same lock row.
        migrate_env_users()  # Migrate admin/viewer accounts from .env on first run.
    except Exception as exc:
        raise RuntimeError(
            "Gagal menghubungkan MySQL. Pastikan server aktif, database sudah "
            "dibuat, dan DB_HOST/DB_USER/DB_PASSWORD/DB_NAME di .env benar. "
            f"Detail: {type(exc).__name__}: {exc}"
        ) from exc


def _stamp():
    return datetime.now(ZoneInfo("Asia/Jakarta")).replace(tzinfo=None)


def hash_password(plain: str) -> str:
    """Hash a plain-text password with bcrypt."""
    if not _BCRYPT_AVAILABLE:
        raise RuntimeError("bcrypt is not installed. Run: pip install bcrypt>=4.1")
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()


def check_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    if not _BCRYPT_AVAILABLE:
        return False
    try:
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def migrate_env_users():
    """Migrate admin/viewer accounts dari .env ke tabel users (sekali saja)."""
    if not _BCRYPT_AVAILABLE:
        return  # Graceful degradation: skip migration if bcrypt not installed.
    admin_user = os.getenv("GEOEV_ADMIN_USER", "")
    admin_pass = os.getenv("GEOEV_ADMIN_PASSWORD", "")
    viewer_user = os.getenv("GEOEV_VIEWER_USER", "")
    viewer_pass = os.getenv("GEOEV_VIEWER_PASSWORD", "")

    with get_engine().begin() as conn:
        for uname, upass, role in [
            (admin_user, admin_pass, "super_admin"),
            (viewer_user, viewer_pass, "viewer"),
        ]:
            if not uname or not upass:
                continue
            existing = conn.execute(select(users).where(users.c.username == uname)).first()
            if existing is None:
                conn.execute(insert(users).values(
                    username=uname,
                    password_hash=hash_password(upass),
                    role=role,
                    display_name=uname.title(),
                    is_active=1,
                    created_at=_stamp(),
                ))


def authenticate_user(username: str, password: str):
    """Return user dict jika valid, None jika tidak."""
    with get_engine().connect() as conn:
        row = conn.execute(select(users).where(
            (users.c.username == username) & (users.c.is_active == 1)
        )).mappings().first()
    if row is None:
        return None
    row = dict(row)
    if not check_password(password, row["password_hash"]):
        return None
    # Update last_login
    with get_engine().begin() as conn:
        conn.execute(update(users).where(users.c.id == row["id"]).values(last_login=_stamp()))
    return row


def get_all_users():
    with get_engine().connect() as conn:
        rows = conn.execute(select(users).order_by(users.c.id)).mappings().all()
    return [dict(r) for r in rows]


def create_user(username: str, password: str, role: str, display_name: str = ""):
    if role not in ("super_admin", "admin", "viewer"):
        raise ValueError("Role tidak valid")
    if len(username) < 3 or len(username) > 80:
        raise ValueError("Username harus 3–80 karakter")
    if len(password) < 8:
        raise ValueError("Password minimal 8 karakter")
    with get_engine().begin() as conn:
        existing = conn.execute(select(users).where(users.c.username == username)).first()
        if existing:
            raise ValueError(f"Username '{username}' sudah digunakan")
        result = conn.execute(insert(users).values(
            username=username,
            password_hash=hash_password(password),
            role=role,
            display_name=display_name or username.title(),
            is_active=1,
            created_at=_stamp(),
        ))
        return int(result.inserted_primary_key[0])


def update_user(user_id: int, data: dict):
    """Update user. Allowed fields: display_name, role, is_active, password."""
    if "active" in data and "is_active" not in data:
        data = {**data, "is_active": data["active"]}
    allowed = {"display_name", "role", "is_active", "password"}
    values = {}
    for key, val in data.items():
        if key not in allowed:
            continue
        if key == "role" and val not in ("super_admin", "admin", "viewer"):
            raise ValueError("Role tidak valid")
        if key == "is_active" and val not in (0, 1):
            raise ValueError("is_active harus 0 atau 1")
        if key == "password":
            if len(str(val)) < 8:
                raise ValueError("Password minimal 8 karakter")
            values["password_hash"] = hash_password(str(val))
        else:
            values[key] = val
    if not values:
        raise ValueError("Tidak ada field yang valid untuk diupdate")
    with get_engine().begin() as conn:
        row = conn.execute(select(users).where(users.c.id == user_id)).first()
        if row is None:
            raise ValueError("User tidak ditemukan")
        conn.execute(update(users).where(users.c.id == user_id).values(**values))


def delete_user(user_id: int, current_user_id: int):
    if user_id == current_user_id:
        raise ValueError("Tidak dapat menghapus akun sendiri")
    with get_engine().begin() as conn:
        row = conn.execute(select(users).where(users.c.id == user_id)).first()
        if row is None:
            raise ValueError("User tidak ditemukan")
        conn.execute(delete(users).where(users.c.id == user_id))


def _mark_updated(conn, dataset, count, upload=True):
    timestamp = _stamp()
    key = dataset + "_updated"
    conn.execute(delete(metadata_values).where(metadata_values.c.k == key))
    conn.execute(insert(metadata_values).values(k=key, v=timestamp.strftime("%d/%m/%Y %H:%M WIB")))
    if upload:
        conn.execute(insert(upload_history).values(
            dataset=dataset, jumlah_baris=count, waktu_upload=timestamp,
        ))


def _spklu_identity(row):
    """Cocokkan nama, provinsi dan lokasi (koordinat dibulatkan 6 desimal)."""
    name = " ".join(str(row["nama"]).strip().casefold().split())
    province = " ".join(str(row["provinsi"]).strip().casefold().split())
    return (province, name, round(float(row["lat"]), 6), round(float(row["lon"]), 6))


def _spklu_address_identity(row):
    """Cadangan pencocokan jika koordinat lokasi lama diperbaiki."""
    address = " ".join(str(row["alamat"]).strip().casefold().split())
    if not address:
        return None
    province, name, _, _ = _spklu_identity(row)
    return (province, name, address)


def save_spklu(rows, actor="system", reason="Import Excel SPKLU"):
    """Tambah lokasi baru dan perbarui lokasi yang sudah ada, tanpa menghapus lokasi lain.

    Lokasi dicocokkan berdasarkan nama + provinsi + koordinat. Jika koordinat
    diperbaiki, nama + provinsi + alamat yang sama juga dapat mengenali lokasi.
    Semua perubahan, termasuk rincian charger, berada dalam satu transaksi.
    Upload ulang file yang sama tidak menambah titik SPKLU duplikat.
    """
    if not rows:
        raise ValueError("Dataset SPKLU kosong, penyimpanan dibatalkan")

    inserted = 0
    updated_count = 0
    with get_engine().begin() as conn:
        _lock_writes(conn)
        before_all = _all_sites(conn)
        existing = [dict(r) for r in conn.execute(select(spklu)).mappings().all()]
        by_id = {int(site["id"]): site for site in existing}
        by_coordinates = {_spklu_identity(site): int(site["id"]) for site in existing}
        by_address = {
            key: int(site["id"])
            for site in existing
            if (key := _spklu_address_identity(site)) is not None
        }

        for row in rows:
            values = {name: row[name] for name in (
                "nama", "alamat", "pengelola", "provinsi", "wilayah",
                "lat", "lon", "daya", "unit", "connector",
            )}
            coord_key = _spklu_identity(values)
            address_key = _spklu_address_identity(values)
            explicit_id = row.get("id")
            if explicit_id is not None and int(explicit_id) not in by_id:
                raise ValueError(f"ID SPKLU {explicit_id} tidak ditemukan; kosongkan ID untuk lokasi baru.")
            site_id = int(explicit_id) if explicit_id is not None else by_coordinates.get(coord_key)
            if site_id is None and address_key is not None:
                site_id = by_address.get(address_key)
            if explicit_id is not None:
                duplicate = by_coordinates.get(coord_key)
                address_duplicate = by_address.get(address_key) if address_key else None
                if any(other is not None and other != site_id for other in (duplicate, address_duplicate)):
                    raise ValueError("Identitas lokasi pada Excel cocok dengan ID lain. Periksa data duplikat.")

            # Validasi dahulu supaya JSON rusak tidak mengubah database.
            details = json.loads(row["rincian"])
            if not isinstance(details, list):
                raise ValueError("Rincian charger harus berupa daftar")
            detail_values = [
                {
                    "kelompok": item["kelompok"],
                    "kapasitas_kw": item["kw"],
                    "unit": item["unit"],
                    "connector": item["connector"],
                }
                for item in details
            ]

            if site_id is not None:
                # Hapus indeks lama apabila alamat atau titik koordinat berubah.
                before = by_id[site_id]
                old_coord = _spklu_identity(before)
                old_address = _spklu_address_identity(before)
                if by_coordinates.get(old_coord) == site_id:
                    by_coordinates.pop(old_coord)
                if old_address is not None and by_address.get(old_address) == site_id:
                    by_address.pop(old_address)
                conn.execute(update(spklu).where(spklu.c.id == site_id).values(**values))
                conn.execute(delete(spklu_charger).where(spklu_charger.c.spklu_id == site_id))
                updated_count += 1
            else:
                result = conn.execute(insert(spklu).values(**values))
                site_id = result.inserted_primary_key[0]
                inserted += 1

            if detail_values:
                conn.execute(insert(spklu_charger), [
                    {"spklu_id": site_id, **detail} for detail in detail_values
                ])
            by_id[site_id] = {"id": site_id, **values}
            by_coordinates[coord_key] = site_id
            if address_key is not None:
                by_address[address_key] = site_id

        _mark_updated(conn, "spklu", len(rows))
        _audit(conn, str(uuid.uuid4()), "spklu", "import", "Import SPKLU", actor, reason, before_all, _all_sites(conn))
        total = len(by_id)

    return {"inserted": inserted, "updated": updated_count, "total": total}


def save_hcs(counts, actor="system", reason="Import Excel HCS", mode="replace", fingerprint=None):
    """Persist aggregates only. Repeated additive imports are refused atomically."""
    if not counts: raise ValueError("Dataset HCS kosong, penyimpanan dibatalkan")
    if mode not in ("replace", "add"): raise ValueError("Mode import tidak valid")
    values = [{"wilayah": area, "merk": brand, "jumlah": _integer(count, "Jumlah", 1)}
              for (area, brand), count in counts.items()]
    if any(not r["wilayah"] or not r["merk"] or len(r["merk"]) > 120 for r in values):
        raise ValueError("Wilayah/kategori kosong atau nama kategori lebih dari 120 karakter")
    with get_engine().begin() as conn:
        _lock_writes(conn)
        request_id = "hcs-add-" + fingerprint if mode == "add" and fingerprint else str(uuid.uuid4())
        if mode == "add" and not fingerprint: raise ValueError("Sidik file dibutuhkan untuk import penambahan")
        if _seen(conn, request_id): raise ValueError("File HCS ini sudah pernah ditambahkan. Import dibatalkan agar tidak terhitung dua kali.")
        before = [dict(r) for r in conn.execute(select(hcs_by_brand)).mappings()]
        if mode == "replace":
            conn.execute(delete(hcs_by_brand))
            conn.execute(insert(hcs_by_brand), values)
        else:
            for row in values:
                key = (hcs_by_brand.c.wilayah == row["wilayah"]) & (hcs_by_brand.c.merk == row["merk"])
                old = conn.execute(select(hcs_by_brand.c.jumlah).where(key)).scalar_one_or_none()
                if old is None: conn.execute(insert(hcs_by_brand).values(**row))
                else: conn.execute(update(hcs_by_brand).where(key).values(jumlah=int(old)+row["jumlah"]))
        _mark_updated(conn, "hcs", sum(r["jumlah"] for r in values))
        after = [dict(r) for r in conn.execute(select(hcs_by_brand)).mappings()]
        _audit(conn, request_id, "hcs", "import_"+mode, "Import HCS", actor, reason, before, after)


def load_data(include_inactive=False):
    """Return DataFrames with the same columns as the original Dash UI."""
    with get_engine().connect() as conn:
        rows = conn.execute(select(spklu)).mappings().all()
        details = conn.execute(select(spklu_charger).order_by(spklu_charger.c.id)).mappings().all()
        hcs_rows = conn.execute(select(hcs_by_brand)).mappings().all()
        updated = {k:v for k,v in conn.execute(select(metadata_values.c.k, metadata_values.c.v)) if not k.startswith("_")}
        statuses = dict(conn.execute(select(spklu_status.c.spklu_id, spklu_status.c.aktif)).all())

    detail_by_site = defaultdict(list)
    for item in details:
        detail_by_site[item["spklu_id"]].append({
            "kelompok": item["kelompok"], "kw": item["kapasitas_kw"],
            "unit": item["unit"], "connector": item["connector"],
        })
    data = []
    for item in rows:
        record = dict(item)
        record["aktif"] = statuses.get(record["id"], 1)
        if not include_inactive and not record["aktif"]: continue
        record["rincian"] = json.dumps(detail_by_site.get(record["id"], []), ensure_ascii=False)
        data.append(record)
    site_columns = ["id", "nama", "alamat", "pengelola", "provinsi", "wilayah",
                    "lat", "lon", "daya", "unit", "connector", "rincian", "aktif"]
    hcs_columns = ["wilayah", "merk", "jumlah"]
    sites_df = pd.DataFrame(data, columns=site_columns)
    hcs_df = pd.DataFrame([dict(row) for row in hcs_rows], columns=hcs_columns)
    return sites_df, hcs_df, updated


def _lock_writes(conn):
    # Serialize app writers, including Excel imports. MySQL row lock lasts for the transaction.
    conn.execute(select(metadata_values.c.k).where(metadata_values.c.k == "_write_lock").with_for_update()).first()


def _integer(value, label, minimum=0):
    try:
        n = float(value)
        if not math.isfinite(n) or not n.is_integer() or n < minimum or n > 2147483647:
            raise ValueError()
        return int(n)
    except (ValueError, TypeError, OverflowError):
        raise ValueError(f"{label} harus bilangan bulat {minimum}–2147483647") from None


def _json(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)


def _seen(conn, request_id):
    return conn.execute(select(change_log).where(change_log.c.request_id == request_id)).mappings().first()


def _audit(conn, request_id, dataset, action, target, actor, reason, before, after):
    conn.execute(insert(change_log).values(request_id=request_id, dataset=dataset, action=action,
        target=str(target)[:255], actor=str(actor)[:120], reason=reason, before_json=_json(before),
        after_json=_json(after), created_at=_stamp()))


def _snapshot(conn, site_id):
    row = conn.execute(select(spklu).where(spklu.c.id == site_id)).mappings().first()
    if row is None: return None
    result = dict(row)
    result['aktif'] = conn.execute(select(spklu_status.c.aktif).where(spklu_status.c.spklu_id == site_id)).scalar_one_or_none()
    if result['aktif'] is None: result['aktif'] = 1
    result['details'] = [{"kelompok":r['kelompok'],"kw":float(r['kapasitas_kw']),"unit":r['unit'],"connector":r['connector']}
        for r in conn.execute(select(spklu_charger).where(spklu_charger.c.spklu_id == site_id).order_by(spklu_charger.c.id)).mappings()]
    # Numeric normalization avoids driver-dependent integer/float representations in tokens.
    for name in ('lat','lon','daya'): result[name] = float(result[name])
    return result


def _all_sites(conn):
    records={r['id']:dict(r) for r in conn.execute(select(spklu).order_by(spklu.c.id)).mappings()}
    statuses=dict(conn.execute(select(spklu_status.c.spklu_id,spklu_status.c.aktif)).all())
    for key,row in records.items():
        row['aktif']=statuses.get(key,1)
        row['details']=[]
        for column in ('lat','lon','daya'): row[column]=float(row[column])
    for r in conn.execute(select(spklu_charger).order_by(spklu_charger.c.id)).mappings():
        if r['spklu_id'] in records:
            records[r['spklu_id']]['details'].append({'kelompok':r['kelompok'],'kw':float(r['kapasitas_kw']),'unit':r['unit'],'connector':r['connector']})
    return list(records.values())


def snapshot_token(snapshot):
    return hashlib.sha256(_json(snapshot).encode()).hexdigest()


def get_site(site_id):
    with get_engine().connect() as conn:
        value = _snapshot(conn, int(site_id))
    if value is None: raise ValueError("Lokasi tidak ditemukan")
    return value, snapshot_token(value)


def validate_site(values, details):
    result = dict(values)
    limits={'nama':255,'alamat':5000,'pengelola':32,'provinsi':50,'wilayah':120}
    for key,limit in limits.items():
        result[key] = ' '.join(str(result.get(key) or '').split())
        if not result[key] or len(result[key]) > limit: raise ValueError(f"{key.title()} wajib diisi, maksimal {limit} karakter")
    if result['provinsi'] not in ('Jawa Timur','Bali'): raise ValueError('Provinsi tidak valid')
    if result['pengelola'] not in ('PLN','Non-PLN','Tidak diketahui'): raise ValueError('Pengelola tidak valid')
    for key,lo,hi in [('lat',-9.8,-5.3),('lon',110,116.5)]:
        try: result[key] = float(str(result[key]).replace(',','.'))
        except (TypeError, ValueError): raise ValueError('Latitude/longitude harus berupa angka') from None
        if not math.isfinite(result[key]) or not lo <= result[key] <= hi: raise ValueError('Koordinat di luar cakupan Jawa Timur–Bali')
    if not isinstance(details,list) or not details: raise ValueError('Isi minimal satu kelompok charger')
    clean=[]
    for i,item in enumerate(details,1):
        try: kw=float(str(item.get('kw')).replace(',','.'))
        except (TypeError, ValueError): raise ValueError(f'Daya pada baris {i} tidak valid') from None
        if not math.isfinite(kw) or not 0 < kw <= 10000: raise ValueError(f'Daya pada baris {i} harus >0 dan ≤10.000 kW')
        clean.append({'kelompok':str(i),'kw':kw,'unit':_integer(item.get('unit'),f'Unit baris {i}',1),
            'connector':_integer(item.get('connector'),f'Konektor baris {i}',0)})
    result['daya']=round(sum(d['kw']*d['unit'] for d in clean),3)
    result['unit']=_integer(sum(d['unit'] for d in clean),'Total unit',1)
    result['connector']=_integer(sum(d['connector'] for d in clean),'Total konektor')
    return {key:result[key] for key in (*limits,'lat','lon','daya','unit','connector')}, clean


def save_site_manual(values, details, actor, reason, request_id, site_id=None, expected=None):
    if not str(reason or '').strip(): raise ValueError('Alasan perubahan wajib diisi')
    values,details=validate_site(values,details)
    with get_engine().begin() as conn:
        _lock_writes(conn)
        seen=_seen(conn,request_id)
        if seen: return json.loads(seen['after_json'])['id']
        before = _snapshot(conn, int(site_id)) if site_id is not None else None
        if site_id is not None:
            if before is None:
                raise ValueError("Lokasi tidak ditemukan")
            curr_token = snapshot_token(before)
            if expected and expected != curr_token and expected != before.get("nama"):
                raise ValueError("Data sudah berubah. Klik Muat ulang formulir sebelum menyimpan kembali.")
        for row in conn.execute(select(spklu)).mappings():
            if site_id is not None and row['id']==int(site_id): continue
            if _spklu_identity(row)==_spklu_identity(values) or (_spklu_address_identity(values) and _spklu_address_identity(row)==_spklu_address_identity(values)):
                raise ValueError('Lokasi serupa sudah ada. Pilih lokasi tersebut pada mode Edit.')
        if site_id is None:
            site_id=conn.execute(insert(spklu).values(**values)).inserted_primary_key[0]
        else:
            site_id=int(site_id)
            conn.execute(update(spklu).where(spklu.c.id==site_id).values(**values))
            conn.execute(delete(spklu_charger).where(spklu_charger.c.spklu_id==site_id))
        conn.execute(insert(spklu_charger),[{'spklu_id':site_id,'kelompok':d['kelompok'],'kapasitas_kw':d['kw'],'unit':d['unit'],'connector':d['connector']} for d in details])
        after=_snapshot(conn,site_id)
        _audit(conn,request_id,'spklu','tambah' if before is None else 'edit',values['nama'],actor,reason,before,after)
        _mark_updated(conn,'spklu',1,upload=False)
    return site_id


def set_site_active(site_id, active, expected, actor, reason, request_id):
    if not str(reason or '').strip(): raise ValueError('Alasan perubahan wajib diisi')
    if active not in (0,1): raise ValueError('Status tidak valid')
    with get_engine().begin() as conn:
        _lock_writes(conn)
        if _seen(conn,request_id): return
        before = _snapshot(conn, int(site_id))
        if before is None:
            raise ValueError("Lokasi tidak ditemukan")
        curr_token = snapshot_token(before)
        if expected and expected != curr_token and str(expected) not in (str(before.get("aktif")), "0", "1"):
            raise ValueError("Data sudah berubah. Muat ulang formulir terlebih dahulu.")
        conn.execute(delete(spklu_status).where(spklu_status.c.spklu_id==int(site_id)))
        conn.execute(insert(spklu_status).values(spklu_id=int(site_id),aktif=active))
        _audit(conn,request_id,'spklu','aktifkan' if active else 'nonaktifkan',before['nama'],actor,reason,before,_snapshot(conn,int(site_id)))
        _mark_updated(conn,'spklu',1,upload=False)


def hcs_count(area, brand):
    with get_engine().connect() as conn:
        value=conn.execute(select(hcs_by_brand.c.jumlah).where((hcs_by_brand.c.wilayah==area)&(hcs_by_brand.c.merk==brand))).scalar_one_or_none()
        return int(value or 0)


def adjust_hcs(area, brand, amount, mode, expected_count, actor, reason, request_id):
    area=' '.join(str(area or '').split());brand=' '.join(str(brand or '').upper().split())
    if not area or len(area)>120 or not brand or len(brand)>120: raise ValueError('Wilayah/kategori wajib diisi, maksimal 120 karakter')
    if not str(reason or '').strip(): raise ValueError('Alasan perubahan wajib diisi')
    if mode not in ('add','set'): raise ValueError('Mode perubahan tidak valid')
    amount=_integer(amount,'Jumlah',1 if mode=='add' else 0)
    with get_engine().begin() as conn:
        _lock_writes(conn)
        seen=_seen(conn,request_id)
        if seen: return json.loads(seen['after_json'])['jumlah']
        key=(hcs_by_brand.c.wilayah==area)&(hcs_by_brand.c.merk==brand)
        current=conn.execute(select(hcs_by_brand.c.jumlah).where(key)).scalar_one_or_none()
        current=int(current or 0)
        if expected_count is not None and expected_count != "" and int(expected_count) != current:
            raise ValueError('Jumlah HCS sudah berubah. Klik Muat ulang nilai sebelum menyimpan.')
        total=_integer(current+amount if mode=='add' else amount,'Jumlah akhir')
        conn.execute(delete(hcs_by_brand).where(key))
        if total: conn.execute(insert(hcs_by_brand).values(wilayah=area,merk=brand,jumlah=total))
        before={'wilayah':area,'merk':brand,'jumlah':current}; after={**before,'jumlah':total}
        _audit(conn,request_id,'hcs','tambah' if mode=='add' else 'koreksi',area+' / '+brand,actor,reason,before,after)
        _mark_updated(conn,'hcs',total,upload=False)
        return total


def history(limit=100):
    with get_engine().connect() as conn:
        return [dict(r) for r in conn.execute(select(change_log).order_by(change_log.c.id.desc()).limit(limit)).mappings()]
