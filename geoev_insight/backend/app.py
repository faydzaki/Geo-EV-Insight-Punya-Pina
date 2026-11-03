"""GeoEV Insight – dashboard SPKLU Jawa Timur–Bali & HCS Jawa Timur.

Jalankan: pip install -r requirements.txt; python app.py
Upload dua file Excel melalui menu Manajemen Data.
HCS disimpan hanya sebagai agregat kabupaten/kota dan merek kendaraan.
"""
from __future__ import annotations

import base64
import hashlib
import admin_ui
from collections import Counter
from io import BytesIO
import json
import os
from flask import request, Response
from database import init_db, load_data, save_spklu, save_hcs
import re
import secrets
import math
import logging
import unicodedata

import dash
from dash import Dash, Input, Output, State, ALL, dcc, html, dash_table, no_update
import dash_bootstrap_components as dbc
import dash_leaflet as dl
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from storytelling import (compare_areas, comparison_quality, headline_spklu,
                         headline_hcs, headline_ratio, insight_hcs_vs_spklu, candidates)

# Secrets are read from environment (or local .env via database.py).
ADMIN_USER = os.getenv("GEOEV_ADMIN_USER", "")
ADMIN_PASSWORD = os.getenv("GEOEV_ADMIN_PASSWORD", "")
VIEWER_USER = os.getenv("GEOEV_VIEWER_USER", "")
VIEWER_PASSWORD = os.getenv("GEOEV_VIEWER_PASSWORD", "")
if not all((ADMIN_USER, ADMIN_PASSWORD, VIEWER_USER, VIEWER_PASSWORD)):
    raise RuntimeError("Atur GEOEV_ADMIN_USER/PASSWORD dan GEOEV_VIEWER_USER/PASSWORD di file .env")
if ADMIN_USER == VIEWER_USER or ADMIN_PASSWORD == VIEWER_PASSWORD:
    raise RuntimeError("Akun admin dan viewer harus berbeda (username serta password).")
if any("GANTI_PASSWORD" in p for p in (ADMIN_PASSWORD, VIEWER_PASSWORD)):
    raise RuntimeError("Ganti password contoh di .env sebelum menjalankan website.")

COLORS = {"PLN": "#006199", "Non-PLN": "#E9AD2F", "Tidak diketahui": "#98A7B9"}
BLUE = "#087f83"
JATIM = "Jawa Timur"
BALI = "Bali"

# Titik representatif kota/kabupaten (bukan lokasi rumah pelanggan).
# Koordinat perkiraan pusat wilayah untuk visualisasi agregat; bukan batas administratif.
AREA_CENTERS = {
    "Kabupaten Bangkalan": (-7.05, 112.74), "Kabupaten Banyuwangi": (-8.22, 114.37),
    "Kabupaten Blitar": (-8.10, 112.20), "Kabupaten Bojonegoro": (-7.15, 111.88),
    "Kabupaten Bondowoso": (-7.91, 113.82), "Kabupaten Gresik": (-7.16, 112.65),
    "Kabupaten Jember": (-8.17, 113.70), "Kabupaten Jombang": (-7.54, 112.23),
    "Kabupaten Kediri": (-7.82, 112.05), "Kabupaten Lamongan": (-7.12, 112.41),
    "Kabupaten Lumajang": (-8.13, 113.22), "Kabupaten Madiun": (-7.63, 111.53),
    "Kabupaten Magetan": (-7.64, 111.34), "Kabupaten Malang": (-8.15, 112.60),
    "Kabupaten Mojokerto": (-7.54, 112.46), "Kabupaten Nganjuk": (-7.61, 111.90),
    "Kabupaten Ngawi": (-7.40, 111.44), "Kabupaten Pacitan": (-8.20, 111.10),
    "Kabupaten Pamekasan": (-7.16, 113.48), "Kabupaten Pasuruan": (-7.73, 112.82),
    "Kabupaten Ponorogo": (-7.87, 111.46), "Kabupaten Probolinggo": (-7.86, 113.29),
    "Kabupaten Sampang": (-7.19, 113.24), "Kabupaten Sidoarjo": (-7.45, 112.70),
    "Kabupaten Situbondo": (-7.75, 114.01), "Kabupaten Sumenep": (-7.02, 113.86),
    "Kabupaten Trenggalek": (-8.05, 111.71), "Kabupaten Tuban": (-6.90, 111.99),
    "Kabupaten Tulungagung": (-8.10, 111.92),
    "Kota Batu": (-7.87, 112.53), "Kota Blitar": (-8.10, 112.17),
    "Kota Kediri": (-7.82, 112.01), "Kota Madiun": (-7.63, 111.52),
    "Kota Malang": (-7.98, 112.63), "Kota Mojokerto": (-7.47, 112.44),
    "Kota Pasuruan": (-7.65, 112.91), "Kota Probolinggo": (-7.75, 113.22),
    "Kota Surabaya": (-7.26, 112.75),
}
# Nama yang ada sebagai Kota dan Kabupaten tidak ditafsirkan sembarangan.
AMBIGUOUS = {"blitar", "kediri", "madiun", "malang", "mojokerto", "pasuruan", "probolinggo"}


def clean_text(value):
    if value is None or pd.isna(value):
        return ""
    return " ".join(str(value).strip().split())


def norm(value):
    text = unicodedata.normalize("NFKC", clean_text(value)).casefold()
    return re.sub(r"\s+", " ", text)


def safe_num(value):
    """Ubah angka biasa / angka berkoma desimal dan akhiran kW menjadi float."""
    if value is None or pd.isna(value):
        return 0.0
    if isinstance(value, (int, float)):
        return max(0.0, float(value))
    value = norm(value).replace("kw", "").replace("kva", "").replace(" ", "")
    if not value or value in ("-", "nan"):
        return 0.0
    if not re.fullmatch(r"\d[\d.,]*", value):
        raise ValueError(f"Nilai numerik tidak dikenal: {value}")
    if "," in value and "." in value:
        value = value.replace(".", "").replace(",", ".") if value.rfind(",") > value.rfind(".") else value.replace(",", "")
    elif "," in value:
        value = value.replace(",", ".")
    return max(0.0, float(value))


def coord(value):
    if value is None or pd.isna(value):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = clean_text(value).replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return None


def normalize_province(value):
    v = norm(value)
    if any(term in v for term in ("jawa timur", "jatim", "east java")):
        return JATIM
    if "bali" in v:
        return BALI
    return clean_text(value) or "Tidak diketahui"


def normalize_owner(value):
    v = re.sub(r"[^a-z0-9]", "", norm(value))
    if v.startswith("nonpln") or v in {"swasta", "non"}:
        return "Non-PLN"
    if v in {"pln", "milikpln"}:
        return "PLN"
    return "Tidak diketahui"


def normalize_area(value):
    """Tentukan kab/kota eksplisit, hindari menebak Malang vs Kab. Malang."""
    s = norm(value)
    s = re.sub(r"\bkab(?:upaten)?\.?(?=\s|$)", "kabupaten", s)
    s = re.sub(r"\b(kota|city)\b", "kota", s)
    s = re.sub(r"\s+", " ", s)
    keys = sorted({k.split(" ", 1)[1].casefold() for k in AREA_CENTERS}, key=len, reverse=True)
    for k in keys:
        city = f"Kota {k.title()}"
        reg = f"Kabupaten {k.title()}"
        c_match = re.search(r"\bkota\s+" + re.escape(k) + r"\b", s)
        r_match = re.search(r"\bkabupaten\s+" + re.escape(k) + r"\b", s)
        if c_match and city in AREA_CENTERS:
            return city
        if r_match and reg in AREA_CENTERS:
            return reg
    # Kalau hanya nama wilayah dan tidak ambigu, boleh dipetakan.
    for k in keys:
        if re.search(r"\b" + re.escape(k) + r"\b", s) and k not in AMBIGUOUS:
            c, r = f"Kota {k.title()}", f"Kabupaten {k.title()}"
            return c if c in AREA_CENTERS else r
    return "Tidak diketahui"


def detect_cols(df, required):
    mapping = {norm(c): c for c in df.columns}
    absent = [c for c in required if norm(c) not in mapping]
    if absent:
        raise ValueError("Kolom wajib tidak ditemukan: " + ", ".join(absent))
    return mapping


