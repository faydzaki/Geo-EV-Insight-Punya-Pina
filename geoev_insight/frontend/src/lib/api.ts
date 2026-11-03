import axios from 'axios'
import { getAuthHeader } from './auth'
import type {
  SpkluFilters,
  SpkluListResponse,
  HcsResponse,
  CompareResponse,
  QualityResponse,
  Spklu,
  ChargerDetail,
} from '@/types'

const BASE = '/api'

function headers() {
  return { ...getAuthHeader() }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function loginApi(username: string, password: string): Promise<{ token: string }> {
  const res = await axios.post(`${BASE}/auth/login`, { username, password })
  return res.data
}

export async function fetchMe(): Promise<{ id: number; username: string; role: string; display_name: string }> {
  const res = await axios.get(`${BASE}/auth/me`, { headers: headers() })
  return res.data
}

export async function changePassword(old_password: string, new_password: string): Promise<void> {
  await axios.post(`${BASE}/auth/change-password`, { old_password, new_password }, { headers: headers() })
}

// ─── Users (super_admin) ─────────────────────────────────────────────────────

export interface UserRecord {
  id: number
  username: string
  role: 'super_admin' | 'admin' | 'viewer'
  display_name: string | null
  active: 0 | 1
  created_at: string
}

export async function fetchUsers(): Promise<{ data: UserRecord[] }> {
  const res = await axios.get(`${BASE}/users`, { headers: headers() })
  return res.data
}

export async function createUser(payload: {
  username: string
  password: string
  role: string
  display_name?: string
}): Promise<{ id: number }> {
  const res = await axios.post(`${BASE}/users`, payload, { headers: headers() })
  return res.data
}

export async function updateUser(
  id: number,
  payload: { role?: string; display_name?: string; active?: 0 | 1; password?: string }
): Promise<void> {
  await axios.put(`${BASE}/users/${id}`, payload, { headers: headers() })
}

export async function deleteUser(id: number): Promise<void> {
  await axios.delete(`${BASE}/users/${id}`, { headers: headers() })
}

// ─── Data reads ────────────────────────────────────────────────────────────

export async function fetchSpklu(filters: SpkluFilters = {}): Promise<SpkluListResponse> {
  const params: Record<string, string> = {}
  if (filters.prov && filters.prov !== 'Semua') params.prov = filters.prov
  if (filters.owner && filters.owner !== 'Semua') params.owner = filters.owner
  if (filters.area && filters.area !== 'Semua') params.area = filters.area
  if (filters.power && filters.power !== 'all') params.power = filters.power
  if (filters.search?.trim()) params.search = filters.search.trim()
  const res = await axios.get(`${BASE}/spklu`, { headers: headers(), params })
  return res.data
}

export async function fetchSpkluById(id: number): Promise<Spklu & { token: string }> {
  const res = await axios.get(`${BASE}/spklu/${id}`, { headers: headers() })
  return res.data
}

export async function fetchHcs(): Promise<HcsResponse> {
  const res = await axios.get(`${BASE}/hcs`, { headers: headers() })
  return res.data
}

export async function fetchMetadata(): Promise<Record<string, string>> {
  const res = await axios.get(`${BASE}/metadata`, { headers: headers() })
  return res.data
}

export async function fetchCompare(area?: string): Promise<CompareResponse> {
  const params: Record<string, string> = {}
  if (area && area !== 'Semua') params.area = area
  const res = await axios.get(`${BASE}/compare`, { headers: headers(), params })
  return res.data
}

export async function fetchQuality(): Promise<QualityResponse> {
  const res = await axios.get(`${BASE}/quality`, { headers: headers() })
  return res.data
}

export async function fetchHistory(): Promise<{ data: Record<string, unknown>[] }> {
  const res = await axios.get(`${BASE}/history`, { headers: headers() })
  return res.data
}

export async function fetchAreas(): Promise<{ data: string[] }> {
  const res = await axios.get(`${BASE}/areas`, { headers: headers() })
  return res.data
}

// ─── Admin writes ───────────────────────────────────────────────────────────

export async function createSpklu(payload: {
  nama: string
  alamat: string
  pengelola: string
  provinsi: string
  wilayah: string
  lat: number
  lon: number
  details: ChargerDetail[]
  reason: string
  request_id: string
}): Promise<{ id: number }> {
  const res = await axios.post(`${BASE}/spklu`, payload, { headers: headers() })
  return res.data
}

export async function updateSpklu(
  id: number,
  payload: {
    nama: string
    alamat: string
    pengelola: string
    provinsi: string
    wilayah: string
    lat: number
    lon: number
    details: ChargerDetail[]
    reason: string
    request_id: string
    expected: string
  }
): Promise<{ id: number }> {
  const res = await axios.put(`${BASE}/spklu/${id}`, payload, { headers: headers() })
  return res.data
}

export async function setSpkluStatus(
  id: number,
  payload: { active: 0 | 1; reason: string; request_id: string; expected: string }
): Promise<void> {
  await axios.patch(`${BASE}/spklu/${id}/status`, payload, { headers: headers() })
}

export async function adjustHcs(payload: {
  area: string
  brand: string
  amount: number
  mode: 'add' | 'set'
  expected_count: number
  reason: string
  request_id: string
}): Promise<{ total: number }> {
  const res = await axios.post(`${BASE}/hcs/adjust`, payload, { headers: headers() })
  return res.data
}

export async function uploadSpklu(file: File): Promise<{ message: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await axios.post(`${BASE}/upload/spklu`, form, {
    headers: { ...headers(), 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function uploadHcs(file: File, mode: 'replace' | 'add'): Promise<{ message: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('mode', mode)
  const res = await axios.post(`${BASE}/upload/hcs`, form, {
    headers: { ...headers(), 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

// ─── Export ──────────────────────────────────────────────────────────────────

export async function downloadExport(url: string, filename: string): Promise<void> {
  const res = await axios.get(url, { headers: headers(), responseType: 'blob' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(res.data)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
