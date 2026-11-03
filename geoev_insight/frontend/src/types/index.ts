export interface Spklu {
  id: number
  nama: string
  alamat: string
  pengelola: 'PLN' | 'Non-PLN' | 'Tidak diketahui'
  provinsi: string
  wilayah: string
  lat: number
  lon: number
  daya: number
  unit: number
  connector: number
  rincian: ChargerDetail[]
  aktif?: number
  token?: string
}

export interface ChargerDetail {
  kw: number
  unit: number
  connector: number
  kelompok: string
}

export interface HcsRecord {
  wilayah: string
  merk: string
  jumlah: number
}

export interface CompareRow {
  Wilayah: string
  HCS: number
  SPKLU: number
  Rasio: number | null
  Status: string
}

export interface DataQuality {
  spklu_jatim: number
  spklu_unmapped: number
  hcs_total: number
  ready: boolean
}

export interface QualityIssue {
  nama: string
  provinsi: string
  alamat: string
  masalah: string
}

export interface ChangeLog {
  id: number
  waktu: string
  actor: string
  dataset: string
  action: string
  target: string
  reason: string
  before_json: string
  after_json: string
}

export interface SpkluFilters {
  prov?: string
  owner?: string
  area?: string
  power?: string
  search?: string
}

export interface SpkluListResponse {
  data: Spklu[]
  total: number
  updated: string
}

export interface HcsResponse {
  data: HcsRecord[]
  total_records: number
  updated: string
}

export interface CompareResponse {
  data: CompareRow[]
  quality: DataQuality
}

export interface QualityResponse {
  issues: QualityIssue[]
  kpis: {
    issues_count: number
    unmapped_jatim: number
    hcs_area_count: number
  }
}