def read_excel_upload(contents, filename):
    if not filename or not filename.lower().endswith(".xlsx"):
        raise ValueError("File harus berformat .xlsx")
    raw = base64.b64decode(contents.split(",", 1)[1])
    if len(raw) > 20 * 1024 * 1024:
        raise ValueError("Ukuran file maksimal 20 MB")
    sheets = pd.read_excel(BytesIO(raw), sheet_name=None, dtype=object)
    if not sheets:
        raise ValueError("File Excel tidak memiliki sheet")
    return sheets


def choose_sheet(sheets, required):
    for name, df in sheets.items():
        if all(norm(col) in {norm(c) for c in df.columns} for col in required):
            return name, df.copy()
    raise ValueError("Kolom wajib tidak ditemukan dalam sheet Excel: " + ", ".join(required))


def parse_spklu(sheets):
    _, df = choose_sheet(sheets, ["Nama", "Alamat", "PLN atau NON PLN", "Provinsi", "Latitude", "Longitude"])
    mapping = detect_cols(df, ["Nama", "Alamat", "PLN atau NON PLN", "Provinsi", "Latitude", "Longitude"])
    # Kelompok berdasarkan sufiks persis (_, -, *, `) alih-alih urutan kolom.
    groups = {}
    for col in df.columns:
        compact = re.sub(r"\s+", "", norm(col))
        for kind, prefix in (("capacity", "kapasitascharger"), ("units", "jumlahcharger"), ("connectors", "jumlahconnector")):
            if compact.startswith(prefix):
                suffix = compact[len(prefix):] or "default"
                groups.setdefault(suffix, {})[kind] = col
    groups = {k: v for k, v in groups.items() if all(x in v for x in ("capacity", "units", "connectors"))}
    if not groups:
        raise ValueError("Kolom daya, jumlah charger, dan konektor tidak lengkap")
    sites, missing_area, malformed, bad_coords = [], 0, 0, 0
    for rownum, (_, row) in enumerate(df.iterrows(), start=2):
        name = clean_text(row[mapping["nama"]])
        if not name:
            continue
        lat = coord(row[mapping["latitude"]]); lon = coord(row[mapping["longitude"]])
        if lat is None or lon is None or not (-9.8 <= lat <= -5.3 and 110 <= lon <= 116.5):
            bad_coords += 1
            continue
        address = clean_text(row[mapping["alamat"]])
        province = normalize_province(row[mapping["provinsi"]])
        if province not in (JATIM, BALI):
            malformed += 1
            continue
        area_col = mapping.get("kota/kabupaten")
        area = normalize_area(row[area_col]) if province == JATIM and area_col else "Tidak diketahui"
        if area == "Tidak diketahui" and province == JATIM:
            area = normalize_area(address)
        if area == "Tidak diketahui" and province == JATIM:
            missing_area += 1
        details = []
        for suffix, cols in groups.items():
            try:
                power = safe_num(row[cols["capacity"]])
                units = safe_num(row[cols["units"]])
                plugs = safe_num(row[cols["connectors"]])
            except (ValueError, TypeError):
                malformed += 1
                continue
            if power <= 0 or units <= 0:
                if power > 0 or units > 0 or plugs > 0:
                    malformed += 1
                continue
            if not float(units).is_integer() or not float(plugs).is_integer():
                malformed += 1
                continue
            details.append({"kelompok": suffix, "kw": power, "unit": int(units), "connector": int(plugs)})
        sites.append({
            "nama": name, "alamat": address, "pengelola": normalize_owner(row[mapping["pln atau non pln"]]),
            "provinsi": province, "wilayah": area, "lat": lat, "lon": lon,
            "rincian": json.dumps(details, ensure_ascii=False),
            "daya": round(sum(x["kw"] * x["unit"] for x in details), 3),
            "unit": sum(x["unit"] for x in details),
            "connector": sum(x["connector"] for x in details),
        })
        if "id" in mapping and clean_text(row[mapping["id"]]):
            raw_id = safe_num(row[mapping["id"]])
            if raw_id <= 0 or not raw_id.is_integer():
                raise ValueError(f"ID SPKLU pada baris {rownum} harus bilangan bulat positif")
            sites[-1]["id"] = int(raw_id)
    sites = list({(s["nama"].casefold(), round(s["lat"], 6), round(s["lon"], 6)): s for s in sites}.values())
    if not sites:
        raise ValueError("Tidak ada lokasi SPKLU dengan nama, provinsi, dan koordinat yang sesuai")
    return sites, f"{len(sites):,} titik SPKLU diproses dari Excel. Koordinat tidak sesuai: {bad_coords}; kabupaten/kota belum dikenali: {missing_area}; data charger perlu diperiksa: {malformed}."


def parse_hcs(sheets):
    """Agregasi setiap baris HCS valid; UID yang sama TIDAK menghapus baris.

    UID dipakai untuk informasi kualitas data saja, bukan kunci deduplikasi.
    Yang disimpan ke MySQL tetap hanya jumlah per (kabupaten/kota, merek).
    """
    required = ["NAMA PELANGGAN", "MERK KENDARAAN", "ALAMAT", "UID", "Latitude", "Longitude", "KOTA/KABUPATEN"]
    _, df = choose_sheet(sheets, required)
    mapping = detect_cols(df, required)
    counted, by_area = Counter(), Counter()
    seen_uids = set()
    missing_uid, repeated_uid, missing_area, valid_rows = 0, 0, 0, 0

    for _, row in df.iterrows():
        # UID sama (atau kosong) tidak menyebabkan baris HCS dihapus.
        uid = clean_text(row[mapping["uid"]])
        if not uid:
            missing_uid += 1
        elif uid in seen_uids:
            repeated_uid += 1
        else:
            seen_uids.add(uid)

        area = normalize_area(row[mapping["kota/kabupaten"]])
        if area == "Tidak diketahui":
            missing_area += 1
            continue
        brand = clean_text(row[mapping["merk kendaraan"]]).upper() or "TIDAK DIKETAHUI"
        counted[(area, brand)] += 1
        by_area[area] += 1
        valid_rows += 1

    if not counted:
        raise ValueError("Tidak ada baris HCS dengan kabupaten/kota yang dikenali")

    return counted, by_area, (
        f"{valid_rows:,} baris catatan HCS tersimpan, termasuk UID berulang. "
        f"UID berulang: {repeated_uid}; UID kosong: {missing_uid}; "
        f"kabupaten/kota tidak dikenali: {missing_area}. "
        "Data pribadi pelanggan tidak disimpan."
    )


def fmt_number(n, digits=0):
    if pd.isna(n):
        return "—"
    return f"{n:,.{digits}f}".replace(",", "_").replace(".", ",").replace("_", ".")


def empty_fig(message="Data belum tersedia. Unggah file Excel melalui Manajemen Data"):
    fig = go.Figure()
    fig.add_annotation(text=message, x=0.5, y=0.5, xref="paper", yref="paper", showarrow=False,
                       font=dict(color="#718197", size=13))
    fig.update_xaxes(visible=False); fig.update_yaxes(visible=False)
    return polish(fig)


def polish(fig, height=340):
    fig.update_layout(template="plotly_white", height=height,
        margin=dict(l=25, r=25, t=35, b=25),
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Inter, Segoe UI, Arial, sans-serif", color="#334155", size=13),
        legend=dict(orientation="h", y=-0.17))
    return fig


def graph(fig, id_=None):
    graph_props = {"id": id_} if id_ is not None else {}
    return dcc.Graph(figure=fig, config={"displaylogo": False,
        "toImageButtonOptions": {"format": "png", "scale": 2}}, **graph_props)


def card_heading(title, sub=None, id_=None):
    heading_props = {"id": id_} if id_ is not None else {}
    return html.Div([
        html.H3(title, **heading_props),
        html.P(sub, className="muted") if sub else None
    ], className="card-heading")


def kpi(title, val, subtitle="", icon=""):
    return html.Div([
        html.Div([html.Span(icon, className="kpi-icon"), html.Span(title, className="kpi-label")], className="kpi-top"),
        html.Div(val, className="kpi-value"), html.Div(subtitle, className="muted kpi-note"),
    ], className="kpi-card")


def charger_details(value):
    """Return renderable charger entries; tolerate damaged data edited outside uploads."""
    try:
        values = json.loads(value) if isinstance(value, str) else value
        if not isinstance(values, list): return []
        result = []
        for item in values:
            if not isinstance(item, dict): continue
            kw, units, plugs = float(item["kw"]), int(item["unit"]), int(item["connector"])
            if not math.isfinite(kw) or min(kw, units, plugs) < 0: continue
            result.append({"kw":kw, "unit":units, "connector":plugs, "kelompok":item.get("kelompok", "")})
        return result
    except (ValueError, TypeError, KeyError, OverflowError):
        return []


