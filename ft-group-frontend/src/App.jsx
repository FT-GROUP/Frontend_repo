import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { authApi } from './services/authApi'
import { tokens } from './services/http'
import Layout from './components/Layout'
import { Login, Register } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Groups from './pages/Groups'
import Expenses from './pages/Expenses'
import History from './pages/History'
import Scan from './pages/Scan'
import Profile from './pages/Profile'
import logoUrl from './assets/ft-logo.svg'

function Protected({ user, onLogout, children }) {
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Layout user={user} onLogout={onLogout}>{children}</Layout>
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(authApi.hasSession())

  useEffect(() => {
    if (!authApi.hasSession()) return
    authApi.restore()
      .then(u => setUser(u))
      .catch(() => tokens.clear())
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    await authApi.logout().catch(() => {})
    setUser(null)
  }

  if (loading) return <div className="splash"><img className="brand-mark" src={logoUrl} alt="FT. GROUP" /><span className="spinner" /></div>

  const page = el => <Protected user={user} onLogout={logout}>{el}</Protected>
  const props = { user }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/panel" replace /> : <Login onLogin={setUser} />} />
      <Route path="/registro" element={user ? <Navigate to="/panel" replace /> : <Register />} />
      <Route path="/panel" element={page(<Dashboard {...props} />)} />
      <Route path="/grupos" element={page(<Groups {...props} />)} />
      <Route path="/gastos" element={page(<Expenses {...props} />)} />
      <Route path="/historial" element={page(<History {...props} />)} />
      <Route path="/escanear" element={page(<Scan {...props} />)} />
      <Route path="/perfil" element={page(<Profile user={user} setUser={setUser} onLogout={logout} />)} />
      <Route path="*" element={<Navigate to={user ? '/panel' : '/login'} replace />} />
    </Routes>
  )
}
