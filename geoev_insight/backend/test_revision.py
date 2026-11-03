"""Functional regression: isolated SQLite fixture; never connects to configured MySQL.
Run: python test_revision.py. Credentials below are synthetic test-only values.
"""
import base64
from io import BytesIO
import json
import os
os.environ.update(GEOEV_ADMIN_USER='testadmin', GEOEV_ADMIN_PASSWORD='test-admin-secret',
                  GEOEV_VIEWER_USER='testviewer', GEOEV_VIEWER_PASSWORD='test-viewer-secret')
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
import database
database._engine = create_engine('sqlite://', connect_args={'check_same_thread':False}, poolclass=StaticPool)
import app
from plotly.utils import PlotlyJSONEncoder

client = app.server.test_client()
def auth(viewer=False):
    pair = 'testviewer:test-viewer-secret' if viewer else 'testadmin:test-admin-secret'
    return {'Authorization':'Basic '+base64.b64encode(pair.encode()).decode()}

def invoke(fragment, inputs, states, viewer=False):
    key, spec = next((k,v) for k,v in app.app.callback_map.items() if fragment in k)
    outputs = spec['output']
    body = {'output':key,'outputs':[{'id':o.component_id,'property':o.component_property} for o in outputs],
            'inputs':[dict(id=i,property=p,value=v) for i,p,v in inputs],
            'state':[dict(id=i,property=p,value=v) for i,p,v in states],
            'changedPropIds':[inputs[0][0]+'.'+inputs[0][1]]}
    response = client.post('/_dash-update-component', json=body, headers=auth(viewer))
    assert response.status_code == 200, response.data[:1000]
    return response.get_json()['response']

assert client.get('/').status_code == 401
for route in ('/','/_dash-layout','/_dash-dependencies'):
    assert client.get(route, headers=auth()).status_code == 200

sites = pd.DataFrame({'Nama':['Contoh SPKLU'], 'Alamat':['Alamat tanpa nama wilayah'],
    'KOTA/KABUPATEN':['Kab. Malang'], 'PLN atau NON PLN':['PLN'], 'Provinsi':['Jatim'],
    'Latitude':[-8.1], 'Longitude':[112.6], 'Kapasitas Charger_':[120],
    'Jumlah Charger_':[2], 'Jumlah Connector_':[4]})
buf=BytesIO();sites.to_excel(buf,index=False)
contents='data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,'+base64.b64encode(buf.getvalue()).decode()
preview_inputs=[('upload-spklu','contents',contents),('upload-hcs','contents',None),('admin-import-hcs-mode','value','replace')]
filenames=[('upload-spklu','filename','contoh.xlsx'),('upload-hcs','filename',None)]
result=invoke('upload-confirm.displayed',preview_inputs,filenames[:2])
assert result['upload-confirm']['displayed'] is True
assert 'belum disimpan' in result['upload-confirm']['message']
assert database.load_data()[0].empty, 'Preview must not write'
states=[('upload-kind','data','upload-spklu'),preview_inputs[0],preview_inputs[1],filenames[0],filenames[1],('data-version','data',0),preview_inputs[2]]
result=invoke('spklu-upload-result.children',[('upload-confirm','submit_n_clicks',1)],states,viewer=True)
assert database.load_data()[0].empty,'Viewer must not write'
result=invoke('spklu-upload-result.children',[('upload-confirm','submit_n_clicks',1)],states)
assert result['data-version']['data']==1
stored,_,_=database.load_data(); assert len(stored)==1 and stored.iloc[0].wilayah=='Kabupaten Malang'
invoke('spklu-upload-result.children',[('upload-confirm','submit_n_clicks',2)],states)
assert len(database.load_data()[0])==1, 'Repeat import must update existing location'

hcs=pd.DataFrame({'NAMA PELANGGAN':['A','A','B'], 'UID':['1','1',None], 'ALAMAT':['x']*3,
    'MERK KENDARAAN':['BYD']*3, 'Latitude':[-8.1]*3, 'Longitude':[112.6]*3,
    'KOTA/KABUPATEN':['Kab. Malang']*3})
counts,_,_=app.parse_hcs({'HCS':hcs}); assert sum(counts.values())==3
database.save_hcs(counts)
with app.server.test_request_context(headers=auth()):
    values=app.update_dashboard(0,'Semua','Semua','Semua','all','both','Semua','',0,0)
    assert len(values)==27
    json.dumps(values,cls=PlotlyJSONEncoder)
    assert not values[-1]
    assert len(app.filtered_sites(stored,'Semua','Semua','Semua','all','CONTOH'))==1
    assert app.filtered_sites(stored,'Semua','Semua','Semua','low','').empty
    assert app.bounds_for_points([[-8.1,112.6]])[0][0] < -8.1
    empty=app.update_dashboard(0,'Semua','Semua','Semua','all','spklu','Semua','notfound',0,0)
    assert empty[-3]  # Filter summary remains available for empty results
with app.server.test_request_context(headers=auth(True)):
    options,disabled,_=app.access_controls(0)
    assert disabled and 'admin' not in [o['value'] for o in options]
map_inputs=[('data-version','data',0),('filter-prov','value','Semua'),('filter-owner','value','Semua'),
    ('filter-area','value','Semua'),('filter-power','value','all'),('site-search','value',''),
    ('map-layer','value','both'),('db-refresh-now','n_clicks',0),('db-auto-refresh','n_intervals',0)]
result=invoke('geo-layers.children',map_inputs,[])
assert len(result['geo-layers']['children'])==2, 'One SPKLU and one HCS region'
assert len(result['selected-site']['options'])==1
map_inputs[5]=('site-search','value','notfound'); map_inputs[6]=('map-layer','value','spklu')
result=invoke('geo-layers.children',map_inputs,[])
assert not result['geo-layers']['children'] and result['map-empty']['children']
assert app.charger_details('invalid-json')==[]
corrupt=stored.copy(); corrupt.loc[corrupt.index[0],'lat']=float('nan')
assert app.valid_map_sites(corrupt).empty
print('PASS: authentication, upload preview/no write, viewer denial, confirmed save, repeat import, explicit area, HCS row policy, filters, dashboard, independent map callback, invalid coordinates and map bounds')