def valid_map_sites(sites):
    """Reject malformed coordinates before serializing them to Leaflet."""
    if sites.empty: return sites.copy()
    result = sites.copy()
    result["lat"] = pd.to_numeric(result["lat"], errors="coerce")
    result["lon"] = pd.to_numeric(result["lon"], errors="coerce")
    return result[result.lat.between(-90,90) & result.lon.between(-180,180)].copy()


def popup_spklu(row):
    details = charger_details(row["rincian"])
    lines = [html.Tr([html.Td(f"{fmt_number(d['kw'], 1)} kW"),
                      html.Td(f"{d['unit']} unit"), html.Td(f"{d['connector']} konektor")]) for d in details]
    return html.Div([
        html.Div([html.B(row["nama"]), html.Span(row["pengelola"], className="pop-tag")], className="pop-title"),
        html.P(row["alamat"] or "Alamat SPKLU belum tersedia", className="muted"),
        html.P(f"{row['provinsi']} • {row['wilayah']}", className="muted"),
        html.Div([html.Strong(f"{fmt_number(row['daya'],1)} kW"),
                  html.Span(f"{row['unit']} unit • {row['connector']} konektor")], className="pop-kpi"),
        html.Table([html.Thead(html.Tr([html.Th("Daya charger"), html.Th("Unit charger"), html.Th("Konektor")])),
                    html.Tbody(lines or [html.Tr(html.Td("Rincian charger belum tersedia", colSpan=3))])], className="pop-table"),
        html.Small("Daya terpasang bukan keterangan ketersediaan charger saat ini.", className="muted")
    ], className="popup-content")


def popup_hcs(area, counts):
    total = sum(v for _, v in counts)
    return html.Div([
        html.B(area), html.P(f"{fmt_number(total)} catatan HCS", className="pop-kpi"),
        html.B("Kategori kendaraan catatan HCS"),
        html.Ul([html.Li(f"{brand}: {fmt_number(cnt)}") for brand, cnt in counts[:5]]),
        html.Small("Titik menunjukkan kabupaten/kota, bukan alamat rumah pelanggan.", className="muted")
    ], className="popup-content")


def build_map(sites, hcs, layer):
    children = []
    if layer in ("spklu", "both"):
        for _, row in sites.iterrows():
            children.append(dl.CircleMarker(id={"type":"site-marker", "index":int(row["id"])}, n_clicks=0, center=[float(row["lat"]), float(row["lon"])],
                radius=7, color="#ffffff", weight=2,
                fillColor=COLORS.get(row["pengelola"], COLORS["Tidak diketahui"]), fillOpacity=0.9,
                children=[dl.Tooltip(row["nama"]), dl.Popup(popup_spklu(row), maxWidth=370)]))
    if layer in ("hcs", "both") and not hcs.empty:
        grouped = hcs.groupby("wilayah", as_index=False)["jumlah"].sum()
        for _, row in grouped.iterrows():
            area = row["wilayah"]
            if area not in AREA_CENTERS:
                continue
            counts = (hcs[hcs.wilayah == area].sort_values("jumlah", ascending=False)
                      [["merk", "jumlah"]].values.tolist())
            children.append(dl.CircleMarker(center=list(AREA_CENTERS[area]), radius=min(30, 7 + math.sqrt(float(row["jumlah"])) * 0.45),
                color="#fff", weight=3, fillColor="#6B4EC6", fillOpacity=.85,
                children=[dl.Tooltip(f"{area}: {fmt_number(row['jumlah'])} catatan HCS"),
                          dl.Popup(popup_hcs(area, counts), maxWidth=320)]))
    return children


def section(id_, children):
    return html.Section(children, id=id_, className="page-section",
                        style={"display": "block" if id_ == "view-peta" else "none"})


init_db()
app = Dash(
    __name__,
    external_stylesheets=[dbc.themes.BOOTSTRAP,
                          "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"],
    suppress_callback_exceptions=True,
    title="GeoEV Insight | SPKLU dan HCS Jawa Timur–Bali",
)
server = app.server


@server.before_request
def require_basic_auth():
    """Lindungi semua halaman dan callback; deploy di balik HTTPS + akses terbatas."""
    auth = request.authorization
    good = False
    if auth and auth.username is not None and auth.password is not None:
        good = ((secrets.compare_digest(auth.username, ADMIN_USER) and
                 secrets.compare_digest(auth.password, ADMIN_PASSWORD)) or
                (secrets.compare_digest(auth.username, VIEWER_USER) and
                 secrets.compare_digest(auth.password, VIEWER_PASSWORD)))
    if not good:
        return Response("Halaman ini hanya dapat diakses oleh pegawai yang memiliki izin.", status=401,
                        headers={"WWW-Authenticate": 'Basic realm="GeoEV Insight Internal"'})


def current_user_is_admin():
    auth = request.authorization
    return bool(auth and secrets.compare_digest(auth.username or "", ADMIN_USER) and
                secrets.compare_digest(auth.password or "", ADMIN_PASSWORD))


def note(text):
    return html.P(text, className="muted small-note")


def story_badge(num, title, text):
    return html.Div([html.Div(num, className="story-num"), html.Div([
        html.Strong(title), html.Small(text)])], className="story-step")


def insight_block(label, text, id_=None):
    heading_props = {"id": id_} if id_ is not None else {}
    return html.Div([
        html.Div(label, className="insight-eyebrow"),
        html.H3(text, className="insight-title", **heading_props)
    ], className="insight-block")


def privacy_note():
    return html.Div([
        html.Strong("Perlindungan data catatan HCS"),
        html.P("Peta menampilkan jumlah catatan HCS per kabupaten/kota tanpa nama, UID, alamat, atau koordinat rumah.",
               className="muted small-note"),
    ], className="privacy-note")


def area_dropdown(id_):
    return dcc.Dropdown(id=id_, options=[{"label":"Semua kabupaten/kota", "value":"Semua"}],
                        value="Semua", clearable=False)


