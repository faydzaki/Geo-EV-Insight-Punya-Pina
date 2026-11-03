'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { saveToken, clearToken, decodeTokenPayload, isTokenExpired } from '@/lib/auth'

interface AuthUser {
  id: number
  username: string
  role: 'super_admin' | 'admin' | 'viewer'
  display_name: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: AuthUser | null
  isAdmin: boolean
  isSuperAdmin: boolean
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    if (!isTokenExpired()) {
      const payload = decodeTokenPayload()
      if (payload) {
        setUser({
          id: payload.uid ?? Number(payload.sub),
          username: payload.username,
          role: payload.role,
          display_name: payload.display_name,
        })
      }
    }
  }, [])

  function login(token: string) {
    saveToken(token)
    const payload = decodeTokenPayload()
    if (payload) {
      setUser({
        id: payload.uid ?? Number(payload.sub),
        username: payload.username,
        role: payload.role,
        display_name: payload.display_name,
      })
    }
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  const isAuthenticated = user !== null
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isSuperAdmin = user?.role === 'super_admin'

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isAdmin, isSuperAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
