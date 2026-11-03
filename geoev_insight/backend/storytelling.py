"""Logika tujuh poin Data Storytelling GeoEV Insight.

Modul ini tidak memerlukan Dash sehingga perhitungan dapat diuji terpisah.
Semua rasio selalu menggunakan SELURUH lokasi SPKLU Jawa Timur yang terpetakan
ke kabupaten/kota, tanpa membatasi PLN/Non-PLN atau kapasitas charger.
"""
from __future__ import annotations

import pandas as pd

JATIM = "Jawa Timur"
UNKNOWN = "Tidak diketahui"


def id_number(number: int | float, decimals: int = 0) -> str:
    return f"{number:,.{decimals}f}".replace(",", "_").replace(".", ",").replace("_", ".")


def compare_areas(sites: pd.DataFrame, hcs: pd.DataFrame, area: str = "Semua") -> pd.DataFrame:
    """Satu baris per kota/kabupaten; tidak menghitung rasio untuk nol SPKLU.

    Gunakan Baris HCS valid teragregasi dan semua kategori SPKLU Jawa Timur saja.
    Kota dengan SPKLU 0 mendapat rasio None, bukan 0 atau tak hingga.
    """
    sp_counts = pd.Series(dtype="int64")
    hc_counts = pd.Series(dtype="int64")
    if not sites.empty:
        valid = sites[(sites["provinsi"] == JATIM) & (sites["wilayah"] != UNKNOWN)]
        sp_counts = valid.groupby("wilayah").size()
    if not hcs.empty:
        valid_hcs = hcs[hcs["wilayah"] != UNKNOWN]
        hc_counts = valid_hcs.groupby("wilayah")["jumlah"].sum()
    counts = pd.DataFrame({"HCS": hc_counts, "SPKLU": sp_counts}).fillna(0)
    counts.index.name = "Wilayah"
    counts = counts.reset_index()
    if counts.empty:
        return pd.DataFrame(columns=["Wilayah", "HCS", "SPKLU", "Rasio", "Status"])
    counts[["HCS", "SPKLU"]] = counts[["HCS", "SPKLU"]].astype(int)
    if area != "Semua":
        counts = counts[counts["Wilayah"] == area].copy()
    counts["Rasio"] = counts.apply(
        lambda r: float(r["HCS"] / r["SPKLU"]) if r["SPKLU"] > 0 and r["HCS"] > 0 else None,
        axis=1,
    )
    counts["Status"] = counts.apply(
        lambda r: ("Dapat dihitung" if r["HCS"] > 0 and r["SPKLU"] > 0 else
                   "SPKLU belum terpetakan" if r["HCS"] > 0 else
                   "Data HCS belum tersedia"), axis=1,
    )
    return counts.sort_values("Wilayah").reset_index(drop=True)


def comparison_quality(sites: pd.DataFrame, hcs: pd.DataFrame) -> dict:
    """Diagnostik cakupan, hindari klaim '0 SPKLU' ketika lokasi tidak terpetakan."""
    jatim = sites[sites["provinsi"] == JATIM] if not sites.empty else sites
    missing = int((jatim["wilayah"] == UNKNOWN).sum()) if not jatim.empty else 0
    return {
        "spklu_jatim": len(jatim),
        "spklu_unmapped": missing,
        "hcs_total": int(hcs["jumlah"].sum()) if not hcs.empty else 0,
        "ready": not jatim.empty and not hcs.empty,
    }


def headline_spklu(sites: pd.DataFrame) -> str:
    if sites.empty:
        return "Data SPKLU Jawa Timur dan Bali belum tersedia"
    by_prov = sites.groupby("provinsi").size().sort_values(ascending=False)
    lead = by_prov.index[0]
    return f"{lead}: {id_number(int(by_prov.iloc[0]))} titik SPKLU pada filter yang dipilih"


def headline_hcs(hcs: pd.DataFrame) -> str:
    if hcs.empty:
        return "Data catatan HCS Jawa Timur belum tersedia"
    by_area = hcs.groupby("wilayah")["jumlah"].sum().sort_values(ascending=False)
    return f"{by_area.index[0]} mencatat {id_number(int(by_area.iloc[0]))} catatan HCS, terbanyak dalam data"


def headline_ratio(comparison: pd.DataFrame) -> str:
    measured = comparison[(comparison["HCS"] > 0) & (comparison["SPKLU"] > 0)]
    if measured.empty:
        return "Data perbandingan HCS dan SPKLU belum tersedia"
    high = measured.sort_values(["Rasio", "HCS"], ascending=[False, False]).iloc[0]
    return (f"{high['Wilayah']}: {id_number(int(high['HCS']))} catatan HCS dan "
            f"{id_number(int(high['SPKLU']))} SPKLU, rasio {id_number(float(high['Rasio']), 1)}")


def insight_hcs_vs_spklu(comparison: pd.DataFrame) -> str:
    if comparison.empty or not (comparison["HCS"] > 0).any():
        return "Data catatan HCS belum tersedia untuk kabupaten/kota ini."
    top = comparison[comparison["HCS"] > 0].sort_values(["HCS", "Wilayah"], ascending=[False, True]).iloc[0]
    name = top["Wilayah"]
    n_hcs = id_number(int(top["HCS"]))
    n_spklu = int(top["SPKLU"])
    if n_spklu == 0:
        return f"{name}: {n_hcs} catatan HCS, belum ada SPKLU yang terpetakan."
    if n_spklu == 1:
        return f"{name}: {n_hcs} catatan HCS dan 1 SPKLU terpetakan."
    return f"{name}: {n_hcs} catatan HCS dibandingkan dengan {id_number(n_spklu)} SPKLU."


def candidates(comparison: pd.DataFrame, max_items: int = 5) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Kandidat kajian, BUKAN putusan membangun / estimasi kebutuhan publik."""
    measured = comparison[(comparison["HCS"] > 0) & (comparison["SPKLU"] > 0)].copy()
    measured = measured.sort_values(["Rasio", "HCS", "Wilayah"], ascending=[False, False, True]).head(max_items)
    zeros = comparison[(comparison["HCS"] > 0) & (comparison["SPKLU"] == 0)].copy()
    zeros = zeros.sort_values(["HCS", "Wilayah"], ascending=[False, True]).head(max_items)
    return measured, zeros
