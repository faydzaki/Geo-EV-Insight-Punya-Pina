const JWT_KEY = 'geoev_jwt'

export function saveToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(JWT_KEY, token)
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(JWT_KEY)
}

export function clearToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(JWT_KEY)
}

export function getAuthHeader(): Record<string, string> {
  const token = getToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export function decodeTokenPayload(): {
  sub: string
  uid?: number
  username: string
  role: 'super_admin' | 'admin' | 'viewer'
  display_name: string
  exp: number
} | null {
  const token = getToken()
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(padded))
    return payload
  } catch {
    return null
  }
}

export function isTokenExpired(): boolean {
  const payload = decodeTokenPayload()
  if (!payload) return true
  return Date.now() / 1000 > payload.exp
}
