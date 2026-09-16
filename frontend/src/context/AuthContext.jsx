import { createContext, useContext, useState, useEffect } from 'react'
import { adminApi } from '../api/adminApi'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token'))
  const [isLoading, setIsLoading] = useState(false)

  const login = async (password) => {
    setIsLoading(true)
    try {
      const data = await adminApi.login(password)
      localStorage.setItem('admin_token', data.access_token)
      setToken(data.access_token)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Login failed' }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    setToken(null)
  }

  const isAuthenticated = Boolean(token)

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
