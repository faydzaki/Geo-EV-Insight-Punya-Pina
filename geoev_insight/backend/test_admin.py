"""Run python test_admin.py. Uses synthetic credentials and an isolated memory DB only."""
import os, json, base64, uuid
from io import BytesIO
os.environ.update(GEOEV_ADMIN_USER='qa_admin',GEOEV_ADMIN_PASSWORD='qa-admin-secret',GEOEV_VIEWER_USER='qa_viewer',GEOEV_VIEWER_PASSWORD='qa-view-secret')
import pandas as pd
from sqlalchemy import create_engine,select
from sqlalchemy.pool import StaticPool
import database as db
db._engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
import app
from plotly.utils import PlotlyJSONEncoder
client=app.server.test_client()
def auth(viewer=False):
    return {'Authorization':'Basic '+base64.b64encode(('qa_viewer:qa-view-secret' if viewer else 'qa_admin:qa-admin-secret').encode()).decode()}
def invoke(fragment,inputs,states=None,viewer=False,changed=None):
    key,spec=next((k,v) for k,v in app.app.callback_map.items() if fragment in k)
    outputs=spec['output'];multi=isinstance(outputs,list)
    out=[{'id':o.component_id,'property':o.component_property} for o in (outputs if multi else [outputs])]
    ins=[{**i,'value':inputs[i['id']+'.'+i['property']]} for i in spec['inputs']]
    state=[{**i,'value':(states or {})[i['id']+'.'+i['property']]} for i in spec['state']]
    response=client.post('/_dash-update-component',headers=auth(viewer),json={'output':key,'outputs':out if multi else out[0],
        'inputs':ins,'state':state,'changedPropIds':changed or [ins[0]['id']+'.'+ins[0]['property']]})
    assert response.status_code==200,response.data[:2000]
    return response.get_json()['response']
def fail(fn):
    try: fn()
    except ValueError: return
    raise AssertionError('Expected rejected mutation')
assert client.get('/').status_code==401
assert client.get('/_dash-layout',headers=auth()).status_code==200
# New data and validation.
values={'nama':'SPKLU Satu','alamat':'Kota Surabaya','pengelola':'PLN','provinsi':'Jawa Timur','wilayah':'Kota Surabaya','lat':-7.25,'lon':112.75}
details=[{'kw':60,'unit':2,'connector':4}]
sid=db.save_site_manual(values,details,'qa_admin','Data uji','create-1')
assert db.save_site_manual(values,details,'qa_admin','Data uji','create-1')==sid
assert len(db.load_data()[0])==1
fail(lambda:db.save_site_manual(values,details,'qa_admin','Data uji','duplicate'))
fail(lambda:db.save_site_manual({**values,'nama':'Rusak','lat':float('nan')},details,'qa_admin','Data uji','invalid'))
fail(lambda:db.save_site_manual({**values,'nama':'Rusak'},[{'kw':22,'unit':1.5,'connector':1}],'qa_admin','Data uji','fraction'))
# Edit by stable ID, stale edit rejection, atomic rollback and status filtering.
row,token=db.get_site(sid)
renamed={**values,'nama':'SPKLU Diubah','alamat':'Alamat diperbaiki','lat':-7.3}
db.save_site_manual(renamed,details,'qa_admin','Koreksi','edit-1',sid,token)
assert len(db.load_data()[0])==1
fail(lambda:db.save_site_manual(values,details,'qa_admin','Stale','stale',sid,token))
row,token=db.get_site(sid);db.set_site_active(sid,0,token,'qa_admin','Ditutup sementara','off')
assert db.load_data()[0].empty and len(db.load_data(True)[0])==1
row,token=db.get_site(sid);db.set_site_active(sid,1,token,'qa_admin','Buka kembali','on')
assert len(db.load_data()[0])==1
# HCS add/correct/idempotence/stale/zero.
assert db.adjust_hcs('Kota Surabaya','BYD',2,'add',0,'qa_admin','Tambahan','hcs-1')==2
assert db.adjust_hcs('Kota Surabaya','BYD',2,'add',0,'qa_admin','Tambahan','hcs-1')==2
fail(lambda:db.adjust_hcs('Kota Surabaya','BYD',5,'set',0,'qa_admin','Stale','hcs-stale'))
assert db.adjust_hcs('Kota Surabaya','BYD',1,'set',2,'qa_admin','Koreksi','hcs-2')==1
assert db.adjust_hcs('Kota Surabaya','BYD',0,'set',1,'qa_admin','Koreksi','hcs-zero')==0
# Repeated additive Excel protection and replace audit.
db.save_hcs({('Kota Surabaya','BYD'):3},actor='qa_admin',mode='add',fingerprint='a'*64)
fail(lambda:db.save_hcs({('Kota Surabaya','BYD'):3},actor='qa_admin',mode='add',fingerprint='a'*64))
assert db.hcs_count('Kota Surabaya','BYD')==3
# Stable ID Excel updates, unknown ID must roll back without changing data.
record={**renamed,'id':sid,'nama':'Nama dari Excel','daya':120,'unit':2,'connector':4,'rincian':json.dumps([{'kelompok':'1',**details[0]}])}
db.save_spklu([record],actor='qa_admin')
assert db.get_site(sid)[0]['nama']=='Nama dari Excel'
fail(lambda:db.save_spklu([{**record,'id':9999}],actor='qa_admin'))
assert db.get_site(sid)[0]['nama']=='Nama dari Excel'
# Manual callbacks: viewer cannot create/update, change status, or adjust HCS.
snapshot={'id':None,'request':'api-form-1','expected':None}
site_state={'admin-site-snapshot.data':snapshot,'admin-name.value':'Lokasi dari UI','admin-address.value':'Kabupaten Sidoarjo','admin-owner.value':'PLN',
    'admin-province.value':'Jawa Timur','admin-area.value':'Kabupaten Sidoarjo','admin-lat.value':-7.45,'admin-lon.value':112.7,
    'admin-chargers.data':details,'admin-site-reason.value':'Input manual','data-version.data':0}
