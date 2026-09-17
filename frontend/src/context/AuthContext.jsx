import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { adminApi } from '../api/adminApi'
import { TOKEN_KEY } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))

  const login = useCallback(async (password) => {
    const { access_token } = await adminApi.login(password)
    localStorage.setItem(TOKEN_KEY, access_token)
    setToken(access_token)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
  }, [])

  const value = useMemo(() => ({ isAuthed: !!token, login, logout }), [token, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
