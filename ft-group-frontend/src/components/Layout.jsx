import { NavLink } from 'react-router-dom'

export default function Layout({ user, children, onLogout }) {
  const initial = user?.nombre?.charAt(0)?.toUpperCase() || 'U'
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">FT.<span>GROUP</span></div>
        <nav className="nav">
          <NavLink to="/dashboard">📊 Dashboard</NavLink>
          <NavLink to="/perfil">👤 Mi perfil</NavLink>
        </nav>
        <div className="sidebar-bottom">
          <button className="btn" onClick={onLogout}>↪ Cerrar sesión</button>
        </div>
      </aside>
      <section className="main">
        <header className="topbar">
          <strong>Gestión de gastos compartidos</strong>
          <div className="user-chip">
            <span>{user?.nombre}</span>
            <div className="avatar">{initial}</div>
          </div>
        </header>
        {children}
      </section>
    </div>
  )
}
