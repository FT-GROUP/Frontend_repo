import Layout from '../components/Layout'
import MapView from '../components/MapView'

export default function Dashboard({ user, onLogout }) {
  return <Layout user={user} onLogout={onLogout}>
    <main className="content">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Resumen general de tu gestión en FT. GROUP.</p>
      <div className="cards">
        <div className="stat-card"><div className="stat-label">USUARIO</div><div className="stat-value">Activo</div></div>
        <div className="stat-card"><div className="stat-label">GRUPOS</div><div className="stat-value">3</div></div>
        <div className="stat-card"><div className="stat-label">GASTOS</div><div className="stat-value">$850K</div></div>
        <div className="stat-card"><div className="stat-label">PENDIENTES</div><div className="stat-value">4</div></div>
      </div>
      <div className="dashboard-grid">
        <section className="panel"><h2>Mapa de actividades</h2><MapView /></section>
        <section className="panel">
          <h2>Actividad reciente</h2>
          <div className="quick-list">
            <div className="quick-item"><span>Restaurante del grupo</span><span className="badge">Registrado</span></div>
            <div className="quick-item"><span>Transporte</span><span className="badge">Pagado</span></div>
            <div className="quick-item"><span>Compra compartida</span><span className="badge">Pendiente</span></div>
            <div className="quick-item"><span>Servicio del hogar</span><span className="badge">Registrado</span></div>
          </div>
          <p className="muted" style={{marginTop:18}}>Sesión iniciada como <strong>{user.email}</strong>.</p>
        </section>
      </div>
    </main>
  </Layout>
}
