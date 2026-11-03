"""Tes fungsi pengolahan tanpa paket Dash; tes ini tidak diperlukan saat menjalankan aplikasi."""
import ast
from pathlib import Path
import pandas as pd
import base64, re, unicodedata, json
from collections import Counter
from io import BytesIO

source=Path(__file__).with_name('app.py').read_text(encoding='utf-8')
tree=ast.parse(source)
needed={'clean_text','norm','safe_num','coord','normalize_province','normalize_owner','normalize_area','detect_cols','read_excel_upload','choose_sheet','parse_spklu','parse_hcs'}
selected=[]
for item in tree.body:
    if isinstance(item, ast.FunctionDef) and item.name in needed:
        selected.append(item)
    if isinstance(item, ast.Assign) and any(isinstance(t,ast.Name) and t.id in ('JATIM','BALI','AREA_CENTERS','AMBIGUOUS') for t in item.targets):
        selected.append(item)
ns={'pd':pd,'base64':base64,'re':re,'unicodedata':unicodedata,'json':json,'Counter':Counter,'BytesIO':BytesIO}
exec(compile(ast.Module(body=selected,type_ignores=[]),'subset','exec'), ns)
assert ns['normalize_area']('Kab. MALANG')=='Kabupaten Malang'
assert ns['normalize_area']('Kota Malang')=='Kota Malang'
assert ns['normalize_area']('Jl. Kertajaya Surabaya')=='Kota Surabaya'
assert ns['normalize_area']('Jalan Kayutangan Malang')=='Tidak diketahui'
assert ns['normalize_area']('Kabupaten Sidoarjo')=='Kabupaten Sidoarjo'
assert ns['normalize_area']('KAB. PROBOLINGGO')=='Kabupaten Probolinggo'
assert ns['normalize_area']('Kota Batu')=='Kota Batu'
assert ns['safe_num']('22,5 kW')==22.5
spklu={
 'No':[1,2], 'Nama':['SPKLU A', 'SPKLU B'], 'Alamat':['Kota Surabaya','Kab. MALANG'],
 'PLN atau NON PLN':['PLN', 'NON PLN'], 'Provinsi':['Jawa Timur','Jatim'],
 'Kapasitas Charger_':[50,22], 'Jumlah Charger_':[2,1], 'Jumlah Connector_':[2,1],
 'Kapasitas Charger-':[60,None], 'Jumlah Charger-':[1,None], 'Jumlah Connector-':[2,None],
 'Kapasitas Charger*':[None,None], 'Jumlah Charger*':[None,None], 'Jumlah Connector*':[None,None],
 'Kapasitas Charger`':[None,None], 'Jumlah Charger`':[None,None], 'Jumlah Connector`':[None,None],
 'Latitude':[-7.25,-8.1], 'Longitude':[112.7,112.6],
}
sites,msg=ns['parse_spklu']({'Sheet1':pd.DataFrame(spklu)})
assert len(sites)==2 and sites[0]['daya']==160 and sites[0]['unit']==3 and sites[0]['connector']==4, sites
assert sites[1]['wilayah']=='Kabupaten Malang', sites[1]
hcs=pd.DataFrame({'NAMA PELANGGAN':['A','A','B'], 'MERK KENDARAAN':['BYD','BYD','WULING'],
 'ALAMAT':['a','a','b'], 'UID':['101','101','102'], 'Latitude':[-7.3,-7.3,-8.1],
 'Longitude':[112.7,112.7,112.6], 'KOTA/KABUPATEN':['Kota Surabaya','Kota Surabaya','Kab. Malang']})
count,city,msg2=ns['parse_hcs']({'Data':hcs})
assert sum(count.values())==3 and city['Kabupaten Malang']==1 and city['Kota Surabaya']==2
print('SEMUA TES BERHASIL')
print(msg)
print(msg2)
