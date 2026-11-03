"""Manual data management UI and callbacks. All mutations require server-side admin auth."""
import json
import math
import uuid
from datetime import datetime
from flask import request
from dash import Input, Output, State, dcc, html, dash_table, ctx, no_update
import dash_leaflet as dl
import database as db


def field(label, component, wide=False):
    return html.Div([html.Label(label, htmlFor=component.id), component], className='admin-field'+(' admin-field--wide' if wide else ''))


def table(id_, cols, page_size=8):
    return dash_table.DataTable(id=id_, columns=[{'name':label,'id':key} for label,key in cols],
        data=[], page_size=page_size, sort_action='native', filter_action='native',
        cell_selectable=True, style_table={'overflowX':'auto'},
        style_cell={'textAlign':'left','whiteSpace':'normal','minWidth':'90px','maxWidth':'330px'},
        style_data_conditional=[{'if':{'filter_query':'{status} = "Nonaktif"'},'color':'#718096','backgroundColor':'#f6f8fa'}])


def layout(import_panel, areas):
    area_options=[{'label':a,'value':a} for a in sorted(areas)]+[{'label':'Belum diketahui','value':'Tidak diketahui'}]
    return html.Div([
        dcc.Store(id='admin-written',data=0), dcc.Store(id='admin-site-snapshot'), dcc.Store(id='admin-hcs-snapshot'),
        dcc.ConfirmDialog(id='admin-status-confirm'),
        html.Div([html.Div([html.Span('DATA WORKSPACE',className='eyebrow'),html.H2('Pilih cara menambahkan data.'),
            html.P('Input satu per satu lewat formulir, atau upload Excel untuk banyak data sekaligus.',className='muted')]),
            html.Span('AKSES ADMIN',className='admin-access')],className='admin-hero'),
        html.Div(id='admin-summary',className='admin-summary'),
        html.H3('Bagaimana Anda ingin memasukkan data?',className='admin-entry-title'),
        dcc.RadioItems(id='admin-entry',value='direct',options=[
            {'value':'direct','label':html.Div([html.Span('01',className='admin-entry-number'),
                html.Div([html.Strong('Input langsung di web'),html.Small('Tambah atau edit satu data melalui formulir. Tidak memerlukan Excel.')])])},
            {'value':'excel','label':html.Div([html.Span('02',className='admin-entry-number'),
                html.Div([html.Strong('Upload file Excel'),html.Small('Masukkan banyak data SPKLU atau HCS sekaligus dari file .xlsx.')])])}
        ],className='admin-entry-options'),
        html.Div(dcc.RadioItems(id='admin-tab',value='spklu',options=[{'label':label,'value':value} for label,value in [
            ('Input SPKLU','spklu'),('Input HCS','hcs'),('Riwayat perubahan','history')]],className='admin-tabs'),id='admin-direct-nav'),
        html.Div([
            html.Div([html.Div([html.H3('Input SPKLU langsung'),html.P('Isi formulir di bawah untuk menambah satu lokasi. Untuk koreksi, pilih lokasi pada formulir atau buka daftar inventaris.',className='muted')]),
                html.Button('+ Tambah SPKLU',id='admin-new',n_clicks=0,className='primary-btn')],className='admin-section-top'),
            html.Details([html.Summary('Cari atau edit lokasi yang sudah ada'),
                table('admin-sites',[('ID','id'),('Lokasi','nama'),('Kabupaten/kota','wilayah'),('Provinsi','provinsi'),('Pengelola','pengelola'),('Unit','unit'),('Status','status')])],className='detail-panel admin-inventory'),
            html.Div([
                html.Div([
                    html.Div([html.Div([html.Span('FORMULIR LOKASI',className='eyebrow'),html.H3(id='admin-editor-title')]),html.Button('Muat ulang formulir',id='admin-reload-site',n_clicks=0,className='secondary-btn')],className='admin-section-top'),
                    field('Pilih lokasi untuk diedit',dcc.Dropdown(id='admin-site-select',options=[{'label':'+ Lokasi baru','value':'new'}],value='new',clearable=False)),
                    html.Div(id='admin-site-state',className='admin-inline-note'),
                    html.Div([
                        field('Nama SPKLU',dcc.Input(id='admin-name',type='text',maxLength=255,placeholder='Contoh: SPKLU Rest Area …'),True),
                        field('Pengelola',dcc.Dropdown(id='admin-owner',options=['PLN','Non-PLN','Tidak diketahui'],value='PLN',clearable=False)),
                        field('Provinsi',dcc.Dropdown(id='admin-province',options=['Jawa Timur','Bali'],value='Jawa Timur',clearable=False)),
                        field('Kabupaten/kota Jawa Timur',dcc.Dropdown(id='admin-area',options=area_options,value='Tidak diketahui',clearable=False),True),
                        field('Alamat lengkap',dcc.Textarea(id='admin-address',placeholder='Jalan, kecamatan, kabupaten/kota…'),True),
                        field('Latitude',dcc.Input(id='admin-lat',type='number',debounce=True,placeholder='-7.25',step='any')),
                        field('Longitude',dcc.Input(id='admin-lon',type='number',debounce=True,placeholder='112.75',step='any')),
                    ],className='admin-form-grid'),
                    html.Div([html.H4('Rincian charger'),html.Button('+ Kelompok charger',id='admin-add-charger',n_clicks=0,className='secondary-btn')],className='admin-section-top'),
                    dash_table.DataTable(id='admin-chargers',columns=[{'name':n,'id':k,'type':'numeric'} for n,k in [('Daya/unit (kW)','kw'),('Unit charger','unit'),('Total konektor kelompok','connector')]],
                        data=[{'kw':22,'unit':1,'connector':1}],editable=True,row_deletable=True,style_table={'overflowX':'auto'}),
                    html.Div(id='admin-charger-total',className='admin-calculation'),
                    field('Alasan / sumber perubahan',dcc.Textarea(id='admin-site-reason',placeholder='Contoh: penambahan lokasi hasil verifikasi lapangan')), 
                    html.Div([html.Button('Simpan lokasi',id='admin-save-site',n_clicks=0,className='primary-btn'),
                        html.Button('Nonaktifkan lokasi',id='admin-toggle-status',n_clicks=0,className='danger-btn',disabled=True)],className='admin-actions'),
                    html.Div(id='admin-site-result',role='status'),
                ],className='content-card admin-editor'),
                html.Aside([
                    html.Span('PILIH KOORDINAT',className='eyebrow'),html.H3('Tentukan titik di peta'),
                    html.P('Klik peta untuk mengisi latitude dan longitude, atau masukkan angkanya pada formulir.',className='muted'),
                    dl.Map([dl.TileLayer(url='https://tile.openstreetmap.org/{z}/{x}/{y}.png',attribution='&copy; OpenStreetMap contributors'),dl.LayerGroup(id='admin-pin')],
                        id='admin-picker',center=[-7.8,113.3],zoom=7,style={'height':'300px','width':'100%'},boundsOptions={'maxZoom':14,'padding':[20,20]}),
                    html.Div([html.Strong('Perubahan tersimpan langsung'),html.P('Ringkasan daya dihitung otomatis. Edit menggunakan ID lokasi, sehingga mengganti nama atau koordinat tidak membuat lokasi baru.')],className='admin-help'),
                    html.Div([html.Strong('Nonaktif ≠ hapus'),html.P('Lokasi nonaktif tetap ada di inventaris dan riwayat, tetapi dikeluarkan dari peta, KPI, dan rasio. Anda dapat mengaktifkannya kembali.')],className='admin-help'),
                    html.Small('Peta dasar memerlukan internet. Wilayah Bali disimpan sebagai “Tidak diketahui” untuk analisis kabupaten/kota.')
                ],className='content-card admin-guide')
            ],className='admin-editor-grid'),
        ],id='admin-pane-spklu'),
        html.Div([
            html.Div([html.H3('Input HCS langsung'),html.P('Pilih wilayah dan kategori, masukkan jumlah tambahan, lalu simpan. Nilai 1 berarti menambah satu catatan HCS.',className='muted')],className='admin-section-top'),
            html.Details([html.Summary('Lihat atau pilih data HCS yang sudah ada'),
                table('admin-hcs-table',[('Kabupaten/kota','wilayah'),('Kategori kendaraan','merk'),('Catatan HCS','jumlah')])],className='detail-panel admin-inventory'),
            html.Div([
                html.Div([html.Span('PENYESUAIAN AGREGAT',className='eyebrow'),html.H3('Tambahkan atau koreksi jumlah'),
                    html.Div([
                        field('Kabupaten/kota',dcc.Dropdown(id='admin-hcs-area',options=sorted(areas),placeholder='Pilih wilayah',clearable=False)),
                        field('Kategori kendaraan',dcc.Input(id='admin-hcs-brand',type='text',debounce=True,list='admin-brand-list',placeholder='Pilih saran atau ketik kategori baru',maxLength=120)),
                        html.Datalist(id='admin-brand-list'),
                        field('Jenis perubahan',dcc.RadioItems(id='admin-hcs-mode',options=[{'label':'Tambah catatan','value':'add'},{'label':'Koreksi jumlah akhir','value':'set'}],value='add',className='admin-mode'),True),
                        field('Jumlah',dcc.Input(id='admin-hcs-amount',type='number',min=0,step=1,value=1)),
                        html.Button('Muat ulang nilai',id='admin-hcs-reload',n_clicks=0,className='secondary-btn'),
                    ],className='admin-form-grid'),
                    html.Div(id='admin-hcs-calculation',className='admin-calculation'),
                    field('Alasan / sumber perubahan',dcc.Textarea(id='admin-hcs-reason',placeholder='Contoh: tambahan 2 catatan dari laporan bulan ini')),
                    html.Button('Simpan perubahan HCS',id='admin-save-hcs',n_clicks=0,className='primary-btn'),
                    html.Div(id='admin-hcs-result',role='status'),
                ],className='content-card'),
                html.Div([html.H3('Dua tindakan, dua makna'),
                    html.Div([html.Strong('Tambah catatan'),html.P('Jumlah sekarang 10, masukkan 2 → hasilnya 12.')],className='admin-help'),
                    html.Div([html.Strong('Koreksi jumlah akhir'),html.P('Jumlah sekarang 10, masukkan 8 → hasilnya 8. Nilai 0 menghapus kelompok agregat tersebut dari distribusi.')],className='admin-help'),
                    html.P('Catatan HCS bukan pelanggan unik. Sistem tidak dapat mendeteksi pelanggan yang sama dari data agregat.',className='insight-warning'),
                    html.P('Kategori mengikuti sumber data. Gunakan saran kategori yang sudah ada agar penulisannya konsisten.',className='muted')
                ],className='content-card')
            ],className='admin-editor-grid'),
        ],id='admin-pane-hcs',style={'display':'none'}),
        html.Div([html.Div([html.H3('Pembaruan massal lewat Excel'),html.P('Gunakan formulir untuk 1–2 perubahan; gunakan Excel untuk data dalam jumlah besar.',className='muted')],className='admin-section-top'),
            html.Div([html.Label('Mode import HCS'),dcc.RadioItems(id='admin-import-hcs-mode',options=[{'label':'Ganti seluruh agregat HCS','value':'replace'},{'label':'Tambahkan ke agregat sekarang','value':'add'}],value='replace',className='admin-mode'),
                html.P('Mode tambah menolak file identik yang pernah ditambahkan. File yang diubah atau data pelanggan yang tumpang tindih masih perlu diperiksa manual.',className='muted')],className='content-card'),
            import_panel,
            html.Div([html.H4('Sebelum konfirmasi'),html.P('Pratinjau upload masih berupa ringkasan teks. Upload SPKLU tidak mengubah status aktif/nonaktif. Kolom ID opsional pada Excel SPKLU dapat dipakai untuk memperbarui lokasi berdasarkan ID tetap.')],className='admin-help')
        ],id='admin-pane-import',style={'display':'none'}),
        html.Div([html.Div([html.H3('Jejak perubahan'),html.P('100 transaksi terbaru. Klik baris untuk membaca nilai sebelum dan sesudah.',className='muted')],className='admin-section-top'),
            html.Div([table('admin-history',[('Waktu (WIB)','waktu'),('Akun','actor'),('Data','dataset'),('Tindakan','action'),('Target','target'),('Alasan','reason')],12)],className='content-card'),
            html.Div(id='admin-history-detail',className='content-card'),
            html.P('Riwayat dimulai setelah revisi ini dipasang. Akun yang dicatat adalah username login; jika akun admin dipakai bersama, identitas orangnya tidak dapat dibedakan. Riwayat belum menyediakan Undo otomatis.',className='muted')
        ],id='admin-pane-history',style={'display':'none'}),
    ],className='admin-workspace')