site_inputs={'admin-save-site.n_clicks':1,'admin-status-confirm.submit_n_clicks':0}
r=invoke('admin-site-result.children',site_inputs,site_state,viewer=True)
assert 'data-version' not in r and len(db.load_data()[0])==1
r=invoke('admin-site-result.children',site_inputs,site_state)
assert r['data-version']['data']==1 and len(db.load_data()[0])==2
r=invoke('admin-site-result.children',site_inputs,site_state); assert len(db.load_data()[0])==2
hcs_state={'admin-hcs-snapshot.data':{'area':'Kota Surabaya','brand':'BYD','jumlah':3,'request':'api-hcs-1'},'admin-hcs-area.value':'Kota Surabaya',
    'admin-hcs-brand.value':'BYD','admin-hcs-amount.value':2,'admin-hcs-mode.value':'add','admin-hcs-reason.value':'Tambahan manual','data-version.data':1}
r=invoke('admin-hcs-result.children',{'admin-save-hcs.n_clicks':1},hcs_state,viewer=True); assert db.hcs_count('Kota Surabaya','BYD')==3
r=invoke('admin-hcs-result.children',{'admin-save-hcs.n_clicks':1},hcs_state); assert db.hcs_count('Kota Surabaya','BYD')==5
assert r['admin-hcs-amount']['value'] is None
# Tables, editor and history return JSON-serializable values.
r=invoke('admin-sites.data',{'data-version.data':2,'nav.value':'admin','db-refresh-now.n_clicks':0,'db-auto-refresh.n_intervals':0})
assert len(r['admin-sites']['data'])==2
r=invoke('admin-editor-title.children',{'admin-site-select.value':sid,'admin-reload-site.n_clicks':0,'admin-written.data':0,'admin-new.n_clicks':0})
assert r['admin-site-snapshot']['data']['id']==sid
r=invoke('admin-history-detail.children',{'admin-history.active_cell':{'row_id':db.history()[0]['id']},'data-version.data':2})
assert r['admin-history-detail']['children']
# Preview/import callback ordering with new HCS mode and file fingerprint.
buf=BytesIO();pd.DataFrame({'NAMA PELANGGAN':['A'],'MERK KENDARAAN':['BYD'],'ALAMAT':['x'],'UID':['1'],
    'Latitude':[-7.25],'Longitude':[112.75],'KOTA/KABUPATEN':['Kota Surabaya']}).to_excel(buf,index=False)
content='data:application/xlsx;base64,'+base64.b64encode(buf.getvalue()).decode()
r=invoke('upload-confirm.displayed',{'upload-spklu.contents':None,'upload-hcs.contents':content,'admin-import-hcs-mode.value':'add'},
    {'upload-spklu.filename':None,'upload-hcs.filename':'hcs.xlsx'},changed=['upload-hcs.contents'])
assert 'DITAMBAHKAN' in r['upload-confirm']['message'] and db.hcs_count('Kota Surabaya','BYD')==5
r=invoke('spklu-upload-result.children',{'upload-confirm.submit_n_clicks':1},{'upload-kind.data':'upload-hcs','upload-spklu.contents':None,
    'upload-hcs.contents':content,'upload-spklu.filename':None,'upload-hcs.filename':'hcs.xlsx','data-version.data':2,'admin-import-hcs-mode.value':'add'})
assert db.hcs_count('Kota Surabaya','BYD')==6
assert all(r['actor']=='qa_admin' for r in db.history())
assert all(json.loads(r['after_json']) is not None for r in db.history())
print('PASS: manual add/edit/status, stale-write rejection, duplicate submit, HCS add/correction/zero, repeated Excel guard, stable IDs, authorization, history, callback serialization and import mode.')
