'use client'
import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchHistory, fetchAreas, fetchSpklu, fetchSpkluById,
  uploadSpklu, uploadHcs, createSpklu, updateSpklu, setSpkluStatus, downloadExport,
} from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import DataTable from '@/components/ui/DataTable'
import { Upload, Plus, Trash2, History, FileSpreadsheet, PenSquare, Edit2, Download } from 'lucide-react'

type Tab = 'spklu-add' | 'spklu-edit' | 'hcs-upload' | 'history'

const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full'
const labelCls = 'block text-xs text-gray-500 font-medium mb-1'

// ─── Upload panels ────────────────────────────────────────────────────────────
function UploadSpkluPanel() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setUploading(true); setStatus(null)
    try {
      const res = await uploadSpklu(file)
      setStatus({ ok: true, msg: res.message })
      qc.invalidateQueries({ queryKey: ['spklu'] })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Gagal mengunggah file.'
      setStatus({ ok: false, msg })
    } finally { setUploading(false) }
  }, [qc])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    multiple: false, disabled: uploading,
  })

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Data SPKLU Jawa Timur dan Bali</h3>
      <p className="text-xs text-gray-500">Kolom ID opsional: isi untuk edit, kosongkan untuk lokasi baru. Upload file yang sama tidak menambah duplikat.</p>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'} ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <FileSpreadsheet size={32} className="mx-auto mb-3 text-gray-400" />
        <div className="font-medium text-gray-700">
          {uploading ? 'Mengunggah…' : isDragActive ? 'Lepaskan file di sini' : 'Pilih atau tarik file SPKLU (.xlsx)'}
        </div>
        <div className="text-xs text-gray-400 mt-1">Maksimal 20 MB</div>
      </div>
      {status && (
        <div className={`rounded-lg p-4 text-sm ${status.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {status.msg}
        </div>
      )}
    </div>
  )
}

function UploadHcsPanel() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'replace' | 'add'>('replace')
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setUploading(true); setStatus(null)
    try {
      const res = await uploadHcs(file, mode)
      setStatus({ ok: true, msg: res.message })
      qc.invalidateQueries({ queryKey: ['hcs'] })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Gagal mengunggah file.'
      setStatus({ ok: false, msg })
    } finally { setUploading(false) }
  }, [qc, mode])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    multiple: false, disabled: uploading,
  })

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800">Data catatan HCS Jawa Timur</h3>
      <p className="text-xs text-gray-500">Data disimpan sebagai jumlah catatan HCS per kabupaten/kota dan merek kendaraan.</p>
      <div className="flex gap-4 text-sm">
        {(['replace', 'add'] as const).map((m) => (
          <label key={m} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="hcs-mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="accent-primary-500" />
            <span>{m === 'replace' ? 'Ganti seluruh agregat HCS' : 'Tambahkan ke agregat sekarang'}</span>
          </label>
        ))}
      </div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'} ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <FileSpreadsheet size={32} className="mx-auto mb-3 text-gray-400" />
        <div className="font-medium text-gray-700">
          {uploading ? 'Mengunggah…' : isDragActive ? 'Lepaskan file di sini' : 'Pilih atau tarik file HCS (.xlsx)'}
        </div>
        <div className="text-xs text-gray-400 mt-1">Maksimal 20 MB</div>
      </div>
      {status && (
        <div className={`rounded-lg p-4 text-sm ${status.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {status.msg}
        </div>
      )}
    </div>
  )
}

// ─── SPKLU Form types ─────────────────────────────────────────────────────────
type SpkluFormValues = {
  nama: string
  pengelola: string
  provinsi: string
  wilayah: string
  alamat: string
  lat: string
  lon: string
  reason: string
  chargers: { kw: string; unit: string; connector: string }[]
}

