'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  saveCredentials,
  clearCredentials,
  getCredentials,
  getStoredAdminFlag,
  decodeUsername,
} from '@/lib/auth'

interface AuthContextType {
  isAuthenticated: boolean
  isAdmin: boolean
  username: string | null
  login: (username: string, password: string, isAdmin: boolean) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    const creds = getCredentials()
    if (creds) {
      const uname = decodeUsername()
      setIsAuthenticated(true)
      setUsername(uname)
      setIsAdmin(getStoredAdminFlag())
    }
  }, [])

  function login(uname: string, password: string, adminFlag: boolean) {
    saveCredentials(uname, password, adminFlag)
    setIsAuthenticated(true)
    setIsAdmin(adminFlag)
    setUsername(uname)
  }

  function logout() {
    clearCredentials()
    setIsAuthenticated(false)
    setIsAdmin(false)
    setUsername(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

