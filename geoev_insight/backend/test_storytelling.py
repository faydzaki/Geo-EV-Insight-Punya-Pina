"""Tes tujuh inti: peta -> HCS -> rasio -> judul dinamis -> rekomendasi -> batasan."""
import math
import pandas as pd
from storytelling import (compare_areas, comparison_quality, headline_spklu,
                          headline_hcs, headline_ratio, insight_hcs_vs_spklu, candidates)

sites = pd.DataFrame([
    {"nama":"S1", "provinsi":"Jawa Timur", "wilayah":"Kota Surabaya"},
    {"nama":"S2", "provinsi":"Jawa Timur", "wilayah":"Kota Surabaya"},
    {"nama":"S3", "provinsi":"Jawa Timur", "wilayah":"Kabupaten Gresik"},
    {"nama":"S4", "provinsi":"Bali", "wilayah":"Tidak diketahui"},
    {"nama":"S5", "provinsi":"Jawa Timur", "wilayah":"Tidak diketahui"},
])
hcs = pd.DataFrame([
    {"wilayah":"Kota Surabaya", "merk":"BYD", "jumlah":100},
    {"wilayah":"Kabupaten Gresik", "merk":"WULING", "jumlah":100},
    {"wilayah":"Kota Malang", "merk":"BYD", "jumlah":45},
])
result = compare_areas(sites, hcs)
by = result.set_index('Wilayah')
assert by.loc['Kota Surabaya','Rasio'] == 50.0, by
assert by.loc['Kabupaten Gresik','Rasio'] == 100.0
assert by.loc['Kota Malang','SPKLU'] == 0
assert math.isnan(by.loc['Kota Malang','Rasio'])
assert by.loc['Kota Malang','Status'] == 'SPKLU belum terpetakan'
assert 'Kabupaten Gresik' in headline_ratio(result)
assert '100,0' in headline_ratio(result)
assert 'Kota Surabaya' in headline_hcs(hcs) or 'Kabupaten Gresik' in headline_hcs(hcs)
assert 'catatan HCS' in insight_hcs_vs_spklu(result)
assert 'Jawa Timur' in headline_spklu(sites)
lead, zero = candidates(result)
assert lead.iloc[0]['Wilayah']=='Kabupaten Gresik'
assert zero.iloc[0]['Wilayah']=='Kota Malang'
assert comparison_quality(sites, hcs)['spklu_unmapped'] == 1
assert compare_areas(sites, hcs, 'Kabupaten Gresik').shape[0] == 1
assert compare_areas(pd.DataFrame(), pd.DataFrame()).empty
assert 'belum' in headline_hcs(pd.DataFrame()).lower() or 'Persebaran' in headline_hcs(pd.DataFrame())
print('TES STORYTELLING BERHASIL: rasio Jatim, nol tak terdefinisi, headline, kandidat, keterbatasan')
