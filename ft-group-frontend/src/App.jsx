import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { authApi, clearSession, hasSession } from './api'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'

function ProtectedRoute({ children, user }) {
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSession = async () => {
      if (!hasSession()) {
        setLoading(false)
        return
      }
      try {
        const data = await authApi.me()
        setUser(data.usuario)
      } catch {
        try {
          const refreshed = await authApi.refresh()
          setUser(refreshed.usuario)
        } catch {
          clearSession()
        }
      } finally {
        setLoading(false)
      }
    }
    loadSession()
  }, [])

  const logout = async () => {
    try { await authApi.logout() } catch { clearSession() }
    setUser(null)
  }

  if (loading) return <div className="loading-screen">Cargando FT. GROUP...</div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={setUser} />} />
      <Route path="/registro" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/dashboard" element={
        <ProtectedRoute user={user}><Dashboard user={user} onLogout={logout} /></ProtectedRoute>
      } />
      <Route path="/perfil" element={
        <ProtectedRoute user={user}><Profile user={user} setUser={setUser} onLogout={logout} /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
    </Routes>
  )
}
