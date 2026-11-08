import { useEffect, useState } from 'react'
import { Alert, Chips, Loader, Modal, PageHeader } from '../components/ui'
import Icon from '../components/Icon'
import { adminApi } from '../services/adminApi'
import { money } from '../utils/format'

const ROL_LABEL = {
  usuario: 'Usuario',
  moderador: 'Moderador',
  supervisor: 'Supervisor',
}

const COLORES_AGRUPACION = [
  { value: '#1f9d63', label: 'Esmeralda' },
  { value: '#0284c7', label: 'Océano' },
  { value: '#7c3aed', label: 'Violeta' },
  { value: '#d97706', label: 'Ámbar' },
  { value: '#dc2626', label: 'Coral' },
]

function NewMacroGroupModal({ grupos, onClose, onCreated }) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [color, setColor] = useState('#1f9d63')
  const [seleccionados, setSeleccionados] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleGrupo = id => {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const submit = async e => {
    e.preventDefault()
    setError('')
    if (nombre.trim().length < 2) return setError('Escribe un nombre para el grupo de grupos.')
    setSaving(true)
    try {
      await adminApi.createMacroGroup({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        color,
        grupoIds: seleccionados,
      })
      onCreated()
    } catch (err) {
      setError(err.message || 'No se pudo crear la agrupación.')
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Nuevo grupo de grupos (Agrupación maestra)"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" form="new-macro-group" disabled={saving}>
            {saving ? 'Creando…' : 'Crear grupo de grupos'}
          </button>
        </>
      }
    >
      <form id="new-macro-group" className="form" onSubmit={submit}>
        <Alert>{error}</Alert>
        <div className="field">
          <label htmlFor="mg-nombre">Nombre de la agrupación</label>
          <input
            id="mg-nombre"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej. Proyectos Semestrales o Sedes Regionales"
            maxLength={120}
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="mg-desc">Descripción</label>
          <input
            id="mg-desc"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Propósito o criterio que agrupa a estos grupos"
            maxLength={255}
          />
        </div>
        <div className="field">
          <span className="label">Color identificador</span>
          <div className="chips">
            {COLORES_AGRUPACION.map(c => (
              <button
                key={c.value}
                type="button"
                className={`chip${color === c.value ? ' active' : ''}`}
                onClick={() => setColor(c.value)}
              >
                <span className="dot-color" style={{ background: c.value }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="label">Grupos que integrarán esta agrupación ({seleccionados.length})</span>
          <div className="macro-group-picker">
            {grupos.map(g => (
              <label key={g.id} className="macro-group-check">
                <input
                  type="checkbox"
                  checked={seleccionados.includes(g.id)}
                  onChange={() => toggleGrupo(g.id)}
                />
                <span>
                  <strong>{g.nombre}</strong>
                  <small className="muted"> · {g.miembrosActivos} miembros · {money(g.totalGastos)}</small>
                </span>
              </label>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default function Administracion({ user }) {
  const [usuarios, setUsuarios] = useState([])
  const [grupos, setGrupos] = useState([])
  const [agrupaciones, setAgrupaciones] = useState([])
  const [vista, setVista] = useState('ambos')
  const [creatingMacro, setCreatingMacro] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const esSupervisor = user.rol === 'supervisor'

  const cargarTodo = () => {
    setLoading(true)
    Promise.all([adminApi.users(), adminApi.groupsOverview()])
      .then(([listaUsuarios, overviewGrupos]) => {
        setUsuarios(listaUsuarios)
        setGrupos(overviewGrupos.grupos || [])
        setAgrupaciones(overviewGrupos.agrupaciones || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargarTodo()
  }, [])

  const updateUser = async (id, action, value) => {
    setError('')
    setMensaje('')
    try {
      const actualizado = action === 'rol'
        ? await adminApi.changeRole(id, value)
        : await adminApi.changeStatus(id, value)
      setUsuarios(actuales => actuales.map(u => u.id === id ? { ...u, ...actualizado } : u))
      setMensaje(
        action === 'estado' && value === 'inactivo'
          ? 'Usuario archivado en la base de datos de inactivos (cold storage).'
          : 'Cambios de cuenta guardados correctamente.'
      )
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateGrupo = async (grupoId, cambios) => {
    setError('')
    setMensaje('')
    try {
      await adminApi.updateGroup(grupoId, cambios)
      const overview = await adminApi.groupsOverview()
      setGrupos(overview.grupos || [])
      setAgrupaciones(overview.agrupaciones || [])
      setMensaje('Configuración del grupo actualizada correctamente.')
    } catch (err) {
      setError(err.message)
    }
  }

  const activos = usuarios.filter(usuario => usuario.estado === 'activo').length
  const inactivos = usuarios.filter(usuario => usuario.estado !== 'activo').length
  const moderadores = usuarios.filter(usuario => usuario.rol === 'moderador').length
  const supervisores = usuarios.filter(usuario => usuario.rol === 'supervisor').length
  const totalAhorroAlcancias = grupos.reduce((s, g) => s + Number(g.ahorradoAlcancia || 0), 0)

  const actionHeader = (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <Chips
        value={vista}
        onChange={setVista}
        options={[
          { value: 'ambos', label: 'Vista completa' },
          { value: 'grupos', label: `Grupos de grupos (${agrupaciones.length})` },
          { value: 'usuarios', label: `Usuarios (${usuarios.length})` },
        ]}
      />
      <button className="btn btn-primary btn-sm" onClick={() => setCreatingMacro(true)}>
        <Icon name="plus" size={16} />Nuevo grupo de grupos
      </button>
    </div>
  )

  return (
    <>
      <PageHeader
        title="Administración"
        subtitle={esSupervisor
          ? 'Gestiona cuentas (BD activos/inactivos), roles de acceso y agrupaciones maestras (grupos de grupos).'
          : 'Revisa las cuentas de usuario y organiza los grupos de grupos de la plataforma.'}
        action={actionHeader}
      />
      <Alert>{error}</Alert>
      <Alert type="success">{mensaje}</Alert>

      <div className="stats admin-stats">
        <article className="stat">
          <span className="stat-label">Cuentas registradas</span>
          <strong className="stat-value">{usuarios.length}</strong>
          <small>{activos} en BD activa · {inactivos} en BD inactivos</small>
        </article>
        <article className="stat">
          <span className="stat-label">Grupos de grupos</span>
          <strong className="stat-value">{agrupaciones.length}</strong>
          <small>{grupos.length} grupos vinculados en clústeres</small>
        </article>
        <article className="stat">
          <span className="stat-label">Alcancías y gestión</span>
          <strong className="stat-value">{money(totalAhorroAlcancias)}</strong>
          <small>{moderadores} moderadores · {supervisores} supervisores</small>
        </article>
      </div>

      {(vista === 'ambos' || vista === 'grupos') && (
        <section className="section">
          <div className="section-head admin-section-head">
            <div>
              <h2 className="section-title">Grupos de grupos (Agrupaciones maestras)</h2>
              <small className="muted">Organización jerárquica de grupos por categoría operativa, sede o propósito común</small>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setCreatingMacro(true)}>
              <Icon name="plus" size={16} />Crear agrupación
            </button>
          </div>

          {loading ? <Loader label="Cargando grupos de grupos…" /> : (
            <>
              <div className="macro-groups-grid">
                {agrupaciones.map(ag => {
                  const subgrupos = grupos.filter(g => Number(g.agrupacionId) === Number(ag.id))
                  return (
                    <article key={ag.id} className="card macro-group-card" style={{ borderTop: `4px solid ${ag.color || '#1f9d63'}` }}>
                      <header className="macro-group-head">
                        <div>
                          <span className="eyebrow" style={{ color: ag.color || '#1f9d63' }}>Clúster / Grupo de grupos</span>
                          <h3>{ag.nombre}</h3>
                        </div>
                        <span className="pill">{subgrupos.length} {subgrupos.length === 1 ? 'grupo' : 'grupos'}</span>
                      </header>
                      <p className="muted small" style={{ margin: 0 }}>{ag.descripcion || 'Agrupación operativa de grupos.'}</p>
                      <div className="kv-grid">
                        <div className="kv">
                          <small>Gasto consolidado</small>
                          <strong>{money(subgrupos.reduce((s, g) => s + Number(g.totalGastos || 0), 0))}</strong>
                        </div>
                        <div className="kv">
                          <small>Alcancías del clúster</small>
                          <strong className="pos">{money(subgrupos.reduce((s, g) => s + Number(g.ahorradoAlcancia || 0), 0))}</strong>
                        </div>
                      </div>
                      <div className="macro-subgroups-list">
                        <small className="label">Subgrupos integrados:</small>
                        {subgrupos.length === 0 ? (
                          <small className="muted">Sin grupos asignados todavía.</small>
                        ) : (
                          <div className="macro-subgroups-pills">
                            {subgrupos.map(sg => (
                              <span key={sg.id} className="macro-subgroup-pill">
                                <Icon name="users" size={13} /> {sg.nombre} ({sg.miembrosActivos})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="section-head admin-section-head" style={{ marginTop: 22 }}>
                <h3 className="section-title">Asignación y gobernanza de grupos individuales</h3>
                <span className="muted small">{grupos.length} grupos en el sistema</span>
              </div>

              <div className="admin-users">
                {grupos.map(g => (
                  <article className="admin-user-row admin-group-row" key={g.id}>
                    <div className="admin-user-ident">
                      <span className="admin-user-icon"><Icon name="users" size={19} /></span>
                      <span>
                        <strong>{g.nombre}</strong>
                        <small>
                          Creado por {g.creadorNombre} · {g.miembrosActivos} miembros · Gastos: {money(g.totalGastos)} · Alcancía: {money(g.ahorradoAlcancia)}
                        </small>
                      </span>
                    </div>
                    <span className={`pill ${g.estado === 'activo' ? 'pill-ok' : ''}`}>{g.estado}</span>
                    <span className="admin-role">
                      <Icon name="safe" size={14} />{g.agrupacionNombre || 'Sin agrupación'}
                    </span>
                    <div className="admin-user-controls">
                      <label className="admin-control">
                        <span>Grupo de grupos</span>
                        <select
                          aria-label={`Grupo de grupos para ${g.nombre}`}
                          value={g.agrupacionId || ''}
                          onChange={e => handleUpdateGrupo(g.id, { agrupacionId: e.target.value ? Number(e.target.value) : null })}
                        >
                          <option value="">Sin agrupación</option>
                          {agrupaciones.map(ag => (
                            <option key={ag.id} value={ag.id}>{ag.nombre}</option>
                          ))}
                        </select>
                      </label>
                      <label className="admin-control">
                        <span>Estado</span>
                        <select
                          aria-label={`Estado del grupo ${g.nombre}`}
                          value={g.estado}
                          onChange={e => handleUpdateGrupo(g.id, { estado: e.target.value })}
                        >
                          <option value="activo">Activo</option>
                          <option value="archivado">Archivado</option>
                        </select>
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {(vista === 'ambos' || vista === 'usuarios') && (
        <section className="section">
          <div className="section-head admin-section-head">
            <div>
              <h2 className="section-title">Cuentas de usuario (BD Activos e Inactivos)</h2>
              <small className="muted">Al pasar un usuario a inactivo se archiva en el esquema histórico secundario</small>
            </div>
            <span className="muted small">{usuarios.length} en total</span>
          </div>
          {loading ? <Loader label="Cargando usuarios…" /> : usuarios.length === 0 ? (
            <div className="card admin-empty">
              <Icon name="users" size={24} />
              <strong>No hay cuentas para mostrar.</strong>
            </div>
          ) : (
            <div className="admin-users">
              {usuarios.map(usuario => {
                const propia = usuario.id === user.id
                const puedeGestionarEstado = !propia && (esSupervisor || usuario.rol === 'usuario')
                return (
                  <article className="admin-user-row" key={usuario.id}>
                    <div className="admin-user-ident">
                      <span className="admin-user-icon"><Icon name="user" size={19} /></span>
                      <span>
                        <strong>{usuario.nombre}{propia ? ' (tú)' : ''}</strong>
                        <small>{usuario.email}</small>
                      </span>
                    </div>
                    <span className={`pill ${usuario.estado === 'activo' ? 'pill-ok' : ''}`}>{usuario.estado}</span>
                    <span className={`admin-role admin-role-${usuario.rol}`}>
                      <Icon name="shield" size={14} />{ROL_LABEL[usuario.rol]}
                    </span>
                    <div className="admin-user-controls">
                      {puedeGestionarEstado ? (
                        <label className="admin-control">
                          <span>Estado</span>
                          <select
                            aria-label={`Estado de ${usuario.nombre}`}
                            value={usuario.estado}
                            onChange={event => updateUser(usuario.id, 'estado', event.target.value)}
                          >
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                            <option value="bloqueado">Bloqueado</option>
                          </select>
                        </label>
                      ) : <small className="muted">{propia ? 'Tu cuenta' : 'Solo supervisor puede gestionar esta cuenta'}</small>}
                      {esSupervisor && !propia && (
                        <label className="admin-control">
                          <span>Rol</span>
                          <select
                            aria-label={`Rol de ${usuario.nombre}`}
                            value={usuario.rol}
                            onChange={event => updateUser(usuario.id, 'rol', event.target.value)}
                          >
                            <option value="usuario">Usuario</option>
                            <option value="moderador">Moderador</option>
                            <option value="supervisor">Supervisor</option>
                          </select>
                        </label>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {creatingMacro && (
        <NewMacroGroupModal
          grupos={grupos}
          onClose={() => setCreatingMacro(false)}
          onCreated={() => {
            setCreatingMacro(false)
            setMensaje('Nuevo grupo de grupos creado exitosamente.')
            cargarTodo()
          }}
        />
      )}

      <p className="admin-footnote"><Icon name="shield" size={15} /> Los permisos se verifican también en el backend; ocultar controles no concede acceso.</p>
    </>
  )
}