app.layout = html.Div([
    dcc.Store(id="data-version", data=0),
    dcc.Store(id="upload-kind"),
    dcc.ConfirmDialog(id="upload-confirm"),
    # Pembaruan backend tidak otomatis mengirim event ke browser lain.
    # Interval ini memaksa browser membaca ulang data dari MySQL, termasuk
    # jika data diubah lewat phpMyAdmin atau oleh Admin pada sesi lain.
    dcc.Interval(id="db-auto-refresh", interval=60_000, n_intervals=0),
    html.Aside([
        html.Div([html.Div("ϟ", className="logo-mark"), html.Div([
            html.H2("GeoEV Insight"), html.Small("SPKLU dan Home Charging")])], className="brand"),
        html.Div("RUANG ANALISIS", className="nav-caption"),
        dcc.RadioItems(id="nav", options=[
            {"label":"Peta & infrastruktur", "value":"peta"},
            {"label":"Distribusi HCS", "value":"hcs"},
            {"label":"Perbandingan wilayah", "value":"rasio"},
            {"label":"Kajian wilayah", "value":"rekomendasi"},
            {"label":"Kualitas data", "value":"quality"},
            {"label":"Manajemen Data", "value":"admin"},
        ], value="peta", className="side-menu", labelClassName="nav-choice"),
        html.Div([html.Div(""), html.Strong("SPKLU Jawa Timur dan Bali"),
                  html.P("Data HCS dan perbandingan wilayah hanya mencakup Jawa Timur.", className="sidebar-footnote")], className="sidebar-bottom"),
    ], className="sidebar"),
    html.Main([
        html.Div([
            html.Div([html.Div("GEOEV / WORKSPACE", className="eyebrow"), html.H1("Peta & analisis infrastruktur EV"),
                      html.P("Data SPKLU Jawa Timur dan Bali serta catatan HCS Jawa Timur.", className="muted")]),
            html.Div([
                html.Button("Muat ulang data", id="db-refresh-now", n_clicks=0,
                            className="db-refresh-btn", title="Baca data terbaru dari MySQL"),
                html.Div(id="updated", className="updated"),
            ], className="db-refresh-controls"),
        ], className="page-top"),
        html.Div([html.Div([html.Label("Wilayah analisis HCS, perbandingan & kajian"), area_dropdown("story-area")]),
                  html.P("Analisis memakai seluruh SPKLU Jawa Timur. Filter peta berlaku terpisah.", className="muted")],
                 id="analysis-controls", className="analysis-controls"),
        section("view-peta", [
            html.Div([html.Span("01", className="eyebrow"),
                      html.H2("Jaringan pengisian Jawa Timur & Bali"),
                      note("Peta menampilkan lokasi SPKLU dan jumlah catatan HCS per kabupaten/kota di Jawa Timur.")], className="chapter-header"),
            html.Div([html.Label("Cari SPKLU", htmlFor="site-search", className="sr-label"), dcc.Input(id="site-search", type="search", placeholder="Cari nama SPKLU atau alamat…", debounce=True, className="search-input"),
                      html.Button("Reset filter", id="reset-map", n_clicks=0, className="secondary-btn")], className="search-row"),
            html.Div([
                html.Div([html.Label("Provinsi"), dcc.Dropdown(id="filter-prov", options=["Semua", JATIM, BALI], value="Semua", clearable=False)]),
                html.Div([html.Label("Pengelola"), dcc.Dropdown(id="filter-owner", options=["Semua", "PLN", "Non-PLN", "Tidak diketahui"], value="Semua", clearable=False)]),
                html.Div([html.Label("Kabupaten/kota Jawa Timur"), area_dropdown("filter-area")]),
                html.Div([html.Label("Lokasi dengan charger"), dcc.Dropdown(id="filter-power", options=[
                    {"label":"Semua kelompok", "value":"all"},
                    {"label":"≤ 22 kW", "value":"low"},
                    {"label":"> 22–50 kW", "value":"medium"},
                    {"label":"> 50–100 kW", "value":"fast"},
                    {"label":"> 100 kW", "value":"ultra"}], value="all", clearable=False)]),
            ], className="filters"),
            html.Div(id="filter-summary", className="filter-summary", role="status"),
            html.Div(id="kpis", className="kpi-grid"),
            html.Div([insight_block("", "Sebaran SPKLU Jawa Timur dan Bali", "spklu-headline"),
                      html.Div([html.Div([
                          html.B("Lokasi SPKLU dan catatan HCS"),
                          dcc.RadioItems(id="map-layer", options=[{"label":"SPKLU", "value":"spklu"},
                              {"label":"Catatan HCS per kabupaten/kota", "value":"hcs"},
                              {"label":"SPKLU dan HCS", "value":"both"}], value="spklu", inline=True, className="layer-toggle")
                      ], className="map-title"),
                      html.Div([html.Div("Menyiapkan peta…", id="map-tiles-status", role="status", className="map-status"),
                                html.Button("Perbaiki ukuran peta", id="map-resize", n_clicks=0, className="secondary-btn")], className="map-tools"),
                      html.Div("Memuat titik dari database…", id="map-data-status", role="status", className="map-data-status"),
                      html.Div([
                          html.Div([dl.Map([dl.TileLayer(id="map-tiles", url="https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                              maxZoom=19, eventHandlers={"loading":{"variable":"geoEvMap.tileLoading"},
                                  "tileerror":{"variable":"geoEvMap.tileError"}, "load":{"variable":"geoEvMap.tileComplete"}}), dl.ScaleControl(position="bottomleft"),
                              dl.LayerGroup(id="geo-layers")], id="main-map", center=[-7.85,113.3], zoom=7,
                              trackResize=True, boundsOptions={"padding":[24,24], "maxZoom":14},
                              style={"height":"600px", "minHeight":"420px", "width":"100%"}),
                              html.Div(id="map-empty", className="map-empty")], className="map-canvas"),
                          html.Aside([html.Div("DETAIL LOKASI", className="eyebrow"),
                              dcc.Dropdown(id="selected-site", options=[], placeholder="Pilih atau klik titik SPKLU", clearable=True),
                              html.Div(id="site-detail"), html.Hr(), html.Div(id="map-context")], className="map-detail")
                      ], className="map-workspace"),
                      html.Div([html.Span("●", style={"color": COLORS["PLN"]}), " PLN   ",
                                html.Span("●", style={"color": COLORS["Non-PLN"]}), " Non-PLN   ",
                                html.Span("●", style={"color": "#6B4EC6"}), " Catatan HCS"], className="map-legend"),
                      note("Klik titik untuk detail lokasi. Lingkaran ungu menunjukkan jumlah catatan HCS; ukurannya dibatasi agar peta terbaca. Peta memerlukan internet."),
                      ], className="content-card")], className="content-card story-feature"),
            html.Details([
                html.Summary("Rincian pengelola, provinsi, daya charger, dan data SPKLU"),
                html.Div([
                    html.Div([card_heading("SPKLU menurut pengelola", id_="heading-owner"), graph(empty_fig(), "overview-pie")], className="content-card"),
                    html.Div([card_heading("SPKLU menurut provinsi", id_="heading-province"), graph(empty_fig(), "overview-bar")], className="content-card"),
                    html.Div([card_heading("Jumlah charger menurut daya", "Perhitungan berdasarkan unit charger.", id_="heading-capacity"), graph(empty_fig(), "capacity-chart")], className="content-card"),
                    html.Div([card_heading("SPKLU dengan daya terbesar", id_="heading-top"), graph(empty_fig(), "top-chart")], className="content-card"),
                ], className="two-grid"),
                html.Div([card_heading("Data lokasi dan daya SPKLU"), dash_table.DataTable(
                    id="site-table", columns=[{"name": n, "id": k} for n,k in [
                        ("Nama", "nama"), ("Kabupaten/kota", "wilayah"), ("Provinsi", "provinsi"),
                        ("Pengelola", "pengelola"), ("Unit charger", "unit"),
                        ("Konektor", "connector"), ("Daya terpasang (kW)", "daya")]],
                    page_size=12, sort_action="native", filter_action="native",
                    style_table={"overflowX":"auto"},
                    style_header={"backgroundColor":"#eaf3f8", "fontWeight":"600"},
                    style_cell={"padding":"10px", "textAlign":"left", "fontFamily":"Inter, Segoe UI, Arial", "fontSize":13}
                )], className="content-card"),
            ], className="detail-panel"),
        ]),
        section("view-hcs", [
            html.Div([html.Span("02", className="eyebrow"),
                      html.H2("Distribusi catatan Home Charging di Jawa Timur"),
                      note("Setiap baris HCS dengan kabupaten/kota valid dihitung, termasuk UID yang berulang.")], className="chapter-header"),

            html.Div([insight_block("", "Jumlah catatan HCS per kabupaten/kota", "hcs-headline"),
                      graph(empty_fig(), "hcs-city-chart")], className="content-card story-feature"),
            html.Div([insight_block("", "Perbandingan catatan HCS dan SPKLU", "hcs-vs-spklu"),
                      note("Jumlah catatan HCS tidak menunjukkan kebutuhan penggunaan SPKLU publik.")], className="content-card"),
            html.Details([html.Summary("Data merek kendaraan catatan HCS"),
                          html.Div([card_heading("Kategori kendaraan catatan HCS", id_="heading-brand"), graph(empty_fig(), "hcs-brand-chart")], className="content-card")], className="detail-panel"),
            privacy_note(),
        ]),
        section("view-rasio", [
            html.Div([html.Span("03", className="eyebrow"),
                      html.H2("Perbandingan catatan HCS dan SPKLU per kabupaten/kota"),
                      note("Rasio dihitung dari jumlah baris HCS dibagi titik SPKLU pada kabupaten/kota yang sama di Jawa Timur.")], className="chapter-header"),
            html.Div([insight_block("", "Rasio catatan HCS per SPKLU di Jawa Timur", "ratio-headline"),
                      graph(empty_fig(), "ratio-chart"),
                      note("Rasio tidak dihitung jika SPKLU belum terpetakan; rasio tinggi belum membuktikan kebutuhan SPKLU baru.")
                      ], className="content-card story-feature"),
            html.Div(id="ratio-audit", className="audit-panel"),
            html.Div([card_heading("Jumlah catatan HCS dan SPKLU per kabupaten/kota", "Rasio tidak dihitung pada wilayah tanpa SPKLU terpetakan."),
                      dash_table.DataTable(id="comparison-table", columns=[
                          {"name":"Kabupaten/kota", "id":"Wilayah"}, {"name":"Catatan HCS", "id":"HCS"},
                          {"name":"Titik SPKLU", "id":"SPKLU"}, {"name":"Rasio HCS/SPKLU", "id":"Rasio"},
                          {"name":"Status data", "id":"Status"}], page_size=12, sort_action="native",
                          style_table={"overflowX":"auto"},
                          style_header={"backgroundColor":"#eaf3f8", "fontWeight":"600"},
                          style_cell={"padding":"10px", "textAlign":"left", "fontFamily":"Inter, Segoe UI, Arial", "fontSize":13})], className="content-card"),
        ]),
        section("view-rekomendasi", [
            html.Div([html.Span("04", className="eyebrow"),
                      html.H2("Wilayah yang perlu dikaji untuk SPKLU baru"),
                      note("Urutan wilayah berdasarkan rasio catatan HCS per titik SPKLU, bukan keputusan pembangunan.")], className="chapter-header"),
            html.Div(id="recommendations"),
            html.Div([card_heading("Sumber dan batasan data"),
                      html.Div(id="source-notes"),
                      html.H4("Pemeriksaan sebelum penambahan SPKLU", className="subsection-title"),
                      html.P("Periksa penggunaan SPKLU, akses lokasi, kondisi jaringan listrik, dan kebutuhan pengisian publik sebelum menentukan pembangunan.", className="muted")
                      ], className="content-card"),
        ]),
        section("view-quality", [
            html.Div([html.Span("DATA HEALTH", className="eyebrow"), html.H2("Kenali batas data sebelum mengambil keputusan"),
                      note("Pemeriksaan seluruh inventaris, tidak dipengaruhi filter peta.")], className="chapter-header"),
            html.Div(id="quality-kpis", className="quality-grid"),
            html.Div([card_heading("Lokasi yang perlu diperiksa", "Perbaiki sumber Excel, lalu unggah ulang untuk memperbarui lokasi."),
                dash_table.DataTable(id="quality-table", columns=[{"name":n,"id":k} for n,k in
                    [("SPKLU","nama"),("Provinsi","provinsi"),("Alamat","alamat"),("Temuan","masalah")]],
                    page_size=10, sort_action="native", filter_action="native",
                    style_table={"overflowX":"auto"}, style_cell={"textAlign":"left","whiteSpace":"normal","padding":"12px","maxWidth":"340px"})], className="content-card"),
            html.Div([card_heading("Cara membaca data HCS"),
                html.P("Satu catatan adalah satu baris HCS dengan wilayah valid. UID berulang dan kosong tetap dihitung; angka ini bukan pelanggan unik."),
                html.P("Kategori kendaraan mengikuti label sumber, sehingga merek, model, dan label pemasang dapat tercampur. Tidak ada penggabungan otomatis."),
                html.P("Wilayah tanpa data HCS bukan berarti tidak memiliki pelanggan HCS.")], className="content-card")
        ]),
        section("view-admin", [admin_ui.layout(html.Div([card_heading("Unggah data Excel"),
                      html.P("File diperiksa sebelum disimpan ke MySQL.", className="muted"),
                      html.Div([
                          html.Div([html.H4("Data SPKLU Jawa Timur dan Bali"),
                                    note("Kolom ID opsional: isi ID lokasi untuk edit, kosongkan untuk lokasi baru. Status nonaktif tetap dipertahankan."),
                                    dcc.Upload(id="upload-spklu", accept=".xlsx", children=html.Div([html.B("Pilih atau tarik file SPKLU (.xlsx)"),
                                                                                       html.P("Maksimal 20 MB")]), className="upload-box", multiple=False),
                                    html.Div(id="spklu-upload-result")], className="upload-panel"),
                          html.Div([html.H4("Data catatan HCS Jawa Timur"),
                                    note("Data disimpan sebagai jumlah catatan HCS per kabupaten/kota dan merek kendaraan."),
                                    dcc.Upload(id="upload-hcs", accept=".xlsx", children=html.Div([html.B("Pilih atau tarik file HCS (.xlsx)"),
                                                                                     html.P("Maksimal 20 MB")]), className="upload-box", multiple=False),
                                    html.Div(id="hcs-upload-result")], className="upload-panel"),
                      ], className="two-grid"),
                      note("Penggunaan hosting untuk data PLN ES memerlukan persetujuan perusahaan dan pengamanan akses.")], className="content-card"), AREA_CENTERS)]),
        html.Footer([html.Strong("GeoEV Insight"),
                     " · Sumber: data internal PLN ES · HCS hanya Jawa Timur · "
                     "Belum tersedia data penggunaan SPKLU saat ini · ",
                     html.Span(id="footer-update")], className="footer"),
    ], className="main-panel"),
], className="app-shell")