def history_snapshot(value):
    if value is None: return html.P('Belum ada data.',className='muted')
    if isinstance(value,list):
        if not value: return html.P('Tidak ada data.',className='muted')
        keys=[('ID','id'),('Lokasi','nama'),('Wilayah','wilayah'),('Kategori','merk'),('Jumlah HCS','jumlah'),('Unit','unit'),('Daya kW','daya'),('Aktif (1/0)','aktif')]
        columns=[{'name':label,'id':key} for label,key in keys if key in value[0]]
        return [html.P(f'{len(value):,} baris data'),dash_table.DataTable(columns=columns,data=[{c['id']:r.get(c['id']) for c in columns} for r in value],page_size=6,sort_action='native',style_table={'overflowX':'auto'},style_cell={'textAlign':'left','whiteSpace':'normal','maxWidth':'230px'})]
    labels={'id':'ID lokasi','nama':'Nama','alamat':'Alamat','pengelola':'Pengelola','provinsi':'Provinsi','wilayah':'Wilayah','lat':'Latitude','lon':'Longitude','daya':'Daya terpasang (kW)','unit':'Unit charger','connector':'Konektor','aktif':'Status','merk':'Kategori kendaraan','jumlah':'Jumlah HCS'}
    rows=[]
    for key,label in labels.items():
        if key not in value: continue
        v=value[key]
        if key=='aktif': v='Aktif' if v else 'Nonaktif'
        rows.append(html.Tr([html.Td(label),html.Td(str(v))]))
    result=[html.Table(html.Tbody(rows))]
    if value.get('details'):
        result.append(html.Ul([html.Li(f"{d['kw']} kW × {d['unit']} unit · {d['connector']} konektor") for d in value['details']]))
    return result