// ─── Add Panel ────────────────────────────────────────────────────────────────
function SpkluAddPanel({ areas }: { areas: string[] }) {
  const qc = useQueryClient()
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<SpkluFormValues>({
    defaultValues: { pengelola: 'PLN', provinsi: 'Jawa Timur', wilayah: 'Tidak diketahui', chargers: [{ kw: '22', unit: '1', connector: '1' }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'chargers' })
  const prov = watch('provinsi')

  async function onSubmit(vals: SpkluFormValues) {
    setResult(null)
    try {
      const details = vals.chargers.map((c) => ({ kw: parseFloat(c.kw), unit: parseInt(c.unit), connector: parseInt(c.connector), kelompok: '1' }))
      const res = await createSpklu({ nama: vals.nama, alamat: vals.alamat, pengelola: vals.pengelola, provinsi: vals.provinsi, wilayah: prov === 'Bali' ? 'Tidak diketahui' : vals.wilayah, lat: parseFloat(vals.lat), lon: parseFloat(vals.lon), details, reason: vals.reason, request_id: crypto.randomUUID() })
      setResult({ ok: true, msg: `Lokasi #${res.id} berhasil disimpan.` })
      qc.invalidateQueries({ queryKey: ['spklu'] })
      reset()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Penyimpanan gagal.'
      setResult({ ok: false, msg })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-2xl">
      <h3 className="font-semibold text-gray-800">Input SPKLU langsung</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Nama SPKLU *</label>
          <input {...register('nama', { required: true })} className={inputCls} placeholder="Contoh: SPKLU Rest Area Km 57" />
          {errors.nama && <p className="text-red-500 text-xs mt-1">Nama wajib diisi</p>}
        </div>
        <div>
          <label className={labelCls}>Pengelola</label>
          <select {...register('pengelola')} className={inputCls}>
            <option>PLN</option><option>Non-PLN</option><option>Tidak diketahui</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Provinsi</label>
          <select {...register('provinsi')} className={inputCls}>
            <option>Jawa Timur</option><option>Bali</option>
          </select>
        </div>
        {prov === 'Jawa Timur' && (
          <div className="col-span-2">
            <label className={labelCls}>Kabupaten / kota</label>
            <select {...register('wilayah')} className={inputCls}>
              <option value="Tidak diketahui">Tidak diketahui</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}
        <div className="col-span-2">
          <label className={labelCls}>Alamat lengkap *</label>
          <textarea {...register('alamat', { required: true })} className={inputCls} rows={2} placeholder="Jalan, kecamatan, kabupaten/kota…" />
        </div>
        <div>
          <label className={labelCls}>Latitude *</label>
          <input {...register('lat', { required: true })} className={inputCls} placeholder="-7.25" type="number" step="any" />
        </div>
        <div>
          <label className={labelCls}>Longitude *</label>
          <input {...register('lon', { required: true })} className={inputCls} placeholder="112.75" type="number" step="any" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Rincian charger</span>
          <button type="button" onClick={() => append({ kw: '22', unit: '1', connector: '1' })} className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
            <Plus size={14} /> Tambah kelompok
          </button>
        </div>
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="flex gap-3 items-center">
              <div className="flex-1"><label className={labelCls}>Daya / unit (kW)</label><input {...register(`chargers.${i}.kw`)} className={inputCls} type="number" step="any" min="0" /></div>
              <div className="flex-1"><label className={labelCls}>Unit charger</label><input {...register(`chargers.${i}.unit`)} className={inputCls} type="number" min="1" /></div>
              <div className="flex-1"><label className={labelCls}>Konektor</label><input {...register(`chargers.${i}.connector`)} className={inputCls} type="number" min="0" /></div>
              {fields.length > 1 && (<button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 mt-5"><Trash2 size={16} /></button>)}
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>Alasan / sumber perubahan *</label>
        <textarea {...register('reason', { required: true })} className={inputCls} rows={2} placeholder="Contoh: penambahan lokasi hasil verifikasi lapangan" />
        {errors.reason && <p className="text-red-500 text-xs mt-1">Alasan wajib diisi</p>}
      </div>
      {result && <div className={`rounded-lg p-4 text-sm ${result.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>{result.msg}</div>}
      <button type="submit" disabled={isSubmitting} className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm">
        {isSubmitting ? 'Menyimpan…' : 'Simpan lokasi'}
      </button>
    </form>
  )
}

// ─── Edit Panel ───────────────────────────────────────────────────────────────
function SpkluEditPanel({ areas }: { areas: string[] }) {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [statusReason, setStatusReason] = useState('')

  const { data: spkluRes } = useQuery({ queryKey: ['spklu-all'], queryFn: () => fetchSpklu({}) })
  const allSites = spkluRes?.data ?? []
  const filteredSites = allSites
    .filter(s => s.nama.toLowerCase().includes(searchQ.toLowerCase()) || String(s.id).includes(searchQ))
    .slice(0, 20)

  const { data: siteDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['spklu-detail', selectedId],
    queryFn: () => fetchSpkluById(selectedId!),
    enabled: selectedId !== null,
  })

  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<SpkluFormValues>({
    defaultValues: { pengelola: 'PLN', provinsi: 'Jawa Timur', wilayah: 'Tidak diketahui', chargers: [{ kw: '22', unit: '1', connector: '1' }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'chargers' })
  const prov = watch('provinsi')
  const currentVals = watch()

  useEffect(() => {
    if (siteDetail) {
      const chargers = siteDetail.rincian?.length > 0
        ? siteDetail.rincian.map(r => ({ kw: String(r.kw), unit: String(r.unit), connector: String(r.connector) }))
        : [{ kw: '22', unit: '1', connector: '1' }]
      reset({ nama: siteDetail.nama, pengelola: siteDetail.pengelola, provinsi: siteDetail.provinsi, wilayah: siteDetail.wilayah, alamat: siteDetail.alamat ?? '', lat: String(siteDetail.lat), lon: String(siteDetail.lon), reason: '', chargers })
    }
  }, [siteDetail, reset])

  const statusMut = useMutation({
    mutationFn: ({ active }: { active: 0 | 1 }) =>
      setSpkluStatus(selectedId!, { active, reason: statusReason, request_id: crypto.randomUUID(), expected: String(siteDetail?.active ?? 1) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spklu'] })
      qc.invalidateQueries({ queryKey: ['spklu-all'] })
      qc.invalidateQueries({ queryKey: ['spklu-detail', selectedId] })
      setResult({ ok: true, msg: 'Status berhasil diubah.' })
      setStatusReason('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Gagal mengubah status.'
      setResult({ ok: false, msg })
    },
  })

  async function onSubmit(vals: SpkluFormValues) {
    if (!selectedId || !siteDetail) return
    setResult(null)
    try {
      const details = vals.chargers.map((c) => ({ kw: parseFloat(c.kw), unit: parseInt(c.unit), connector: parseInt(c.connector), kelompok: '1' }))
      await updateSpklu(selectedId, { nama: vals.nama, alamat: vals.alamat, pengelola: vals.pengelola, provinsi: vals.provinsi, wilayah: prov === 'Bali' ? 'Tidak diketahui' : vals.wilayah, lat: parseFloat(vals.lat), lon: parseFloat(vals.lon), details, reason: vals.reason, request_id: crypto.randomUUID(), expected: siteDetail.nama })
      setResult({ ok: true, msg: `SPKLU #${selectedId} berhasil diperbarui.` })
      qc.invalidateQueries({ queryKey: ['spklu'] })
      qc.invalidateQueries({ queryKey: ['spklu-all'] })
      qc.invalidateQueries({ queryKey: ['spklu-detail', selectedId] })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Pembaruan gagal.'
      setResult({ ok: false, msg })
    }
  }

  // suppress unused warning
  void currentVals
  void setValue

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="font-semibold text-gray-800">Edit SPKLU yang Ada</h3>

      {/* Search */}
      <div className="space-y-2">
        <label className={labelCls}>Cari dan pilih SPKLU</label>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} className={inputCls} placeholder="Ketik nama atau ID SPKLU…" />
        {searchQ && (
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto shadow-sm">
            {filteredSites.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">Tidak ditemukan.</div>
            ) : (
              filteredSites.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setSelectedId(s.id); setSearchQ(''); setResult(null) }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <span className="font-medium text-gray-800">{s.nama}</span>
                  <span className="text-gray-400 text-xs ml-2">#{s.id} · {s.wilayah}</span>
                </button>
              ))
            )}
          </div>
        )}
        {selectedId && siteDetail && (
          <div className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-lg px-4 py-2.5">
            <span className="text-sm font-medium text-primary-800">{siteDetail.nama}</span>
            <span className="text-xs text-primary-500">#{siteDetail.id}</span>
            <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${siteDetail.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {siteDetail.active ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
        )}
      </div>

      {loadingDetail && <div className="text-sm text-gray-400">Memuat detail SPKLU…</div>}

      {selectedId && siteDetail && (
        <>
          {/* Status toggle */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Toggle status SPKLU</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${siteDetail.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {siteDetail.active ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <div>
              <label className={labelCls}>Alasan perubahan status *</label>
              <input value={statusReason} onChange={e => setStatusReason(e.target.value)} className={inputCls} placeholder="Contoh: SPKLU sedang dalam perbaikan" />
            </div>
            <button
              type="button"
              disabled={statusMut.isPending || !statusReason.trim()}
              onClick={() => statusMut.mutate({ active: siteDetail.active ? 0 : 1 })}
              className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${siteDetail.active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
            >
              {statusMut.isPending ? 'Mengubah…' : siteDetail.active ? 'Nonaktifkan SPKLU' : 'Aktifkan SPKLU'}
            </button>
          </div>

          {/* Edit form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <h4 className="font-semibold text-gray-700 text-sm border-t border-gray-200 pt-4">Perbarui data SPKLU</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>Nama SPKLU *</label>
                <input {...register('nama', { required: true })} className={inputCls} />
                {errors.nama && <p className="text-red-500 text-xs mt-1">Nama wajib diisi</p>}
              </div>
              <div>
                <label className={labelCls}>Pengelola</label>
                <select {...register('pengelola')} className={inputCls}>
                  <option>PLN</option><option>Non-PLN</option><option>Tidak diketahui</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Provinsi</label>
                <select {...register('provinsi')} className={inputCls}>
                  <option>Jawa Timur</option><option>Bali</option>
                </select>
              </div>
              {prov === 'Jawa Timur' && (
                <div className="col-span-2">
                  <label className={labelCls}>Kabupaten / kota</label>
                  <select {...register('wilayah')} className={inputCls}>
                    <option value="Tidak diketahui">Tidak diketahui</option>
                    {areas.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              )}
              <div className="col-span-2">
                <label className={labelCls}>Alamat</label>
                <textarea {...register('alamat')} className={inputCls} rows={2} />
              </div>
              <div>
                <label className={labelCls}>Latitude *</label>
                <input {...register('lat', { required: true })} className={inputCls} type="number" step="any" />
              </div>
              <div>
                <label className={labelCls}>Longitude *</label>
                <input {...register('lon', { required: true })} className={inputCls} type="number" step="any" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Rincian charger</span>
                <button type="button" onClick={() => append({ kw: '22', unit: '1', connector: '1' })} className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
                  <Plus size={14} /> Tambah kelompok
                </button>
              </div>
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div key={field.id} className="flex gap-3 items-center">
                    <div className="flex-1"><label className={labelCls}>Daya (kW)</label><input {...register(`chargers.${i}.kw`)} className={inputCls} type="number" step="any" min="0" /></div>
                    <div className="flex-1"><label className={labelCls}>Unit</label><input {...register(`chargers.${i}.unit`)} className={inputCls} type="number" min="1" /></div>
                    <div className="flex-1"><label className={labelCls}>Konektor</label><input {...register(`chargers.${i}.connector`)} className={inputCls} type="number" min="0" /></div>
                    {fields.length > 1 && <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 mt-5"><Trash2 size={16} /></button>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Alasan perubahan *</label>
              <textarea {...register('reason', { required: true })} className={inputCls} rows={2} placeholder="Alasan edit data ini" />
              {errors.reason && <p className="text-red-500 text-xs mt-1">Alasan wajib diisi</p>}
            </div>
            {result && <div className={`rounded-lg p-4 text-sm ${result.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>{result.msg}</div>}
            <button type="submit" disabled={isSubmitting} className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm">
              {isSubmitting ? 'Menyimpan…' : 'Simpan perubahan'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

// ─── History panel ───────────────────────────────────────────────────────────
function HistoryPanel() {
  const { data } = useQuery({ queryKey: ['history'], queryFn: fetchHistory })
  const rows = (data?.data ?? []).map((r) => ({
    waktu: String(r.waktu ?? ''),
    actor: String(r.actor ?? ''),
    dataset: String(r.dataset ?? ''),
    action: String(r.action ?? ''),
    target: String(r.target ?? ''),
    reason: String(r.reason ?? ''),
  }))

  return (
    <div>
      <h3 className="font-semibold text-gray-800 mb-1">Jejak perubahan</h3>
      <p className="text-xs text-gray-500 mb-4">100 transaksi terbaru.</p>
      <DataTable
        data={rows as unknown as Record<string, unknown>[]}
        columns={[
          { key: 'waktu', label: 'Waktu (WIB)' },
          { key: 'actor', label: 'Akun' },
          { key: 'dataset', label: 'Data' },
          { key: 'action', label: 'Tindakan' },
          { key: 'target', label: 'Target' },
          { key: 'reason', label: 'Alasan' },
        ]}
        pageSize={12}
      />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('spklu-add')
  const [exporting, setExporting] = useState(false)

  const { data: areasRes } = useQuery({ queryKey: ['areas'], queryFn: fetchAreas })
  const areas = areasRes?.data ?? []

  useEffect(() => {
    if (!isAdmin) router.replace('/peta')
  }, [isAdmin, router])

  if (!isAdmin) return null

  const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
    { value: 'spklu-add', label: 'Input SPKLU', icon: <PenSquare size={15} /> },
    { value: 'spklu-edit', label: 'Edit SPKLU', icon: <Edit2 size={15} /> },
    { value: 'hcs-upload', label: 'Upload Excel', icon: <Upload size={15} /> },
    { value: 'history', label: 'Riwayat', icon: <History size={15} /> },
  ]

  async function handleExport(type: 'xlsx' | 'csv') {
    setExporting(true)
    try {
      await downloadExport(
        type === 'xlsx' ? '/api/export/spklu' : '/api/export/spklu.csv',
        type === 'xlsx' ? 'spklu-export.xlsx' : 'spklu-export.csv'
      )
    } finally { setExporting(false) }
  }

  return (
    <div className="space-y-6 max-w-screen-xl">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-primary-500 uppercase tracking-widest">DATA WORKSPACE</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Manajemen Data SPKLU</h1>
            <p className="text-gray-500 text-sm mt-1">Input, edit, dan kelola data SPKLU dan HCS.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('xlsx')}
              disabled={exporting}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              Export Excel
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              Export CSV
            </button>
            <span className="bg-primary-100 text-primary-700 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
              Akses Admin
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.value ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {tab === 'spklu-add' && <SpkluAddPanel areas={areas} />}
        {tab === 'spklu-edit' && <SpkluEditPanel areas={areas} />}
        {tab === 'hcs-upload' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <UploadSpkluPanel />
            <UploadHcsPanel />
          </div>
        )}
        {tab === 'history' && <HistoryPanel />}
      </div>

      <p className="text-xs text-gray-400">
        Penggunaan hosting untuk data PLN ES memerlukan persetujuan perusahaan dan pengamanan akses.
      </p>
    </div>
  )
}
