import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api.js'
const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [csrf, setCsrf] = useState(null); const [loading, setLoading] = useState(true)
  useEffect(() => { api.me().then((data) => { setUser(data.user); setCsrf(data.csrfToken) }).catch(() => {}).finally(() => setLoading(false)) }, [])
  const value = useMemo(() => ({ user, csrf, loading, login: async (body) => { const data = await api.login(body); setUser(data.user); setCsrf(data.csrfToken); return data.user }, logout: async () => { await api.logout(csrf); setUser(null); setCsrf(null) }, register: api.register, verify: api.verify }), [user, csrf, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
