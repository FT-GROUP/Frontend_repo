import { useState } from 'react'
import { authApi } from '../services/authApi'
import { financeApi, financeMode } from '../services/financeApi'
import { Alert, Avatar, PageHeader } from '../components/ui'
import Icon from '../components/Icon'

export default function Profile({ user, setUser, onLogout }) {
  const [form, setForm] = useState({ nombre: user.nombre || '', telefono: user.telefono || '' })
  const [msg, setMsg] = useState({ type: 'success', text: '' })
  const [saving, setSaving] = useState(false)
  const change = e => setForm({ ...form, [e.target.name]: e.target.value })

  const save = async e => {
    e.preventDefault(); setSaving(true); setMsg({ text: '' })
    try {
      const u = await authApi.updateProfile({ nombre: form.nombre.trim(), telefono: form.telefono.trim() || null })
      setUser(u); setMsg({ type: 'success', text: 'Perfil actualizado correctamente.' })
    } catch (err) { setMsg({ type: 'error', text: err.message }) } finally { setSaving(false) }
  }

  const deactivate = async () => {
    if (!window.confirm('¿Seguro que deseas desactivar tu cuenta? Se cerrarán todas tus sesiones y no podrás iniciar sesión hasta reactivarla.')) return
    try { await authApi.deactivate(); await onLogout() } catch (err) { setMsg({ type: 'error', text: err.message }) }
  }

  const resetData = async empty => {
    const txt = empty ? '¿Borrar todos los grupos y gastos guardados en este navegador?' : '¿Restaurar los datos de demostración?'
    if (!window.confirm(txt)) return
    await financeApi.resetDemo(user, { empty })
    setMsg({ type: 'success', text: empty ? 'Datos borrados. Empiezas desde cero.' : 'Datos de demostración restaurados.' })
  }

  const registrado = user.fechaRegistro ? new Date(user.fechaRegistro).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : null

  return (
    <>
      <PageHeader title="Mi perfil" subtitle="Consulta y actualiza tus datos personales." />
      <Alert type={msg.type}>{msg.text}</Alert>
      <div className="profile-grid">
        <section className="card">
          <div className="profile-head">
            <Avatar user={user} size={56} />
            <div>
              <strong className="profile-name">{user.nombre}</strong>
              <small className="muted">{user.email}</small>
            </div>
          </div>
          <form className="form" onSubmit={save}>
            <div className="field">
              <label htmlFor="p-nombre">Nombre</label>
              <input id="p-nombre" name="nombre" value={form.nombre} onChange={change} minLength={2} maxLength={120} required />
            </div>
            <div className="field">
              <label htmlFor="p-email">Correo</label>
              <input id="p-email" value={user.email} disabled />
            </div>
            <div className="field">
              <label htmlFor="p-tel">Teléfono</label>
              <input id="p-tel" name="telefono" type="tel" value={form.telefono} onChange={change} maxLength={20} />
            </div>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
          </form>
        </section>

        <div className="stack">
          <section className="card">
            <h2 className="card-title">Cuenta</h2>
            <dl className="dl">
              <dt>Estado</dt><dd><span className={`pill ${user.estado === 'activo' ? 'pill-ok' : ''}`}>{user.estado}</span></dd>
              {registrado && <><dt>Miembro desde</dt><dd>{registrado}</dd></>}
            </dl>
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={onLogout}><Icon name="logout" size={16} />Cerrar sesión</button>
              <button className="btn btn-danger-ghost" onClick={deactivate}>Desactivar cuenta</button>
            </div>
          </section>

          {financeMode === 'local' && (
            <section className="card">
              <h2 className="card-title">Datos de grupos y gastos</h2>
              <p className="muted small">El backend aún no expone los módulos de grupos y gastos, así que esos datos se guardan en este navegador.</p>
              <div className="btn-row">
                <button className="btn btn-ghost btn-sm" onClick={() => resetData(false)}>Restaurar demostración</button>
                <button className="btn btn-ghost btn-sm" onClick={() => resetData(true)}>Empezar vacío</button>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