PAGES = ("peta", "hcs", "rasio", "rekomendasi", "quality", "admin")


@app.callback([Output(f"view-{n}", "style") for n in PAGES], Input("nav", "value"))
def show_page(nav):
    if nav == "admin" and not current_user_is_admin():
        nav = "peta"
    return [{"display": "block" if name == nav else "none"} for name in PAGES]


@app.callback(Output("filter-area", "options"), Output("filter-area", "value"),
              Output("story-area", "options"), Output("story-area", "value"),
              Input("data-version", "data"), Input("filter-prov", "value"),
              Input("db-refresh-now", "n_clicks"),
              Input("db-auto-refresh", "n_intervals"),
              State("filter-area", "value"), State("story-area", "value"))
def update_area_options(version, province, refresh_clicks, refresh_intervals,
                        selected_map, selected_story):
    sites, hcs, _ = load_data()
    vals = set(hcs["wilayah"].tolist()) if not hcs.empty else set()
    if not sites.empty:
        vals |= set(sites.loc[sites.provinsi == JATIM, "wilayah"].tolist())
    vals.discard("Tidak diketahui")
    options = [{"label":"Semua kabupaten/kota", "value":"Semua"}] + [
        {"label":v, "value":v} for v in sorted(vals)]
    map_options = ([{"label":"Semua kabupaten/kota", "value":"Semua"}]
                   if province == BALI else options)
    return (map_options, selected_map if selected_map in [o["value"] for o in map_options] else "Semua",
            options, selected_story if selected_story in vals else "Semua")


def filtered_sites(sites, prov, owner, area, power, search=""):
    if sites.empty:
        return sites
    result = sites.copy()
    if prov != "Semua":
        result = result[result.provinsi == prov]
    if owner != "Semua":
        result = result[result.pengelola == owner]
    if area != "Semua":
        result = result[result.wilayah == area]
    if search and search.strip():
        query = norm(search)
        result = result[result.apply(lambda r: query in norm(str(r["nama"]) + " " + str(r["alamat"])), axis=1)]
    if power != "all":
        def has_power(data):
            for d in charger_details(data):
                kw = float(d["kw"])
                if ((power == "low" and kw <= 22) or
                    (power == "medium" and 22 < kw <= 50) or
                    (power == "fast" and 50 < kw <= 100) or
                    (power == "ultra" and kw > 100)):
                    return True
            return False
        result = result[result.rincian.map(has_power)]
    return result


def no_data_label(metadata, key):
    return metadata.get(key, "belum tersedia")


def dashboard_error(error):
    logging.getLogger(__name__).error("Dashboard refresh failed", exc_info=error)
    message = html.Div("Data belum berhasil dimuat ulang. Tampilan sebelumnya dipertahankan; coba Muat ulang data.", className="upload-error")
    return (message,) + (no_update,) * 26


