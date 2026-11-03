'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCompare, fetchAreas } from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import InsightBlock from '@/components/ui/InsightBlock'
import { AlertTriangle } from 'lucide-react'

function CandidateCard({
  rank,
  wilayah,
  hcs,
  spklu,
  rasio,
}: {
  rank: number
  wilayah: string
  hcs: number
  spklu: number
  rasio: number
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex gap-4 items-start">
      <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0">
        {rank}
      </div>
      <div className="flex-1">
        <div className="font-bold text-gray-800 mb-0.5">{wilayah}</div>
        <div className="text-sm text-gray-500">
          {fmtNumber(hcs)} catatan HCS · {fmtNumber(spklu)} SPKLU
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 text-sm font-semibold px-3 py-1 rounded-full">
          <span>Rasio {fmtNumber(rasio, 1)}</span>
        </div>
        <p className="text-xs text-amber-600 mt-2">
          Perlu kajian lanjutan sebelum penambahan SPKLU.
        </p>
      </div>
    </div>
  )
}

export default function KajianPage() {
  const [selectedArea, setSelectedArea] = useState('Semua')

  const { data: compareRes, isLoading } = useQuery({
    queryKey: ['compare', selectedArea],
    queryFn: () => fetchCompare(selectedArea === 'Semua' ? undefined : selectedArea),
    refetchInterval: 60_000,
  })

  const { data: areasRes } = useQuery({
    queryKey: ['areas'],
    queryFn: fetchAreas,
  })

  const rows = compareRes?.data ?? []
  const quality = compareRes?.quality
  const areas = areasRes?.data ?? []

  // Top 5 by ratio
  const candidates = rows
    .filter((r) => r.HCS > 0 && r.SPKLU > 0 && r.Rasio != null)
    .sort((a, b) => {
      const diff = (b.Rasio ?? 0) - (a.Rasio ?? 0)
      if (diff !== 0) return diff
      return b.HCS - a.HCS
    })
    .slice(0, 5)

  // Areas with HCS but no SPKLU
  const noSpklu = rows
    .filter((r) => r.HCS > 0 && r.SPKLU === 0)
    .sort((a, b) => b.HCS - a.HCS)
    .slice(0, 5)

  return (
    <div className="space-y-6 max-w-screen-xl">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-primary-500 uppercase tracking-widest">04</span>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Wilayah yang perlu dikaji untuk SPKLU baru
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Urutan wilayah berdasarkan rasio catatan HCS per titik SPKLU, bukan keputusan
          pembangunan.
        </p>
      </div>

      {/* Area filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Wilayah analisis</label>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value)}
        >
          <option value="Semua">Semua kabupaten / kota</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : !quality?.ready ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          <InsightBlock headline="Data SPKLU dan HCS belum lengkap" />
          <p className="text-sm">
            Unggah data SPKLU Jawa Timur dan catatan HCS untuk membuat daftar wilayah.
          </p>
        </div>
      ) : (
        <>
          {/* Candidate cards */}
          {candidates.length > 0 ? (
            <div>
              <InsightBlock headline="Kabupaten/kota berdasarkan rasio catatan HCS per SPKLU" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidates.map((r, i) => (
                  <CandidateCard
                    key={r.Wilayah}
                    rank={i + 1}
                    wilayah={r.Wilayah}
                    hcs={r.HCS}
                    spklu={r.SPKLU}
                    rasio={r.Rasio ?? 0}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <InsightBlock headline="Data perbandingan belum tersedia" />
              <p className="text-sm text-gray-500">
                Periksa penulisan kabupaten/kota pada kedua file.
              </p>
            </div>
          )}

          {/* Areas without SPKLU */}
          {noSpklu.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-3">
                Kabupaten/kota dengan data SPKLU yang perlu diperiksa
              </h3>
              <ul className="space-y-2">
                {noSpklu.map((r) => (
                  <li key={r.Wilayah} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="font-medium">{r.Wilayah}</span>: {fmtNumber(r.HCS)} catatan
                    HCS, 0 titik SPKLU terpetakan
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-400 mt-3">
                Rasio tidak dihitung karena belum ada titik SPKLU yang berhasil dipetakan pada
                wilayah tersebut.
              </p>
            </div>
          )}

          {quality?.spklu_unmapped ? (
            <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
              <span>
                Sebagian titik SPKLU belum dikenali kabupaten/kotanya; periksa alamat sebelum
                memakai hasil perbandingan.
              </span>
            </div>
          ) : null}
        </>
      )}

      {/* Source & disclaimer */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h3 className="font-semibold text-gray-800">Sumber dan batasan data</h3>
        <div className="text-sm text-gray-600 space-y-1.5">
          <p>Sumber: data SPKLU dan catatan HCS internal PLN ES.</p>
          <p>Data HCS dan perbandingan HCS/SPKLU hanya mencakup Jawa Timur.</p>
          <p>
            Setiap baris HCS yang valid dihitung termasuk UID berulang, sehingga jumlahnya belum
            tentu sama dengan jumlah pelanggan unik.
          </p>
          <p>
            Data penggunaan SPKLU dan kebutuhan pengisian publik belum tersedia, sementara
            kabupaten/kota SPKLU masih bergantung pada penulisan alamat.
          </p>
        </div>
        <h4 className="font-semibold text-gray-700 pt-2">Pemeriksaan sebelum penambahan SPKLU</h4>
        <p className="text-sm text-gray-600">
          Periksa penggunaan SPKLU, akses lokasi, kondisi jaringan listrik, dan kebutuhan pengisian
          publik sebelum menentukan pembangunan.
        </p>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-2">
          <p className="text-sm text-red-700 font-medium">
            ⚠ Rasio tinggi <span className="font-bold">bukan otomatis</span> berarti wilayah tersebut membutuhkan SPKLU baru. Perlu verifikasi lapangan, kajian penggunaan, akses lokasi, dan kondisi jaringan listrik.
          </p>
        </div>
      </div>
    </div>
  )
}

