const CRED_KEY = 'geoev_credentials'
const ADMIN_KEY = 'geoev_is_admin'

export function saveCredentials(username: string, password: string, isAdmin: boolean) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(CRED_KEY, btoa(`${username}:${password}`))
  localStorage.setItem(ADMIN_KEY, isAdmin ? '1' : '0')
}

export function getCredentials(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(CRED_KEY)
}

export function clearCredentials() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(CRED_KEY)
  localStorage.removeItem(ADMIN_KEY)
}

export function getAuthHeader(): Record<string, string> {
  const creds = getCredentials()
  if (!creds) return {}
  return { Authorization: `Basic ${creds}` }
}

export function getStoredAdminFlag(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(ADMIN_KEY) === '1'
}

export function decodeUsername(): string | null {
  const creds = getCredentials()
  if (!creds) return null
  try {
    return atob(creds).split(':')[0]
  } catch {
    return null
  }
}

export function makeBasicHeader(username: string, password: string): string {
  return btoa(`${username}:${password}`)
}