@app.callback(
    Output("updated", "children"), Output("footer-update", "children"),
    Output("kpis", "children"),
    Output("spklu-headline", "children"),
    Output("overview-pie", "figure"), Output("overview-bar", "figure"),
    Output("capacity-chart", "figure"), Output("top-chart", "figure"),
    Output("site-table", "data"),
    Output("hcs-headline", "children"), Output("hcs-city-chart", "figure"),
    Output("hcs-vs-spklu", "children"), Output("hcs-brand-chart", "figure"),
    Output("ratio-headline", "children"), Output("ratio-chart", "figure"),
    Output("ratio-audit", "children"), Output("comparison-table", "data"),
    Output("recommendations", "children"), Output("source-notes", "children"),
    Output("heading-owner", "children"), Output("heading-province", "children"),
    Output("heading-capacity", "children"), Output("heading-top", "children"),
    Output("heading-brand", "children"),
    Output("filter-summary", "children"),
    Output("quality-kpis", "children"), Output("quality-table", "data"),
    Input("data-version", "data"), Input("filter-prov", "value"),
    Input("filter-owner", "value"), Input("filter-area", "value"),
    Input("filter-power", "value"), Input("map-layer", "value"),
    Input("story-area", "value"),
    Input("site-search", "value"),
    Input("db-refresh-now", "n_clicks"),
    Input("db-auto-refresh", "n_intervals"),
    on_error=dashboard_error,
)
def update_dashboard(version, prov, owner, map_area, power, layer, story_area, search,
                     refresh_clicks, refresh_intervals):
    sites, hcs, metadata = load_data()
    chosen = filtered_sites(sites, prov, owner, map_area, power, search)
    # Filter peta hanya memengaruhi bagian peta/infrastruktur, BUKAN cerita rasio.
    map_hcs = hcs if prov != BALI else hcs.iloc[0:0]
    if map_area != "Semua" and not map_hcs.empty:
        map_hcs = map_hcs[map_hcs.wilayah == map_area]

    cards = [
        kpi("Titik SPKLU", fmt_number(len(chosen)) if not sites.empty else "—", "Lokasi terpilih", ""),
        kpi("Unit charger", fmt_number(chosen.unit.sum() if not chosen.empty else 0) if not sites.empty else "—", "Lokasi terpilih", ""),
        kpi("Konektor", fmt_number(chosen.connector.sum() if not chosen.empty else 0) if not sites.empty else "—", "Lokasi terpilih", ""),
        kpi("Total daya", f"{fmt_number(chosen.daya.sum() if not chosen.empty else 0, 1)} kW" if not sites.empty else "—", "Seluruh charger di lokasi terpilih", ""),
    ]
    # Status ini berasal dari SELECT ke MySQL saat callback dijalankan,
    # bukan dari angka yang disimpan di browser atau cache statis.
    updated = html.Div([
        html.Div("Inventaris · " + fmt_number(len(sites)) + " SPKLU · " +
                 fmt_number(int(hcs["jumlah"].sum()) if not hcs.empty else 0) + " catatan HCS"),
        html.Div("Pembaruan SPKLU: " + no_data_label(metadata, "spklu_updated")),
        html.Div("Pembaruan HCS: " + no_data_label(metadata, "hcs_updated")),
    ])
    footer_update = ("Pembaruan SPKLU: " + no_data_label(metadata, "spklu_updated") +
                     " · HCS: " + no_data_label(metadata, "hcs_updated"))
    map_headline = headline_spklu(chosen)

    if chosen.empty:
        owner_heading = "Data SPKLU menurut pengelola belum tersedia"
        province_heading = "Data SPKLU per provinsi belum tersedia"
        capacity_heading = "Data unit charger menurut daya belum tersedia"
        top_heading = "Data daya SPKLU belum tersedia"
        pie = empty_fig("Tidak ada SPKLU yang sesuai dengan filter")
        prov_fig = empty_fig("Tidak ada SPKLU yang sesuai dengan filter")
        cap_fig = empty_fig("Data unit charger belum tersedia")
        top_fig = empty_fig("Data daya SPKLU belum tersedia")
    else:
        by_owner = chosen.groupby("pengelola").size().reset_index(name="Titik")
        owner_first = by_owner.sort_values("Titik", ascending=False).iloc[0]
        owner_heading = f"{owner_first['pengelola']}: {fmt_number(int(owner_first['Titik']))} dari {fmt_number(len(chosen))} SPKLU terpilih"
        pie = polish(px.pie(by_owner, values="Titik", names="pengelola", hole=.63,
                            color="pengelola", color_discrete_map=COLORS,
                            labels={"pengelola":"Pengelola", "Titik":"Jumlah SPKLU"}))
        by_prov = chosen.groupby("provinsi").size().reset_index(name="Titik")
        province_heading = "; ".join(f"{r.provinsi}: {fmt_number(int(r.Titik))} SPKLU" for r in by_prov.itertuples())
        prov_fig = polish(px.bar(by_prov, x="provinsi", y="Titik", text="Titik",
                                 color="provinsi", color_discrete_sequence=[BLUE, "#E9AD2F"],
                                 labels={"provinsi":"Provinsi", "Titik":"Jumlah SPKLU"}))
        prov_fig.update_layout(showlegend=False)
        prov_fig.update_traces(textposition="outside")
        bins = {"≤ 22 kW": 0, "> 22–50 kW": 0, "> 50–100 kW": 0, "> 100 kW": 0}
        for detail in chosen.rincian:
            for d in charger_details(detail):
                kw = float(d["kw"])
                group = "≤ 22 kW" if kw <= 22 else "> 22–50 kW" if kw <= 50 else "> 50–100 kW" if kw <= 100 else "> 100 kW"
                bins[group] += int(d["unit"])
        capacity_lead = max(bins, key=bins.get)
        capacity_heading = f"Sebanyak {fmt_number(bins[capacity_lead])} unit charger berada pada kelompok daya {capacity_lead}" if sum(bins.values()) else "Data unit charger menurut daya belum tersedia"
        cap_fig = polish(px.bar(x=list(bins), y=list(bins.values()), text=list(bins.values()),
                                labels={"x": "Daya charger", "y": "Unit charger"},
                                color_discrete_sequence=[BLUE]))
        cap_fig.update_traces(textposition="outside")
        top = chosen.nlargest(10, "daya").sort_values("daya")
        biggest = top.iloc[-1]
        top_heading = f"{biggest['nama']}: daya terpasang {fmt_number(biggest['daya'], 1)} kW"
        top_fig = polish(px.bar(top, x="daya", y="nama", orientation="h", text="daya",
                                labels={"daya": "Daya terpasang (kW)", "nama": "SPKLU"},
                                color_discrete_sequence=[BLUE]), 440)
        top_fig.update_traces(texttemplate="%{x:.1f}", textposition="outside")
    site_rows = (chosen[["nama", "wilayah", "provinsi", "pengelola", "unit", "connector", "daya"]]
                 .round({"daya":1}).to_dict("records")) if not chosen.empty else []

    # Babak 2: ringkasan catatan HCS per kab/kota, tidak memakai filter peta.
    selected_hcs = hcs
    if story_area != "Semua" and not hcs.empty:
        selected_hcs = hcs[hcs.wilayah == story_area]
    hcs_headline = headline_hcs(selected_hcs) if story_area == "Semua" else (
        f"{story_area}: {fmt_number(selected_hcs.jumlah.sum())} catatan HCS tercatat")
    if selected_hcs.empty:
        brand_heading = "Data merek kendaraan catatan HCS belum tersedia"
        city_fig = empty_fig("Data catatan HCS belum tersedia untuk pilihan ini")
        brand_fig = empty_fig("Data merek kendaraan belum tersedia")
    else:
        by_city = selected_hcs.groupby("wilayah", as_index=False)["jumlah"].sum().sort_values(["jumlah", "wilayah"])
        city_fig = polish(px.bar(by_city, x="jumlah", y="wilayah", orientation="h", text="jumlah",
                                 labels={"jumlah":"Catatan HCS", "wilayah":"Kabupaten/kota"},
                                 color_discrete_sequence=[BLUE]), max(350, min(1440, 120 + 30*len(by_city))))
        city_fig.update_traces(textposition="outside")
        brands = selected_hcs.groupby("merk", as_index=False)["jumlah"].sum().sort_values("jumlah", ascending=False)
        if len(brands) > 8:
            extra = int(brands.iloc[8:].jumlah.sum())
            brands = pd.concat([brands.iloc[:8], pd.DataFrame([{"merk":"LAINNYA", "jumlah":extra}])], ignore_index=True)
        best_brand = brands.iloc[0]
        brand_heading = f"{best_brand['merk']}: {fmt_number(int(best_brand['jumlah']))} catatan HCS tercatat"
        brand_fig = polish(px.pie(brands, names="merk", values="jumlah", hole=.55,
                                  labels={"merk":"Kategori kendaraan", "jumlah":"Catatan HCS"}))

    # Babak 3 & 4: selalu dibandingkan terhadap SEMUA SPKLU Jatim (tanpa filter pada peta).
    quality = comparison_quality(sites, hcs)
    comparison = compare_areas(sites, hcs, story_area)
    bridge = insight_hcs_vs_spklu(comparison) if quality["ready"] else (
        "Perbandingan membutuhkan data SPKLU Jawa Timur dan catatan HCS.")
    valid = comparison[(comparison.HCS > 0) & (comparison.SPKLU > 0)].copy()
    headline = headline_ratio(comparison) if quality["ready"] else "Data catatan HCS dan SPKLU belum lengkap"
    if not quality["ready"]:
        ratio_fig = empty_fig("Data SPKLU Jawa Timur dan catatan HCS belum lengkap")
    elif valid.empty:
        ratio_fig = empty_fig("Belum ada kabupaten/kota dengan data HCS dan SPKLU yang sesuai")
    else:
        upper = valid.sort_values(["Rasio", "Wilayah"])
        ratio_fig = polish(px.bar(upper, x="Rasio", y="Wilayah", orientation="h", text="Rasio",
                                  labels={"Rasio":"Catatan HCS per SPKLU", "Wilayah":"Kabupaten/kota"},
                                  color_discrete_sequence=["#6B4EC6"]),
                           max(350, min(1440, 140 + 30*len(upper))))
        ratio_fig.update_traces(texttemplate="%{x:.1f}", textposition="outside")
    audit_items = []
    if quality["spklu_unmapped"]:
        audit_items.append(html.P(
            f"Sebanyak {fmt_number(quality['spklu_unmapped'])} titik SPKLU Jawa Timur belum memiliki kabupaten/kota yang sesuai; periksa alamat sebelum menggunakan hasil rasio.",
            className="insight-warning"))
    if quality["ready"]:
        zero = comparison[(comparison.HCS > 0) & (comparison.SPKLU == 0)]
        if not zero.empty:
            audit_items.append(html.P(
                f"Sebanyak {len(zero)} kabupaten/kota memiliki data catatan HCS tanpa titik SPKLU terpetakan; nilai rasio belum dapat dihitung.",
                className="insight-warning"))
    if not audit_items:
        audit_items.append(note("Rasio hanya dihitung untuk kabupaten/kota yang memiliki data catatan HCS dan titik SPKLU."))
    table_rows = []
    if quality["ready"]:
        for _, r in comparison.iterrows():
            table_rows.append({"Wilayah":r.Wilayah, "HCS":int(r.HCS), "SPKLU":int(r.SPKLU),
                               "Rasio":round(float(r.Rasio), 2) if pd.notna(r.Rasio) else None,
                               "Status":r.Status})

    # Rekomendasi bukan klaim pembangunan; hanya shortlist untuk verifikasi.
    if not quality["ready"]:
        recommendations = html.Div([insight_block("", "Data SPKLU dan HCS belum lengkap"),
                                    note("Unggah data SPKLU Jawa Timur dan catatan HCS untuk membuat daftar wilayah.")], className="content-card")
    else:
        leading, unmapped = candidates(comparison)
        blocks = []
        if not leading.empty:
            blocks.append(html.Div([
                insight_block("",
                              "Kabupaten/kota berdasarkan rasio catatan HCS per SPKLU"),
                html.Div([
                    html.Div([html.Div(f"{idx}. {r.Wilayah}", className="candidate-name"),
                              html.Div(f"{fmt_number(r.HCS)} catatan HCS · {fmt_number(r.SPKLU)} SPKLU", className="muted"),
                              html.Strong(f"Rasio {fmt_number(r.Rasio, 1)}", className="candidate-score"),
                              html.Div("Perlu kajian lanjutan sebelum penambahan SPKLU.", className="candidate-caution")],
                             className="candidate-card")
                    for idx, (_, r) in enumerate(leading.iterrows(), start=1)
                ], className="candidate-grid"),
            ], className="content-card"))
        else:
            blocks.append(html.Div([insight_block("",
                                                   "Data perbandingan belum tersedia"),
                                    note("Periksa penulisan kabupaten/kota pada kedua file.")], className="content-card"))
        if not unmapped.empty:
            rows = [html.Li(f"{r.Wilayah}: {fmt_number(r.HCS)} catatan HCS, "
                            "0 titik SPKLU terpetakan") for _, r in unmapped.iterrows()]
            blocks.append(html.Div([html.H3("Kabupaten/kota dengan data SPKLU yang perlu diperiksa"),
                                    html.Ul(rows),
                                    note("Rasio tidak dihitung karena belum ada titik SPKLU yang berhasil dipetakan pada wilayah tersebut.")],
                                   className="content-card"))
        if quality["spklu_unmapped"]:
            blocks.append(html.P("Sebagian titik SPKLU belum dikenali kabupaten/kotanya; periksa alamat sebelum memakai hasil perbandingan.", className="insight-warning"))
        recommendations = html.Div(blocks)

    source_notes = html.Div([
        html.P("Sumber: data SPKLU dan catatan HCS internal PLN ES."),
        html.P("Data HCS dan perbandingan HCS/SPKLU hanya mencakup Jawa Timur."),
        html.P("Setiap baris HCS yang valid dihitung termasuk UID berulang, sehingga jumlahnya belum tentu sama dengan jumlah pelanggan unik."),
        html.P("Data penggunaan SPKLU dan kebutuhan pengisian publik belum tersedia, sementara kabupaten/kota SPKLU masih bergantung pada penulisan alamat."),
        html.P("Rasio digunakan untuk memilih wilayah yang perlu diperiksa, bukan sebagai keputusan pembangunan SPKLU.")
    ], className="source-list")

    active = [v for v in (prov, owner, map_area) if v != "Semua"]
    power_names = {"low":"≤ 22 kW", "medium":"> 22–50 kW", "fast":"> 50–100 kW", "ultra":"> 100 kW"}
    if power != "all":
        active.append("Memiliki charger " + power_names.get(power, power))
    if search:
        active.append("Pencarian: " + search)
    summary = [html.Span(v, className="filter-chip") for v in active] or [html.Span("Seluruh lokasi", className="filter-chip")]
    summary.append(html.Span(f"{len(chosen)} hasil · Unit, konektor, dan daya mencakup seluruh charger di lokasi terpilih.", className="muted"))
    issues = []
    for _, row in sites.iterrows():
        flags = []
        if row["provinsi"] == JATIM and row["wilayah"] == "Tidak diketahui": flags.append("Kabupaten/kota belum dikenali")
        if row["unit"] <= 0: flags.append("Rincian charger kosong")
        if row["pengelola"] == "Tidak diketahui": flags.append("Pengelola belum dikenali")
        if not (-9.8 <= row["lat"] <= -5.3 and 110 <= row["lon"] <= 116.5): flags.append("Koordinat di luar cakupan")
        if flags: issues.append({"nama":row["nama"], "provinsi":row["provinsi"], "alamat":row["alamat"], "masalah":"; ".join(flags)})
    health = [kpi("Lokasi perlu diperiksa", fmt_number(len(issues)), "Dari seluruh inventaris"),
              kpi("Wilayah Jatim belum dikenali", fmt_number(quality["spklu_unmapped"]), "Tidak masuk penyebut rasio wilayah"),
              kpi("Cakupan HCS", fmt_number(hcs.wilayah.nunique()), "Kabupaten/kota dengan catatan HCS")]
    return (updated, footer_update, cards, map_headline, pie, prov_fig, cap_fig,
            top_fig, site_rows, hcs_headline, city_fig, bridge, brand_fig, headline,
            ratio_fig, html.Div(audit_items), table_rows, recommendations, source_notes,
            owner_heading, province_heading, capacity_heading, top_heading, brand_heading,
            summary, health, issues)


