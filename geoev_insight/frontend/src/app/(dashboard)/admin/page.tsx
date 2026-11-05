'use client'
import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchHistory, fetchAreas, fetchSpklu, fetchSpkluById, fetchHcs,
  uploadSpklu, uploadHcs, createSpklu, updateSpklu, setSpkluStatus, downloadExport,
  adjustHcs,
} from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import DataTable from '@/components/ui/DataTable'
import {
  Upload, Plus, Trash2, History, FileSpreadsheet,
  PenSquare, Edit2, Download, PlusCircle, SlidersHorizontal,
  MapPin, RotateCcw,
} from 'lucide-react'
import { AREA_CENTERS } from '@/lib/constants'

type Tab = 'spklu-add' | 'spklu-edit' | 'hcs-add' | 'hcs-edit' | 'upload' | 'history'

const inputCls = 'border border-primary-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-300 bg-white/80 w-full text-slate-700 transition-colors'
const labelCls = 'block text-xs font-semibold text-indigo-700/70 uppercase tracking-wide mb-1'

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
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary-400 bg-primary-50/60' : 'border-primary-200/40 hover:border-primary-400/60 hover:bg-primary-50/30'} ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <FileSpreadsheet size={32} className="mx-auto mb-3 text-primary-400" />
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

function HcsAddPanel({ areas }: { areas: string[] }) {
  const qc = useQueryClient()
  const initialArea = areas[0] || 'Kota Surabaya'
  const [area, setArea] = useState(initialArea)
  const defaultCoords = AREA_CENTERS[initialArea] ?? [-7.26, 112.75]
  const [lat, setLat] = useState(String(defaultCoords[0]))
  const [lon, setLon] = useState(String(defaultCoords[1]))
  const [brand, setBrand] = useState('')
  const [amount, setAmount] = useState('1')
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const { data: hcsRes } = useQuery({ queryKey: ['hcs'], queryFn: fetchHcs })
  const allHcs = hcsRes?.data ?? []

  function handleAreaChange(newArea: string) {
    setArea(newArea)
    const coords = AREA_CENTERS[newArea]
    if (coords) {
      setLat(String(coords[0]))
      setLon(String(coords[1]))
    }
  }

  // Check if current area & brand already exists
  const existingRecord = allHcs.find(
    (r) => r.wilayah.toLowerCase() === area.toLowerCase() && r.merk.toUpperCase() === brand.trim().toUpperCase()
  )

  const popularBrands = ['HYUNDAI', 'WULING', 'BYD', 'CHERY', 'MG', 'BMW', 'TESLA', 'TOYOTA', 'KIA']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const b = brand.trim().toUpperCase()
    if (!b) {
      setStatus({ ok: false, msg: 'Merek kendaraan wajib diisi.' })
      return
    }
    const amt = parseInt(amount, 10)
    if (isNaN(amt) || amt <= 0) {
      setStatus({ ok: false, msg: 'Jumlah unit harus berupa angka positif (minimal 1).' })
      return
    }
    const parsedLat = parseFloat(lat)
    const parsedLon = parseFloat(lon)
    if (isNaN(parsedLat) || isNaN(parsedLon)) {
      setStatus({ ok: false, msg: 'Koordinat Latitude dan Longitude harus berupa angka yang valid.' })
      return
    }
    if (!reason.trim()) {
      setStatus({ ok: false, msg: 'Alasan penambahan wajib diisi untuk catatan audit.' })
      return
    }

    setLoading(true)
    setStatus(null)
    try {
      const auditReason = `${reason.trim()} (Koordinat: ${parsedLat.toFixed(5)}, ${parsedLon.toFixed(5)})`
      const res = await adjustHcs({
        area,
        brand: b,
        amount: amt,
        mode: 'add',
        expected_count: existingRecord?.jumlah ?? 0,
        reason: auditReason,
        request_id: crypto.randomUUID(),
      })
      setStatus({
        ok: true,
        msg: `Berhasil menambahkan ${amt} unit untuk ${b} di ${area} [Koordinat: ${parsedLat.toFixed(5)}, ${parsedLon.toFixed(5)}]. Total sekarang: ${fmtNumber(res.new_total ?? res.total)} unit.`,
      })
      setBrand('')
      setAmount('1')
      setReason('')
      qc.invalidateQueries({ queryKey: ['hcs'] })
      qc.invalidateQueries({ queryKey: ['compare'] })
      qc.invalidateQueries({ queryKey: ['history'] })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Gagal menambahkan catatan HCS.'
      setStatus({ ok: false, msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="font-semibold text-gray-800 text-lg">Input Catatan Home Charging Services (HCS)</h3>
        <p className="text-xs text-gray-500 mt-1">
          Tambahkan unit pemasangan Home Charging Services baru ke kabupaten/kota dan merek kendaraan di Jawa Timur beserta titik koordinat wilayah.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Kabupaten / Kota</label>
          <select className={inputCls} value={area} onChange={(e) => handleAreaChange(e.target.value)}>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Titik Koordinat (Latitude & Longitude) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls}>Titik Koordinat Wilayah HCS *</label>
            <button
              type="button"
              onClick={() => {
                const c = AREA_CENTERS[area]
                if (c) {
                  setLat(String(c[0]))
                  setLon(String(c[1]))
                }
              }}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors"
              title="Kembalikan ke koordinat resmi pusat wilayah"
            >
              <RotateCcw size={11} />
              <span>Reset Default Wilayah</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Latitude (Lintang) *</span>
              <input
                type="number"
                step="any"
                placeholder="-7.25"
                className={inputCls}
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                required
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Longitude (Bujur) *</span>
              <input
                type="number"
                step="any"
                placeholder="112.75"
                className={inputCls}
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                required
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5 bg-blue-50/60 p-2 rounded-lg border border-blue-100">
            <MapPin size={13} className="text-blue-600 shrink-0" />
            <span>
              Titik koordinat otomatis terisi posisi pusat <strong>{area}</strong> dan digunakan untuk penandaan marker serta navigasi Google Maps di peta.
            </span>
          </p>
        </div>

        <div>
          <label className={labelCls}>Merek / Model Kendaraan Listrik</label>
          <input
            type="text"
            placeholder="Contoh: HYUNDAI, WULING, BYD..."
            className={inputCls}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {popularBrands.map((pb) => (
              <button
                key={pb}
                type="button"
                onClick={() => setBrand(pb)}
                className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 font-medium transition-colors"
              >
                +{pb}
              </button>
            ))}
          </div>
        </div>

        {/* Existing count helper notification */}
        {brand.trim() && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
            {existingRecord ? (
              <span>
                Catatan tersimpan saat ini: <strong className="text-blue-700">{fmtNumber(existingRecord.jumlah)} unit</strong> untuk {existingRecord.merk} di {area}. Setelah penambahan akan menjadi <strong className="text-emerald-700">{fmtNumber(existingRecord.jumlah + (parseInt(amount, 10) || 0))} unit</strong>.
              </span>
            ) : (
              <span>
                Belum ada data untuk {brand.trim().toUpperCase()} di {area}. Entri baru akan dibuat dengan total awal <strong className="text-emerald-700">{fmtNumber(parseInt(amount, 10) || 0)} unit</strong>.
              </span>
            )}
          </div>
        )}

        <div>
          <label className={labelCls}>Jumlah Catatan Tambahan (Unit)</label>
          <input
            type="number"
            min="1"
            className={inputCls}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls}>Alasan Penambahan / Sumber Data *</label>
          <textarea
            rows={2}
            placeholder="Contoh: Pemasangan baru pelanggan PLN UID Jawa Timur batch survei..."
            className={inputCls}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {status && (
          <div className={`rounded-xl p-4 text-sm ${status.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {status.msg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all shadow-sm hover:shadow disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}
        >
          {loading ? 'Menyimpan Catatan…' : 'Simpan Catatan HCS'}
        </button>
      </form>
    </div>
  )
}

function HcsEditPanel({ areas }: { areas: string[] }) {
  const qc = useQueryClient()
  const { data: hcsRes, isLoading: loadingHcs } = useQuery({ queryKey: ['hcs'], queryFn: fetchHcs })
  const records = hcsRes?.data ?? []

  const [selectedRecord, setSelectedRecord] = useState<{ wilayah: string; merk: string; jumlah: number } | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [newCount, setNewCount] = useState('')
  const [reason, setReason] = useState('')
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // suppress unused warning if areas not directly used
  void areas

  const filteredRecords = records.filter(
    (r) =>
      r.wilayah.toLowerCase().includes(searchQ.toLowerCase()) ||
      r.merk.toLowerCase().includes(searchQ.toLowerCase())
  )

  function handleSelect(r: { wilayah: string; merk: string; jumlah: number }) {
    setSelectedRecord(r)
    setNewCount(String(r.jumlah))
    setReason('')
    setStatus(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRecord) return
    const count = parseInt(newCount, 10)
    if (isNaN(count) || count < 0) {
      setStatus({ ok: false, msg: 'Jumlah unit harus berupa angka non-negatif (>= 0).' })
      return
    }
    if (!reason.trim()) {
      setStatus({ ok: false, msg: 'Alasan koreksi data wajib diisi untuk catatan audit.' })
      return
    }

    setLoading(true)
    setStatus(null)
    try {
      const res = await adjustHcs({
        area: selectedRecord.wilayah,
        brand: selectedRecord.merk,
        amount: count,
        mode: 'set',
        expected_count: selectedRecord.jumlah,
        reason: reason.trim(),
        request_id: crypto.randomUUID(),
      })
      const updatedTotal = res.new_total ?? res.total
      setStatus({
        ok: true,
        msg: `Berhasil memperbarui data HCS ${selectedRecord.merk} (${selectedRecord.wilayah}) menjadi ${fmtNumber(updatedTotal)} unit.`,
      })
      setSelectedRecord({ ...selectedRecord, jumlah: updatedTotal })
      qc.invalidateQueries({ queryKey: ['hcs'] })
      qc.invalidateQueries({ queryKey: ['compare'] })
      qc.invalidateQueries({ queryKey: ['history'] })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Gagal memperbarui catatan HCS.'
      setStatus({ ok: false, msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-800 text-lg">Edit &amp; Koreksi Catatan HCS</h3>
        <p className="text-xs text-gray-500 mt-1">
          Pilih data HCS yang tersimpan di bawah ini untuk mengoreksi atau mengubah total unit terpasang.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Edit Form */}
        <div className="lg:col-span-5 space-y-4">
          {selectedRecord ? (
            <form onSubmit={handleSubmit} className="border border-blue-200/80 bg-blue-50/40 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Item Dipilih</span>
                  <h4 className="font-bold text-slate-800 text-base">{selectedRecord.wilayah}</h4>
                  <p className="text-xs text-slate-500 font-medium">Merek: {selectedRecord.merk}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Jumlah Saat Ini</span>
                  <span className="text-lg font-bold text-slate-800">{fmtNumber(selectedRecord.jumlah)}</span>
                </div>
              </div>

              {/* Info Titik Koordinat Wilayah */}
              <div className="p-2.5 rounded-xl bg-white/80 border border-blue-100/80 text-[11px] flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <MapPin size={12} className="text-blue-600" />
                  Titik Koordinat:
                </span>
                <span className="font-semibold text-slate-700">
                  {AREA_CENTERS[selectedRecord.wilayah]?.[0] ?? '-'}, {AREA_CENTERS[selectedRecord.wilayah]?.[1] ?? '-'}
                </span>
              </div>

              <div>
                <label className={labelCls}>Jumlah Baru (Unit Total)</label>
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  value={newCount}
                  onChange={(e) => setNewCount(e.target.value)}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Isi 0 jika ingin menghapus/menolkan catatan untuk kategori ini.
                </p>
              </div>

              <div>
                <label className={labelCls}>Alasan Koreksi / Sumber Perubahan *</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Koreksi duplikasi data internal PLN ES..."
                  className={inputCls}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              {status && (
                <div className={`rounded-xl p-3.5 text-xs ${status.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {status.msg}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold text-white transition-all shadow-sm disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}
                >
                  {loading ? 'Menyimpan Koreksi…' : 'Simpan Koreksi'}
                </button>
              </div>
            </form>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50">
              <SlidersHorizontal size={28} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-600">Belum ada item yang dipilih</p>
              <p className="text-xs text-slate-400 mt-1">
                Pilih salah satu baris data HCS pada tabel di samping untuk mengubah atau mengoreksi jumlah unitnya.
              </p>
            </div>
          )}
        </div>

        {/* Right: Table of HCS Records */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cari wilayah atau merek HCS..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-xs border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
            />
            {searchQ && (
              <button
                onClick={() => setSearchQ('')}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>

          <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs max-h-[460px] overflow-y-auto">
            {loadingHcs ? (
              <div className="p-8 text-center text-xs text-slate-400">Memuat data HCS…</div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Tidak ada catatan HCS yang sesuai.</div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Wilayah</th>
                    <th className="py-2.5 px-3">Merek Kendaraan</th>
                    <th className="py-2.5 px-3 text-right">Jumlah (Unit)</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((r, idx) => {
                    const isSelected = selectedRecord?.wilayah === r.wilayah && selectedRecord?.merk === r.merk
                    return (
                      <tr
                        key={`${r.wilayah}-${r.merk}-${idx}`}
                        className={`transition-colors ${isSelected ? 'bg-blue-50/80 font-medium' : 'hover:bg-slate-50/60'}`}
                      >
                        <td className="py-2 px-3 text-slate-800">{r.wilayah}</td>
                        <td className="py-2 px-3 text-slate-600">{r.merk}</td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-800">{fmtNumber(r.jumlah)}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleSelect(r)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
                            }`}
                          >
                            {isSelected ? 'Dipilih' : 'Edit'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-[11px] text-slate-400 text-right">
            Menampilkan {filteredRecords.length} dari {records.length} total catatan HCS
          </p>
        </div>
      </div>
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
      qc.invalidateQueries({ queryKey: ['compare'] })
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
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary-400 bg-primary-50/60' : 'border-primary-200/40 hover:border-primary-400/60 hover:bg-primary-50/30'} ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <FileSpreadsheet size={32} className="mx-auto mb-3 text-primary-400" />
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
      setSpkluStatus(selectedId!, {
        active,
        reason: statusReason,
        request_id: crypto.randomUUID(),
        expected: siteDetail?.token || '',
      }),
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
      const details = vals.chargers.map((c, idx) => ({
        kw: parseFloat(c.kw) || 22,
        unit: parseInt(c.unit, 10) || 1,
        connector: parseInt(c.connector, 10) || 1,
        kelompok: String(idx + 1),
      }))
      await updateSpklu(selectedId, {
        nama: vals.nama,
        alamat: vals.alamat,
        pengelola: vals.pengelola,
        provinsi: vals.provinsi,
        wilayah: prov === 'Bali' ? 'Tidak diketahui' : vals.wilayah,
        lat: parseFloat(vals.lat),
        lon: parseFloat(vals.lon),
        details,
        reason: vals.reason,
        request_id: crypto.randomUUID(),
        expected: siteDetail?.token || '',
      })
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
          <div className="bg-primary-50/40 border border-primary-100/50 rounded-xl p-4 space-y-3">
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
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('tab') as Tab | null
      if (p && ['spklu-add', 'spklu-edit', 'hcs-add', 'hcs-edit', 'upload', 'history'].includes(p)) {
        setTab(p)
      }
    }
  }, [isAdmin, router])

  if (!isAdmin) return null

  const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
    { value: 'spklu-add',  label: 'Input SPKLU',  icon: <PenSquare size={15} /> },
    { value: 'spklu-edit', label: 'Edit SPKLU',   icon: <Edit2 size={15} /> },
    { value: 'hcs-add',    label: 'Input HCS',    icon: <PlusCircle size={15} /> },
    { value: 'hcs-edit',   label: 'Edit HCS',     icon: <SlidersHorizontal size={15} /> },
    { value: 'upload',     label: 'Upload Excel', icon: <Upload size={15} /> },
    { value: 'history',    label: 'Riwayat',      icon: <History size={15} /> },
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
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Manajemen Data</h1>
            <p className="text-gray-500 text-sm mt-1">Input, edit, dan kelola inventaris data SPKLU dan catatan Home Charging Services (HCS).</p>
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
      <div className="flex flex-wrap gap-1.5 bg-primary-50/60 rounded-xl p-1.5 w-fit border border-primary-100/40">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${tab === t.value ? 'text-white shadow-brand font-semibold' : 'text-slate-500 hover:text-primary-600 hover:bg-white/40'}`}
            style={tab === t.value ? { background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' } : {}}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="card-glass rounded-2xl p-6">
        {tab === 'spklu-add' && <SpkluAddPanel areas={areas} />}
        {tab === 'spklu-edit' && <SpkluEditPanel areas={areas} />}
        {tab === 'hcs-add' && <HcsAddPanel areas={areas} />}
        {tab === 'hcs-edit' && <HcsEditPanel areas={areas} />}
        {tab === 'upload' && (
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
