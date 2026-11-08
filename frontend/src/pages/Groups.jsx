import { useState } from 'react'
import { Link } from 'react-router-dom'
import { financeApi } from '../services/financeApi'
import { useData } from '../utils/useData'
import { GROUP_ICONS, money, shortDate } from '../utils/format'
import { Alert, AvatarStack, Chips, Empty, Loader, Modal, PageHeader } from '../components/ui'
import Icon from '../components/Icon'
import { CIUDADES } from '../components/MapView'

function NewGroupModal({ user, onClose, onCreated }) {
  const [form, setForm] = useState({ nombre: '', descripcion: '', icono: 'building', ciudad: 'Medellín' })
  const [integrantes, setIntegrantes] = useState([''])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const change = e => setForm({ ...form, [e.target.name]: e.target.value })
  const setInt = (i, v) => setIntegrantes(list => list.map((x, j) => (j === i ? v : x)))

  const submit = async e => {
    e.preventDefault(); setError('')
    const validos = [...new Set(integrantes.map(x => x.trim().toLowerCase()).filter(Boolean))].map(email => ({ email }))
    if (!validos.length) return setError('Agrega el correo de al menos un integrante además de ti.')
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
              <div className="member-row member-row-single" key={i}>
                <input aria-label={`Correo del integrante ${i + 1}`} type="email" placeholder="correo@ejemplo.com" value={x} onChange={e => setInt(i, e.target.value)} />
                {integrantes.length > 1 && (
                  <button type="button" className="icon-btn" aria-label="Quitar" onClick={() => setIntegrantes(l => l.filter((_, j) => j !== i))}><Icon name="close" size={16} /></button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIntegrantes(l => [...l, ''])}>
              <Icon name="plus" size={16} />Agregar integrante
            </button>
          </div>
          <small className="hint">Escribe el correo con el que cada integrante se registró en FT. GROUP. Tú quedas como administrador.</small>
        </div>
      </form>
    </Modal>
  )
}

function AddMemberModal({ user, grupo, onClose, onAdded }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async e => {
    e.preventDefault(); setError(''); setSaving(true)
    try { await financeApi.addMember(user, grupo.id, email); onAdded() }
    catch (err) { setError(err.message); setSaving(false) }
  }
  return (
    <Modal title={`Agregar a ${grupo.nombre}`} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" form="add-member" disabled={saving}>{saving ? 'Agregando…' : 'Agregar'}</button>
      </>}>
      <form id="add-member" className="form" onSubmit={submit}>
        <Alert>{error}</Alert>
        <div className="field">
          <label htmlFor="m-email">Correo del integrante</label>
          <input id="m-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" required autoFocus />
          <small className="hint">La persona debe tener una cuenta registrada en FT. GROUP.</small>
        </div>
      </form>
    </Modal>
  )
}