def register(app, is_admin, areas):
    def actor(): return request.authorization.username
    def message(text, error=False): return html.P(text,className='upload-error' if error else 'upload-success')

    @app.callback([Output('admin-pane-'+name,'style') for name in ('spklu','hcs','import','history')]+[Output('admin-direct-nav','style')],
        Input('admin-entry','value'),Input('admin-tab','value'))
    def tabs(entry,tab):
        selected='import' if entry=='excel' else (tab if tab in ('spklu','hcs','history') else 'spklu')
        return [{'display':'block' if name==selected else 'none'} for name in ('spklu','hcs','import','history')]+[{'display':'none' if entry=='excel' else 'block'}]

    @app.callback(Output('admin-sites','data'),Output('admin-site-select','options'),Output('admin-hcs-table','data'),Output('admin-brand-list','children'),Output('admin-history','data'),Output('admin-summary','children'),
        Input('data-version','data'),Input('nav','value'),Input('db-refresh-now','n_clicks'),Input('db-auto-refresh','n_intervals'))
    def refresh(version,nav,clicks,intervals):
        if not is_admin() or nav!='admin': return (no_update,)*6
        try:
            sites,hcs,_=db.load_data(include_inactive=True)
            rows=sites[['id','nama','wilayah','provinsi','pengelola','unit','aktif']].to_dict('records')
            for row in rows: row['status']='Aktif' if row.pop('aktif') else 'Nonaktif'
            options=[{'label':'+ Lokasi baru','value':'new'}]+[{'label':f"#{r['id']} · {r['nama']} ({r['status']})",'value':r['id']} for r in rows]
            hrows=hcs.to_dict('records')
            for row in hrows: row['id']=json.dumps([row['wilayah'],row['merk']],ensure_ascii=False)
            logs=[{'id':r['id'],'waktu':r['created_at'].strftime('%d/%m/%Y %H:%M:%S'),**{k:r[k] for k in ('actor','dataset','action','target','reason')}} for r in db.history()]
            summary=[html.Div([html.Span(label),html.Strong(str(value))],className='admin-stat') for label,value in [
                ('Lokasi aktif',sum(r['status']=='Aktif' for r in rows)),('Lokasi nonaktif',sum(r['status']=='Nonaktif' for r in rows)),('Catatan HCS',int(hcs.jumlah.sum())),('Kelompok HCS',len(hcs))]]
            return rows,options,hrows,[html.Option(value=b) for b in sorted(hcs.merk.unique())],logs,summary
        except Exception:
            app.logger.exception('Admin inventory failed')
            return (no_update,)*5+(message('Inventaris belum berhasil dimuat. Periksa database lalu muat ulang.',True),)

    @app.callback(Output('admin-site-select','value'),Input('admin-sites','active_cell'),Input('admin-new','n_clicks'),prevent_initial_call=True)
    def select_site(cell,new):
        if not is_admin(): return no_update
        return 'new' if ctx.triggered_id=='admin-new' else (cell.get('row_id',no_update) if cell else no_update)

    @app.callback(Output('admin-editor-title','children'),Output('admin-name','value'),Output('admin-address','value'),Output('admin-owner','value'),Output('admin-province','value'),Output('admin-area','value'),Output('admin-lat','value'),Output('admin-lon','value'),Output('admin-chargers','data'),Output('admin-site-snapshot','data'),Output('admin-site-state','children'),Output('admin-toggle-status','children'),Output('admin-toggle-status','disabled'),Output('admin-site-reason','value'),
        Input('admin-site-select','value'),Input('admin-reload-site','n_clicks'),Input('admin-written','data'),Input('admin-new','n_clicks'))
    def editor(selection,reload,written,new):
        if not is_admin(): return (no_update,)*14
        token=str(uuid.uuid4())
        if selection in (None,'new') or ctx.triggered_id=='admin-new':
            return 'Tambah SPKLU','','','PLN','Jawa Timur','Tidak diketahui',None,None,[{'kw':22,'unit':1,'connector':1}],{'id':None,'expected':None,'request':token},'Lokasi baru · isi data dan alasan sebelum menyimpan','Nonaktifkan lokasi',True,''
        try:
            row,expected=db.get_site(int(selection))
            return f"Edit SPKLU #{selection}",row['nama'],row['alamat'],row['pengelola'],row['provinsi'],row['wilayah'],row['lat'],row['lon'],row['details'],{'id':int(selection),'expected':expected,'request':token,'aktif':row['aktif']},('Aktif · tampil pada peta' if row['aktif'] else 'Nonaktif · tidak masuk peta dan rasio'),('Nonaktifkan lokasi' if row['aktif'] else 'Aktifkan kembali'),False,''
        except Exception:
            app.logger.exception('Admin editor load failed')
            return (no_update,)*9+(None,'Formulir gagal dimuat. Pilih ulang lokasi atau klik Muat ulang formulir.',no_update,True,no_update)

    @app.callback(Output('admin-area','disabled'),Input('admin-province','value'))
    def area_disabled(province): return province=='Bali'

    @app.callback(Output('admin-chargers','data',allow_duplicate=True),Input('admin-add-charger','n_clicks'),State('admin-chargers','data'),prevent_initial_call=True)
    def add_charger(clicks,rows): return (rows or [])+[{'kw':22,'unit':1,'connector':1}] if is_admin() else no_update

    @app.callback(Output('admin-charger-total','children'),Input('admin-chargers','data'))
    def charger_total(rows):
        try:
            _,details=db.validate_site({'nama':'Preview','alamat':'Preview','pengelola':'PLN','provinsi':'Jawa Timur','wilayah':'Tidak diketahui','lat':-7.8,'lon':113.3},rows)
            return f"{sum(d['unit'] for d in details)} unit · {sum(d['connector'] for d in details)} konektor · {sum(d['kw']*d['unit'] for d in details):,.1f} kW terpasang"
        except ValueError as exc: return str(exc)

    @app.callback(Output('admin-lat','value',allow_duplicate=True),Output('admin-lon','value',allow_duplicate=True),Input('admin-picker','clickData'),prevent_initial_call=True)
    def pick(click):
        if not is_admin() or not click: return no_update,no_update
        point=click.get('latlng')
        if isinstance(point,dict): return round(point['lat'],6),round(point['lng'],6)
        if isinstance(point,list) and len(point)==2: return round(point[0],6),round(point[1],6)
        return no_update,no_update

    @app.callback(Output('admin-pin','children'),Output('admin-picker','bounds'),Input('admin-lat','value'),Input('admin-lon','value'))
    def pin(lat,lon):
        try:
            lat,lon=float(lat),float(lon)
            if not math.isfinite(lat+lon) or not (-90<=lat<=90 and -180<=lon<=180): raise ValueError()
            return [dl.CircleMarker(center=[lat,lon],radius=9,color='#087f83',fillOpacity=.8)],[[lat-.01,lon-.01],[lat+.01,lon+.01]]
        except (ValueError,TypeError): return [],no_update

    @app.callback(Output('admin-status-confirm','displayed'),Output('admin-status-confirm','message'),Input('admin-toggle-status','n_clicks'),State('admin-site-snapshot','data'),State('admin-site-reason','value'),prevent_initial_call=True)
    def confirm_status(clicks,snapshot,reason):
        if not is_admin() or not snapshot or snapshot.get('id') is None: return False,''
        if not str(reason or '').strip(): return True,'Isi alasan perubahan terlebih dahulu. Tidak ada perubahan yang akan disimpan tanpa alasan.'
        return True,('Nonaktifkan' if snapshot.get('aktif') else 'Aktifkan kembali')+' lokasi ini? Status akan memengaruhi peta, KPI, dan rasio. Perubahan kolom formulir yang belum disimpan tidak ikut diterapkan.'

    @app.callback(Output('admin-site-result','children'),Output('data-version','data',allow_duplicate=True),Output('admin-written','data',allow_duplicate=True),
        Input('admin-save-site','n_clicks'),Input('admin-status-confirm','submit_n_clicks'),
        State('admin-site-snapshot','data'),State('admin-name','value'),State('admin-address','value'),State('admin-owner','value'),State('admin-province','value'),State('admin-area','value'),State('admin-lat','value'),State('admin-lon','value'),State('admin-chargers','data'),State('admin-site-reason','value'),State('data-version','data'),prevent_initial_call=True)
    def save_site(clicks,confirm,snapshot,name,address,owner,province,area,lat,lon,details,reason,version):
        if not is_admin(): return message('Hanya admin yang dapat menyimpan perubahan.',True),no_update,no_update
        try:
            if not snapshot: raise ValueError('Muat ulang formulir sebelum menyimpan.')
            if ctx.triggered_id=='admin-status-confirm':
                if snapshot.get('id') is None: raise ValueError('Pilih lokasi terlebih dahulu.')
                active=0 if snapshot.get('aktif') else 1
                db.set_site_active(snapshot['id'],active,snapshot['expected'],actor(),reason,snapshot['request']+'-status')
                text='Lokasi diaktifkan kembali.' if active else 'Lokasi dinonaktifkan. Data tetap tersimpan di inventaris.'
            else:
                if province=='Jawa Timur' and area not in areas and area!='Tidak diketahui': raise ValueError('Pilih kabupaten/kota yang valid.')
                sid=db.save_site_manual({'nama':name,'alamat':address,'pengelola':owner,'provinsi':province,'wilayah':area if province=='Jawa Timur' else 'Tidak diketahui','lat':lat,'lon':lon},details,actor(),reason,snapshot['request']+'-save',snapshot.get('id'),snapshot.get('expected'))
                text=f'Lokasi #{sid} berhasil disimpan. Peta dan ringkasan akan diperbarui.'
            return message(text),(version or 0)+1,str(uuid.uuid4())
        except ValueError as exc: return message(str(exc),True),no_update,no_update
        except Exception:
            app.logger.exception('Manual SPKLU write failed')
            return message('Penyimpanan gagal. Perubahan dibatalkan; periksa pesan terminal atau koneksi database.',True),no_update,no_update

    @app.callback(Output('admin-hcs-area','value'),Output('admin-hcs-brand','value'),Input('admin-hcs-table','active_cell'),prevent_initial_call=True)
    def select_hcs(cell):
        if not is_admin() or not cell: return no_update,no_update
        try:
            area,brand=json.loads(cell['row_id'])
            return area,brand
        except (ValueError,TypeError,KeyError): return no_update,no_update

    @app.callback(Output('admin-hcs-snapshot','data'),Input('admin-hcs-area','value'),Input('admin-hcs-brand','value'),Input('admin-hcs-reload','n_clicks'),Input('admin-written','data'))
    def hcs_snapshot(area,brand,reload,written):
        if not is_admin() or area not in areas or not str(brand or '').strip(): return None
        brand=' '.join(brand.upper().split())
        try: return {'area':area,'brand':brand,'jumlah':db.hcs_count(area,brand),'request':str(uuid.uuid4())}
        except Exception:
            app.logger.exception('HCS snapshot failed'); return None

    @app.callback(Output('admin-hcs-calculation','children'),Input('admin-hcs-snapshot','data'),Input('admin-hcs-amount','value'),Input('admin-hcs-mode','value'))
    def hcs_preview(snapshot,amount,mode):
        if not snapshot: return 'Pilih wilayah dan kategori kendaraan untuk memuat jumlah saat ini.'
        try:
            amount=db._integer(amount,'Jumlah',1 if mode=='add' else 0)
            total=snapshot['jumlah']+amount if mode=='add' else amount
            return f"Sekarang {snapshot['jumlah']:,} → setelah disimpan {total:,} catatan HCS"
        except ValueError as exc: return str(exc)

    @app.callback(Output('admin-hcs-result','children'),Output('data-version','data',allow_duplicate=True),Output('admin-written','data',allow_duplicate=True),Output('admin-hcs-amount','value'),Output('admin-hcs-reason','value'),
        Input('admin-save-hcs','n_clicks'),State('admin-hcs-snapshot','data'),State('admin-hcs-area','value'),State('admin-hcs-brand','value'),State('admin-hcs-amount','value'),State('admin-hcs-mode','value'),State('admin-hcs-reason','value'),State('data-version','data'),prevent_initial_call=True, running=[(Output('admin-save-hcs','disabled'),True,False)])
    def save_hcs(clicks,snapshot,area,brand,amount,mode,reason,version):
        if not is_admin(): return message('Hanya admin yang dapat menyimpan perubahan.',True),no_update,no_update,no_update,no_update
        try:
            brand=' '.join(str(brand or '').upper().split())
            if not snapshot or area not in areas or snapshot['area']!=area or snapshot['brand']!=brand: raise ValueError('Pilih wilayah/kategori lalu muat ulang nilai terlebih dahulu.')
            total=db.adjust_hcs(area,brand,amount,mode,snapshot['jumlah'],actor(),reason,snapshot['request'])
            return message(f'Berhasil. {area} / {brand}: {total:,} catatan HCS.'),(version or 0)+1,str(uuid.uuid4()),None,''
        except ValueError as exc: return message(str(exc),True),no_update,no_update,no_update,no_update
        except Exception:
            app.logger.exception('Manual HCS write failed')
            return message('Penyimpanan gagal. Perubahan dibatalkan; periksa koneksi database.',True),no_update,no_update,no_update,no_update

    @app.callback(Output('admin-history-detail','children'),Input('admin-history','active_cell'),Input('data-version','data'))
    def history_detail(cell,version):
        if not is_admin(): return ''
        if not cell: return html.P('Pilih salah satu transaksi untuk melihat detail perubahannya.',className='muted')
        try:
            row=next((r for r in db.history() if r['id']==cell.get('row_id')),None)
            if not row: return 'Transaksi tidak ada pada 100 riwayat terbaru.'
            return [html.H3(row['target']),html.P(row['reason']),html.Div([
                html.Div([html.H4('Sebelum'),html.Div(history_snapshot(json.loads(row['before_json'])))]),
                html.Div([html.H4('Sesudah'),html.Div(history_snapshot(json.loads(row['after_json'])))])],className='admin-history-diff')]
        except Exception: return 'Detail riwayat belum dapat dimuat.'

    app.clientside_callback("""function(panel, page) {
        if (!panel || panel.display === 'none' || !page || page.display === 'none') return window.dash_clientside.no_update;
        return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(Date.now()))));
    }""",Output('admin-picker','invalidateSize'),Input('admin-pane-spklu','style'),Input('view-admin','style'))