@app.callback(Output("upload-confirm", "displayed"), Output("upload-confirm", "message"), Output("upload-kind", "data"),
              Input("upload-spklu", "contents"), Input("upload-hcs", "contents"),
              State("upload-spklu", "filename"), State("upload-hcs", "filename"),
              Input("admin-import-hcs-mode", "value"), prevent_initial_call=True)
def preview_upload(spklu_contents, hcs_contents, spklu_filename, hcs_filename, hcs_mode):
    kind = dash.ctx.triggered_id
    if kind == "admin-import-hcs-mode": kind = "upload-hcs"
    if not current_user_is_admin():
        return True, "Hanya Admin yang dapat mengunggah data.", None
    try:
        if kind == "upload-spklu" and spklu_contents:
            rows, status = parse_spklu(read_excel_upload(spklu_contents, spklu_filename))
            message = status + "\nLokasi baru akan ditambahkan dan lokasi yang cocok akan diperbarui. Lokasi lain tetap disimpan."
        elif kind == "upload-hcs" and hcs_contents:
            counts, _, status = parse_hcs(read_excel_upload(hcs_contents, hcs_filename))
            message = status.replace("tersimpan", "valid") + ("\nCatatan akan DITAMBAHKAN ke agregat sekarang. Pastikan tidak ada catatan tumpang tindih." if hcs_mode == "add" else "\nPERHATIAN: seluruh agregat HCS sebelumnya akan diganti.")
        else:
            return False, "", None
        return True, "PRATINJAU — belum disimpan\n\n" + message + "\n\nLanjutkan menyimpan?", kind
    except Exception as exc:
        return True, "File belum dapat diproses: " + str(exc), None


