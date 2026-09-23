import { useState } from 'react'
import { Link } from 'react-router-dom'
import { financeApi } from '../services/financeApi'
import { useData } from '../utils/useData'
import { GROUP_ICONS, money } from '../utils/format'
import { Alert, AvatarStack, Empty, Loader, Modal, PageHeader } from '../components/ui'
import Icon from '../components/Icon'
import { CIUDADES } from '../components/MapView'

function NewGroupModal({ user, onClose, onCreated }) {
  const [form, setForm] = useState({ nombre: '', descripcion: '', icono: 'building', ciudad: 'Medellín' })
  const [integrantes, setIntegrantes] = useState([{ nombre: '', email: '' }])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const change = e => setForm({ ...form, [e.target.name]: e.target.value })
  const setInt = (i, k, v) => setIntegrantes(list => list.map((x, j) => (j === i ? { ...x, [k]: v } : x)))

  const submit = async e => {
    e.preventDefault(); setError('')
    const validos = integrantes.filter(x => x.nombre.trim())
    if (!validos.length) return setError('Agrega al menos un integrante además de ti.')
    setSaving(true)
    try {
      const c = CIUDADES.find(x => x.nombre === form.ciudad)
      await financeApi.createGroup(user, { ...form, lat: c?.lat, lng: c?.lng, integrantes: validos })
      onCreated()
    } catch (err) { setError(err.message); setSaving(false) }
  }

  return (
    <Modal title="Nuevo grupo" onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" form="new-group" disabled={saving}>{saving ? 'Creando…' : 'Crear grupo'}</button>
      </>}>
      <form id="new-group" className="form" onSubmit={submit}>
        <Alert>{error}</Alert>
        <div className="field">
          <label htmlFor="g-nombre">Nombre del grupo</label>
          <input id="g-nombre" name="nombre" value={form.nombre} onChange={change} placeholder="Ej. Apartamento 402" maxLength={120} required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="g-desc">Descripción <span className="muted">(opcional)</span></label>
          <input id="g-desc" name="descripcion" value={form.descripcion} onChange={change} placeholder="Gastos del hogar" />
        </div>
        <div className="field">
          <span className="label">Tipo</span>
          <div className="icon-picker">
            {GROUP_ICONS.map(i => (
              <button type="button" key={i.id} className={`icon-option${form.icono === i.id ? ' active' : ''}`}
                onClick={() => setForm({ ...form, icono: i.id })} aria-pressed={form.icono === i.id}>
                <Icon name={i.id} size={20} /><small>{i.label}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="g-ciudad">Ciudad</label>
          <select id="g-ciudad" name="ciudad" value={form.ciudad} onChange={change}>
            {CIUDADES.map(c => <option key={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="field">
          <span className="label">Integrantes</span>
          <div className="members-edit">
            {integrantes.map((x, i) => (
              <div className="member-row" key={i}>
                <input aria-label="Nombre" placeholder="Nombre" value={x.nombre} onChange={e => setInt(i, 'nombre', e.target.value)} />
                <input aria-label="Correo" type="email" placeholder="Correo (opcional)" value={x.email} onChange={e => setInt(i, 'email', e.target.value)} />
                {integrantes.length > 1 && (
                  <button type="button" className="icon-btn" aria-label="Quitar" onClick={() => setIntegrantes(l => l.filter((_, j) => j !== i))}><Icon name="close" size={16} /></button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIntegrantes(l => [...l, { nombre: '', email: '' }])}>
              <Icon name="plus" size={16} />Agregar integrante
            </button>
          </div>
          <small className="hint">Tú quedas como administrador del grupo.</small>
        </div>
      </form>
    </Modal>
  )
}

export default function Groups({ user }) {
  const { data: grupos, error, loading, reload } = useData(() => financeApi.groups(user), [user.id])
  const [creating, setCreating] = useState(false)

  if (loading) return <Loader />
  if (error) return <Alert>{error}</Alert>

  const action = <button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="plus" size={18} />Nuevo grupo</button>

  return (
    <>
      <PageHeader title="Grupos financieros" subtitle={`${grupos.length} ${grupos.length === 1 ? 'grupo activo' : 'grupos activos'}`} action={action} />
      {grupos.length === 0 ? (
        <Empty icon="users" title="Todavía no perteneces a ningún grupo" text="Crea un grupo para tu apartamento, un viaje o tu equipo de trabajo." action={action} />
      ) : (
        <div className="group-grid">
          {grupos.map(g => (
            <article key={g.id} className="card group-card">
              <header className="group-head">
                <span className="tile-icon"><Icon name={g.icono} size={22} /></span>
                <div>
                  <h3>{g.nombre}</h3>
                  <small className="muted">{g.miembros.length} miembros{g.ciudad ? ` · ${g.ciudad}` : ''}</small>
                </div>
                {g.rol === 'administrador' && <span className="pill">Admin</span>}
              </header>
              <AvatarStack users={g.miembros} />
              <div className="kv-grid">
                <div className="kv"><small>Total gastos</small><strong>{money(g.total_gastos)}</strong></div>
                <div className="kv"><small>Mi balance</small><strong className={g.mi_balance < 0 ? 'neg' : 'pos'}>{money(g.mi_balance)}</strong></div>
              </div>
              <Link className="card-link" to={`/gastos?grupo=${g.id}`}>Ver {g.num_gastos} {g.num_gastos === 1 ? 'gasto' : 'gastos'} <Icon name="arrow" size={15} /></Link>
            </article>
          ))}
        </div>
      )}
      {creating && <NewGroupModal user={user} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload() }} />}
    </>
  )
}
