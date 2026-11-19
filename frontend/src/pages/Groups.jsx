import { useState } from 'react'
import { Link } from 'react-router-dom'
import { financeApi } from '../services/financeApi'
import { useData } from '../utils/useData'
import { GROUP_ICONS, money, shortDate } from '../utils/format'
import { Alert, AvatarStack, Chips, Empty, Loader, Modal, PageHeader } from '../components/ui'
import Icon from '../components/Icon'
import { CIUDADES } from '../components/MapView'
import { CURRENCIES } from '../currency/CurrencyContext'
import { useI18n } from '../i18n/I18nContext'
import { MAX_GROUPS_PER_PERSON, MAX_MEMBERS_PER_GROUP } from '../utils/groupLimits'

function NewGroupModal({ user, onClose, onCreated }) {
  const { t } = useI18n()
  const [form, setForm] = useState({ nombre: '', descripcion: '', icono: 'building', ciudad: 'Medellín', moneda: 'COP', tasaCop: '1', instruccionesPago: '' })
  const [integrantes, setIntegrantes] = useState([''])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const change = e => setForm({ ...form, [e.target.name]: e.target.value })
  const setInt = (i, v) => setIntegrantes(list => list.map((x, j) => (j === i ? v : x)))
  const totalIntegrantes = new Set(integrantes.map(email => email.trim().toLowerCase()).filter(Boolean)).size + 1

  const submit = async e => {
    e.preventDefault(); setError('')
    const validos = [...new Set(integrantes.map(x => x.trim().toLowerCase()).filter(Boolean))]
    if (!validos.length) return setError(t('err_at_least_one_member'))
    setSaving(true)
    try {
      const c = CIUDADES.find(x => x.nombre === form.ciudad)
      await financeApi.createGroup(user, { ...form, lat: c?.lat, lng: c?.lng, integrantes: validos })
      onCreated()
    } catch (err) { setError(err.message); setSaving(false) }
  }

  return (
    <Modal title={t('modal_new_group_title')} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary" form="new-group" disabled={saving}>{saving ? t('modal_new_group_creating') : t('modal_new_group_btn')}</button>
      </>}>
      <form id="new-group" className="form" onSubmit={submit}>
        <Alert>{error}</Alert>
        <Alert type="info">
          {t('group_limits_notice', { maxGroups: MAX_GROUPS_PER_PERSON, maxMembers: MAX_MEMBERS_PER_GROUP })}
        </Alert>
        <div className="field">
          <label htmlFor="g-nombre">{t('field_group_name')}</label>
          <input id="g-nombre" name="nombre" value={form.nombre} onChange={change} placeholder={t('field_group_name_ph')} maxLength={120} required autoFocus />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="g-moneda">{t('group_currency')}</label>
            <select id="g-moneda" name="moneda" value={form.moneda}
              onChange={e => setForm(f => ({ ...f, moneda: e.target.value, tasaCop: e.target.value === 'COP' ? '1' : '' }))}>
              {Object.values(CURRENCIES).map(moneda => <option key={moneda.code} value={moneda.code}>{moneda.code} · {moneda.name}</option>)}
            </select>
          </div>
          {form.moneda !== 'COP' && <div className="field">
            <label htmlFor="g-tasa-cop">{t('group_exchange_rate')}</label>
            <input id="g-tasa-cop" name="tasaCop" type="number" min="0.00000001" step="any"
              value={form.tasaCop} onChange={change} required />
            <small className="hint">{t('group_exchange_rate_hint', { currency: form.moneda })}</small>
          </div>}
          <div className="field">
            <label htmlFor="g-pago">{t('payment_instructions_label')} <span className="muted">({t('optional')})</span></label>
            <input id="g-pago" name="instruccionesPago" value={form.instruccionesPago} onChange={change} maxLength={500}
              placeholder={t('payment_instructions_placeholder')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="g-desc">{t('field_group_desc')} <span className="muted">({t('optional')})</span></label>
          <input id="g-desc" name="descripcion" value={form.descripcion} onChange={change} placeholder={t('field_group_desc_ph')} />
        </div>
        <div className="field">
          <span className="label">{t('group_type_label')}</span>
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
          <label htmlFor="g-ciudad">{t('group_city')}</label>
          <select id="g-ciudad" name="ciudad" value={form.ciudad} onChange={change}>
            {CIUDADES.map(c => <option key={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="field">
          <span className="label">{t('group_members')}</span>
          <div className="members-edit">
            {integrantes.map((x, i) => (
              <div className="member-row member-row-single" key={i}>
                <input aria-label={`${t('group_member_email')} ${i + 1}`} type="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" placeholder="correo@ejemplo.com" value={x} onChange={e => setInt(i, e.target.value)} />
                {integrantes.length > 1 && (
                  <button type="button" className="icon-btn" aria-label={t('group_remove_member')} onClick={() => setIntegrantes(l => l.filter((_, j) => j !== i))}><Icon name="close" size={16} /></button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" disabled={integrantes.length >= MAX_MEMBERS_PER_GROUP - 1} onClick={() => setIntegrantes(l => [...l, ''])}>
              <Icon name="plus" size={16} />{t('group_add_member')}
            </button>
          </div>
          <small className="hint">
            {t('group_member_email_help')} · {t('group_member_capacity', { count: totalIntegrantes, max: MAX_MEMBERS_PER_GROUP })}
          </small>
        </div>
      </form>
    </Modal>
  )
}

function AddMemberModal({ user, grupo, onClose, onAdded }) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async e => {
    e.preventDefault(); setError(''); setSaving(true)
    try { await financeApi.addMember(user, grupo.id, email); onAdded() }
    catch (err) { setError(err.message); setSaving(false) }
  }
  return (
    <Modal title={`${t('group_add_member')} · ${grupo.nombre}`} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary" form="add-member" disabled={saving}>{saving ? t('group_add_member_saving') : t('group_add_member_btn')}</button>
      </>}>
      <form id="add-member" className="form" onSubmit={submit}>
        <Alert>{error}</Alert>
        <Alert type="info">
          {t('group_member_capacity', { count: grupo.miembros.length, max: MAX_MEMBERS_PER_GROUP })}
        </Alert>
        <div className="field">
          <label htmlFor="m-email">{t('group_member_email')}</label>
          <input id="m-email" type="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" required autoFocus />
          <small className="hint">{t('group_member_email_hint')}</small>
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
  const { t } = useI18n()
  const { data: grupos, error, loading, reload } = useData(() => financeApi.groups(user), [user.id])
  const [creating, setCreating] = useState(false)
  const [adding, setAdding] = useState(null)
  const [alcanciaGrupo, setAlcanciaGrupo] = useState(null)
  const [filtroAgrupacion, setFiltroAgrupacion] = useState('todos')

  if (loading) return <Loader />
  if (error) return <Alert>{error}</Alert>

  const maxGroupsReached = grupos.length >= MAX_GROUPS_PER_PERSON
  const action = <button className="btn btn-primary" disabled={maxGroupsReached} onClick={() => setCreating(true)}><Icon name="plus" size={18} />{t('new_group_btn')}</button>

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
      <PageHeader title={t('groups_title')} subtitle={t('groups_subtitle', { count: grupos.length })} action={action} />
      <Alert type={maxGroupsReached ? 'warning' : 'info'}>
        {maxGroupsReached
          ? t('group_limit_reached', { max: MAX_GROUPS_PER_PERSON })
          : t('group_limits_notice', { maxGroups: MAX_GROUPS_PER_PERSON, maxMembers: MAX_MEMBERS_PER_GROUP })}
      </Alert>
      {grupos.length === 0 ? (
        <Empty icon="users" title={t('groups_empty_title')} text={t('groups_empty_desc')} action={action} />
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
                      <small className="muted">{t('group_members_count', { count: g.miembros.length })}{g.ciudad ? ` · ${g.ciudad}` : ''}</small>
                      <small className="muted">{g.moneda || 'COP'}{g.moneda && g.moneda !== 'COP' ? ` · 1 ${g.moneda} = ${g.tasaCop} COP` : ''}{g.instruccionesPago ? ` · ${g.instruccionesPago}` : ''}</small>
                    </div>
                    {g.rol === 'administrador' && <span className="pill">{t('group_admin_badge')}</span>}
                  </header>
                  <AvatarStack users={g.miembros} />
                  <details className="group-members">
                    <summary>{t('group_view_members', { count: g.miembros.length, max: MAX_MEMBERS_PER_GROUP })}</summary>
                    <ul>
                      {g.miembros.map(miembro => (
                        <li key={miembro.id}>
                          <span>
                            <strong>{miembro.nombre || miembro.email}</strong>
                            {miembro.email && <small>{miembro.email}</small>}
                          </span>
                          <small>{miembro.rol === 'administrador' ? t('group_admin_badge') : t('group_members')}</small>
                        </li>
                      ))}
                    </ul>
                  </details>
                  <div className="kv-grid">
                    <div className="kv"><small>{t('group_total_expenses')}</small><strong>{money(g.total_gastos)}</strong></div>
                    <div className="kv"><small>{t('group_my_balance')}</small><strong className={g.mi_balance < 0 ? 'neg' : 'pos'}>{money(g.mi_balance)}</strong></div>
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
                    <Link className="card-link" to={`/gastos?grupo=${g.id}`}>{t('group_view_expenses', { count: g.num_gastos })} <Icon name="arrow" size={15} /></Link>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => setAlcanciaGrupo(g)}>
                        <Icon name="safe" size={14} />Alcancía
                      </button>
                      {g.rol === 'administrador' && (
                        <button className="btn btn-ghost btn-xs" disabled={g.miembros.length >= MAX_MEMBERS_PER_GROUP} onClick={() => setAdding(g)}><Icon name="plus" size={14} />{t('group_add_member')}</button>
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
