import { useState } from 'react'
import Layout from '../components/Layout'
import { authApi } from '../api'

export default function Profile({ user, setUser, onLogout }) {
  const [nombre, setNombre] = useState(user.nombre || '')
  const [telefono, setTelefono] = useState(user.telefono || '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async e => {
    e.preventDefault(); setMessage(''); setError(''); setSaving(true)
    try {
      const data = await authApi.updateProfile({ nombre, telefono: telefono || null })
      setUser(data.usuario); setMessage('Perfil actualizado correctamente.')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const deactivate = async () => {
    if (!confirm('¿Seguro que deseas desactivar tu cuenta?')) return
    try {
      const data = await authApi.toggleAccount(false)
      setUser(data.usuario); setMessage('Cuenta desactivada.')
    } catch (err) { setError(err.message) }
  }

  return <Layout user={user} onLogout={onLogout}>
    <main className="content">
      <h1 className="page-title">Mi perfil</h1>
      <p className="page-subtitle">Consulta y actualiza tus datos personales.</p>
      <div className="profile-grid">
        <section className="panel">
          <h2>Información personal</h2>
          {message && <div className="alert" style={{background:'#ecfdf5',color:'#166534'}}>{message}</div>}
          {error && <div className="alert">{error}</div>}
          <form className="form" onSubmit={save}>
            <div className="field"><label>Nombre</label><input value={nombre} onChange={e=>setNombre(e.target.value)} required /></div>
            <div className="field"><label>Correo</label><input value={user.email} disabled /></div>
            <div className="field"><label>Teléfono</label><input value={telefono} onChange={e=>setTelefono(e.target.value)} /></div>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          </form>
        </section>
        <section className="panel">
          <h2>Cuenta</h2>
          <p><strong>Estado:</strong> {user.activo ? 'Activa' : 'Inactiva'}</p>
          <p className="muted">La desactivación utiliza el mecanismo de soft-delete implementado en el backend.</p>
          {user.activo && <button className="btn btn-danger" onClick={deactivate}>Desactivar cuenta</button>}
        </section>
      </div>
    </main>
  </Layout>
}