@app.callback(Output("spklu-upload-result", "children"), Output("hcs-upload-result", "children"),
              Output("data-version", "data"),
              Input("upload-confirm", "submit_n_clicks"), State("upload-kind", "data"),
              State("upload-spklu", "contents"), State("upload-hcs", "contents"),
              State("upload-spklu", "filename"), State("upload-hcs", "filename"),
              State("data-version", "data"), State("admin-import-hcs-mode", "value"), prevent_initial_call=True)
def on_upload(confirm_clicks, trigger, spklu_contents, hcs_contents, spklu_filename, hcs_filename, version, hcs_mode):
    if trigger not in ("upload-spklu", "upload-hcs"):
        return no_update, no_update, no_update
    if not current_user_is_admin():
        msg = html.P("Unggah file hanya tersedia untuk Admin.", className="upload-error")
        return (msg, no_update, no_update) if trigger == "upload-spklu" else (no_update, msg, no_update)
    try:
        if trigger == "upload-spklu":
            if not spklu_contents:
                return no_update, no_update, no_update
            rows, status = parse_spklu(read_excel_upload(spklu_contents, spklu_filename))
            result = save_spklu(rows, actor=request.authorization.username, reason="Import Excel: " + spklu_filename)
            status += (f" Baru: {fmt_number(result['inserted'])}; "
                       f"diperbarui: {fmt_number(result['updated'])}; "
                       f"total SPKLU di MySQL: {fmt_number(result['total'])}.")
        else:
            if not hcs_contents:
                return no_update, no_update, no_update
            counts, _, status = parse_hcs(read_excel_upload(hcs_contents, hcs_filename))
            fingerprint = hashlib.sha256(base64.b64decode(hcs_contents.split(",",1)[1])).hexdigest()
            save_hcs(counts, actor=request.authorization.username, reason="Import Excel: " + hcs_filename, mode=hcs_mode, fingerprint=fingerprint)
        msg = html.P(status, className="upload-success")
        return (msg, no_update, (version or 0)+1) if trigger == "upload-spklu" else (no_update, msg, (version or 0)+1)
    except Exception as exc:
        msg = html.P("File Excel tidak dapat diproses: " + str(exc), className="upload-error")
        return (msg, no_update, no_update) if trigger == "upload-spklu" else (no_update, msg, no_update)


@app.callback(Output("nav", "options"), Output("upload-spklu", "disabled"), Output("upload-hcs", "disabled"), Input("data-version", "data"))
def access_controls(_):
    admin = current_user_is_admin()
    options = [{"label":label,"value":value} for label,value in [
        ("Peta & infrastruktur","peta"),("Distribusi HCS","hcs"),("Perbandingan wilayah","rasio"),
        ("Kajian wilayah","rekomendasi"),("Kualitas data","quality")]]
    if admin: options.append({"label":"Manajemen data","value":"admin"})
    return options, not admin, not admin


@app.callback(Output("analysis-controls", "style"), Input("nav", "value"))
def analysis_visibility(nav):
    return {"display":"flex" if nav in ("hcs","rasio","rekomendasi") else "none"}


@app.callback(Output("filter-prov", "value"), Output("filter-owner", "value"),
              Output("filter-area", "value", allow_duplicate=True), Output("filter-power", "value"),
              Output("site-search", "value"), Input("reset-map", "n_clicks"), prevent_initial_call=True)
def reset_filters(_):
    return "Semua", "Semua", "Semua", "all", ""


@app.callback(Output("selected-site", "value"), Input({"type":"site-marker","index":ALL}, "n_clicks"), prevent_initial_call=True)
def select_marker(clicks):
    if not any(clicks): return no_update
    marker = dash.ctx.triggered_id
    return marker["index"] if isinstance(marker, dict) else no_update


@app.callback(Output("site-detail", "children"), Input("selected-site", "value"), Input("selected-site", "options"))
def detail_panel(site_id, options):
    if site_id is None or site_id not in [o["value"] for o in (options or [])]:
        return html.Div([html.Div("↗", className="detail-symbol"), html.H3("Kenali setiap lokasi"),
                         html.P("Klik titik pada peta atau cari lokasi pada pilihan di atas untuk melihat kapasitas dan rincian charger.")], className="detail-placeholder")
    sites, _, _ = load_data()
    match = sites[sites.id == site_id]
    return popup_spklu(match.iloc[0]) if not match.empty else note("Lokasi tidak lagi tersedia.")


def bounds_for_points(points):
    if not points: return [[-9.0,110.5],[-6.2,116.0]]
    return [[min(p[0] for p in points)-.03,min(p[1] for p in points)-.03],
            [max(p[0] for p in points)+.03,max(p[1] for p in points)+.03]]


@app.callback(Output("geo-layers", "children"), Output("selected-site", "options"),
              Output("map-context", "children"), Output("map-empty", "children"),
              Output("map-data-status", "children"), Output("main-map", "bounds"),
              Input("data-version", "data"), Input("filter-prov", "value"), Input("filter-owner", "value"),
              Input("filter-area", "value"), Input("filter-power", "value"), Input("site-search", "value"),
              Input("map-layer", "value"), Input("db-refresh-now", "n_clicks"), Input("db-auto-refresh", "n_intervals"))
def update_map(version, prov, owner, area, power, search, layer, refresh_clicks, refresh_intervals):
    # Deliberately independent of Plotly analytics: chart errors cannot suppress map points.
    try:
        sites, hcs, _ = load_data()
        selected = filtered_sites(sites, prov, owner, area, power, search)
        chosen = valid_map_sites(selected)
        hcs_selected = hcs if prov != BALI else hcs.iloc[0:0]
        if area != "Semua": hcs_selected = hcs_selected[hcs_selected.wilayah == area]
        map_hcs = hcs_selected[hcs_selected.wilayah.isin(AREA_CENTERS)]
        children = build_map(chosen, map_hcs, layer)
        options = [{"label":str(r["nama"]), "value":int(r["id"])} for _,r in chosen.iterrows()]
        context = [html.H4("HCS pada wilayah peta"),
            html.Strong(fmt_number(hcs_selected.jumlah.sum()) if not hcs_selected.empty else "—", className="context-number"),
            html.P("Catatan HCS, bukan pelanggan unik. Mengikuti provinsi dan wilayah, tanpa filter pengelola, daya, atau pencarian SPKLU.", className="muted"),
            html.Small("Pilih layer HCS untuk melihat jumlah dan kategori kendaraan per wilayah.")]
        empty = "Tidak ada titik untuk pilihan ini. Coba ubah atau reset filter." if not children else ""
        parts = []
        if layer != "hcs": parts.append(f"{len(chosen)} titik SPKLU")
        if layer != "spklu": parts.append(f"{map_hcs.wilayah.nunique()} wilayah HCS")
        status = " · ".join(parts) + " pada peta"
        if len(chosen) < len(selected): status += f" · {len(selected)-len(chosen)} koordinat tidak valid dilewati"
        points = chosen[["lat","lon"]].values.tolist() if layer != "hcs" else []
        if layer != "spklu": points += [list(AREA_CENTERS[a]) for a in map_hcs.wilayah.unique()]
        # Initial/filter loads fit the data; routine polling preserves the user's zoom.
        trigger = dash.ctx.triggered_id
        bounds = no_update if trigger in ("db-auto-refresh", "db-refresh-now", "data-version") else bounds_for_points(points)
        return children, options, context, empty, status, bounds
    except Exception:
        logging.getLogger(__name__).exception("Map data refresh failed")
        return (no_update, no_update, no_update, no_update,
                "Titik belum berhasil dimuat. Periksa koneksi database dan pesan di terminal, lalu klik Muat ulang data.", no_update)


app.clientside_callback(
    """function(style, clicks) {
        if (!style || style.display === 'none') return window.dash_clientside.no_update;
        return new Promise(function(resolve) {
            requestAnimationFrame(function() {
                requestAnimationFrame(function() { resolve(Date.now()); });
            });
        });
    }""",
    Output("main-map", "invalidateSize"), Input("view-peta", "style"), Input("map-resize", "n_clicks")
)


admin_ui.register(app, current_user_is_admin, AREA_CENTERS)

if __name__ == "__main__":
    print("GeoEV Insight: MySQL aktif pada http://127.0.0.1:8050")
    app.run(host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "8050")), debug=False)