function AlcanciaModal({ user, grupo, onClose, onUpdated }) {
  const alcancia = grupo.alcancia || { nombre: `Alcancía ${grupo.nombre}`, meta: 0, ahorrado: 0, progreso: 0, aportes: [] }
  const [modo, setModo] = useState('aportar')
  const [monto, setMonto] = useState('')
  const [nota, setNota] = useState('')
  const [nombreMeta, setNombreMeta] = useState(alcancia.nombre || `Alcancía ${grupo.nombre}`)
  const [valorMeta, setValorMeta] = useState(String(alcancia.meta || ''))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submitAporte = async e => {
    e.preventDefault()
    setError('')
    const num = Number(monto)
    if (!(num > 0)) return setError('Ingresa un monto válido mayor a cero.')
    setSaving(true)
    try {
      await financeApi.contributeAlcancia(user, grupo.id, { monto: num, nota })
      onUpdated()
    } catch (err) {
      setError(err.message || 'No se pudo registrar el aporte.')
      setSaving(false)
    }
  }

  const submitMeta = async e => {
    e.preventDefault()
    setError('')
    const num = Number(valorMeta)
    if (Number.isNaN(num) || num < 0) return setError('La meta debe ser un valor mayor o igual a cero.')
    setSaving(true)
    try {
      await financeApi.configureAlcancia(user, grupo.id, { nombre: nombreMeta, meta: num })
      onUpdated()
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la meta.')
      setSaving(false)
    }
  }

  const faltante = Math.max(0, Number(alcancia.meta || 0) - Number(alcancia.ahorrado || 0))

  return (
    <Modal
      title={`Alcancía · ${grupo.nombre}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Cerrar</button>
          <button
            className="btn btn-primary"
            form={modo === 'aportar' ? 'alcancia-aporte-form' : 'alcancia-meta-form'}
            disabled={saving}
          >
            {saving ? 'Guardando…' : modo === 'aportar' ? 'Registrar aporte' : 'Guardar meta'}
          </button>
        </>
      }
    >
      <div className="alcancia-modal-summary">
        <div className="alcancia-modal-header">
          <div>
            <span className="eyebrow">Fondo de ahorro compartido</span>
            <h4>{alcancia.nombre}</h4>
          </div>
          <span className="pill pos">{alcancia.progreso || 0}% completado</span>
        </div>
        <div className="alcancia-progress-track">
          <div className="alcancia-progress-fill" style={{ width: `${Math.min(100, alcancia.progreso || 0)}%` }} />
        </div>
        <div className="kv-grid">
          <div className="kv"><small>Ahorrado actual</small><strong className="pos">{money(alcancia.ahorrado)}</strong></div>
          <div className="kv"><small>Meta del grupo</small><strong>{money(alcancia.meta)}</strong></div>
          <div className="kv"><small>Por completar</small><strong>{money(faltante)}</strong></div>
        </div>
      </div>

      <Chips
        value={modo}
        onChange={v => { setError(''); setModo(v) }}
        options={[
          { value: 'aportar', label: 'Aportar a la alcancía' },
          { value: 'meta', label: 'Configurar meta' },
        ]}
      />

      <Alert>{error}</Alert>

      {modo === 'aportar' ? (
        <form id="alcancia-aporte-form" className="form" onSubmit={submitAporte}>
          <div className="field">
            <label htmlFor="alc-monto">Monto del aporte</label>
            <input
              id="alc-monto"
              type="number"
              min="1000"
              step="1000"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              placeholder="Ej. 50000"
              required
              autoFocus
            />
            <div className="alcancia-quick-chips">
              {[20000, 50000, 100000, 200000].map(val => (
                <button
                  key={val}
                  type="button"
                  className="chip"
                  onClick={() => setMonto(String(val))}
                >
                  +{money(val)}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="alc-nota">Nota o motivo <span className="muted">(opcional)</span></label>
            <input
              id="alc-nota"
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="Ej. Cuota quincenal para el fondo del grupo"
              maxLength={140}
            />
          </div>
        </form>
      ) : (
        <form id="alcancia-meta-form" className="form" onSubmit={submitMeta}>
          <div className="field">
            <label htmlFor="alc-nombre">Nombre del propósito de ahorro</label>
            <input
              id="alc-nombre"
              value={nombreMeta}
              onChange={e => setNombreMeta(e.target.value)}
              placeholder="Ej. Fondo de imprevistos o Excursión islas"
              maxLength={120}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="alc-meta">Meta objetivo</label>
            <input
              id="alc-meta"
              type="number"
              min="0"
              step="10000"
              value={valorMeta}
              onChange={e => setValorMeta(e.target.value)}
              placeholder="Ej. 600000"
              required
            />
          </div>
        </form>
      )}

      <div className="alcancia-aportes-section">
        <span className="label">Últimos aportes ({alcancia.aportes?.length || 0})</span>
        {(!alcancia.aportes || alcancia.aportes.length === 0) ? (
          <p className="muted" style={{ margin: '6px 0 0' }}>Aún no hay aportes registrados en esta alcancía.</p>
        ) : (
          <ul className="alcancia-aportes-list">
            {alcancia.aportes.slice(0, 6).map(ap => (
              <li key={ap.id} className="alcancia-aporte-row">
                <div>
                  <strong>{ap.usuario || 'Integrante'}</strong>
                  <small className="muted">{ap.nota || 'Aporte a alcancía'} · {shortDate(ap.fecha)}</small>
                </div>
                <strong className="pos">+{money(ap.monto)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

export default function Groups({ user }) {
  const { data: grupos, error, loading, reload } = useData(() => financeApi.groups(user), [user.id])
  const [creating, setCreating] = useState(false)
  const [adding, setAdding] = useState(null)
  const [alcanciaGrupo, setAlcanciaGrupo] = useState(null)
  const [filtroAgrupacion, setFiltroAgrupacion] = useState('todos')

  if (loading) return <Loader />
  if (error) return <Alert>{error}</Alert>

  const action = <button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="plus" size={18} />Nuevo grupo</button>

  const agrupacionesUnicas = []
  const seenAg = new Set()
  for (const g of grupos) {
    if (g.agrupacion && !seenAg.has(g.agrupacion.id)) {
      seenAg.add(g.agrupacion.id)
      agrupacionesUnicas.push(g.agrupacion)
    }
  }

  const gruposFiltrados = filtroAgrupacion === 'todos'
    ? grupos
    : grupos.filter(g => g.agrupacion?.id === filtroAgrupacion)

  const totalAhorradoAlcancias = grupos.reduce((s, g) => s + Number(g.alcancia?.ahorrado || 0), 0)
  const totalMetaAlcancias = grupos.reduce((s, g) => s + Number(g.alcancia?.meta || 0), 0)

  return (
    <>
      <PageHeader title="Grupos financieros" subtitle={`${grupos.length} ${grupos.length === 1 ? 'grupo activo' : 'grupos activos'} · Alcancías compartidas: ${money(totalAhorradoAlcancias)}`} action={action} />
      {grupos.length === 0 ? (
        <Empty icon="users" title="Todavía no perteneces a ningún grupo" text="Crea un grupo para tu apartamento, un viaje o tu equipo de trabajo." action={action} />
      ) : (
        <>
          <section className="card alcancia-global-banner">
            <div className="alcancia-global-info">
              <span className="tile-icon pos"><Icon name="safe" size={22} /></span>
              <div>
                <span className="eyebrow">Alcancía colectiva</span>
                <strong>{money(totalAhorradoAlcancias)} ahorrados</strong>
                <small className="muted"> de {money(totalMetaAlcancias)} en metas conjuntas de tus grupos</small>
              </div>
            </div>
            {agrupacionesUnicas.length > 0 && (
              <Chips
                value={filtroAgrupacion}
                onChange={setFiltroAgrupacion}
                options={[
                  { value: 'todos', label: `Todos (${grupos.length})` },
                  ...agrupacionesUnicas.map(a => ({ value: a.id, label: a.nombre })),
                ]}
              />
            )}
          </section>

          <div className="group-grid">
            {gruposFiltrados.map(g => {
              const alc = g.alcancia || { nombre: `Alcancía ${g.nombre}`, meta: 0, ahorrado: 0, progreso: 0 }
              return (
                <article key={g.id} className="card group-card">
                  <header className="group-head">
                    <span className="tile-icon"><Icon name={g.icono} size={22} /></span>
                    <div>
                      <div className="group-title-row">
                        <h3>{g.nombre}</h3>
                        {g.agrupacion && (
                          <span className="agrupacion-tag" style={{ borderColor: g.agrupacion.color, color: g.agrupacion.color }}>
                            {g.agrupacion.nombre}
                          </span>
                        )}
                      </div>
                      <small className="muted">{g.miembros.length} miembros{g.ciudad ? ` · ${g.ciudad}` : ''}</small>
                    </div>
                    {g.rol === 'administrador' && <span className="pill">Admin</span>}
                  </header>
                  <AvatarStack users={g.miembros} />
                  <div className="kv-grid">
                    <div className="kv"><small>Total gastos</small><strong>{money(g.total_gastos)}</strong></div>
                    <div className="kv"><small>Mi balance</small><strong className={g.mi_balance < 0 ? 'neg' : 'pos'}>{money(g.mi_balance)}</strong></div>
                  </div>

                  <div className="alcancia-card-box" onClick={() => setAlcanciaGrupo(g)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setAlcanciaGrupo(g)}>
                    <div className="alcancia-card-top">
                      <span className="alcancia-card-title">
                        <Icon name="safe" size={15} /> {alc.nombre}
                      </span>
                      <span className="alcancia-pct">{alc.progreso}%</span>
                    </div>
                    <div className="alcancia-progress-track">
                      <div className="alcancia-progress-fill" style={{ width: `${Math.min(100, alc.progreso || 0)}%` }} />
                    </div>
                    <div className="alcancia-card-foot">
                      <small>Ahorrado: <strong className="pos">{money(alc.ahorrado)}</strong></small>
                      <small className="muted">Meta: {money(alc.meta)}</small>
                    </div>
                  </div>

                  <div className="card-actions">
                    <Link className="card-link" to={`/gastos?grupo=${g.id}`}>Ver {g.num_gastos} {g.num_gastos === 1 ? 'gasto' : 'gastos'} <Icon name="arrow" size={15} /></Link>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => setAlcanciaGrupo(g)}>
                        <Icon name="safe" size={14} />Alcancía
                      </button>
                      {g.rol === 'administrador' && (
                        <button className="btn btn-ghost btn-xs" onClick={() => setAdding(g)}><Icon name="plus" size={14} />Integrante</button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}
      {alcanciaGrupo && (
        <AlcanciaModal
          user={user}
          grupo={alcanciaGrupo}
          onClose={() => setAlcanciaGrupo(null)}
          onUpdated={() => { setAlcanciaGrupo(null); reload() }}
        />
      )}
      {adding && <AddMemberModal user={user} grupo={adding} onClose={() => setAdding(null)} onAdded={() => { setAdding(null); reload() }} />}
      {creating && <NewGroupModal user={user} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload() }} />}
    </>
  )
}
