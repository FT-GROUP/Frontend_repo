// Módulos financieros: grupos, gastos, balances, historial y recibos.
//
// Modo "api" (por defecto): todo se guarda en PostgreSQL a través del
// backend (/api/grupos, /api/gastos, /api/balances, /api/panel, /api/historial).
//
// Modo "local" (VITE_FINANCE_MODE=local): demostración sin backend; guarda
// los datos en el navegador con la misma estructura de tablas.

import { request } from './http.js'
import { splitEqual, pendingDebts, netBalances, pairwise } from '../utils/balances.js'
import { today } from '../utils/format.js'
import { arrayFromResponse } from '../utils/apiResponse.js'
import { usesLocalFinance as shouldUseLocalFinance } from '../utils/demoAccount.js'
import { auditoriaApi } from './auditoriaApi.js'

const MODE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FINANCE_MODE) || 'api'
const delay = (ms = 150) => new Promise(r => setTimeout(r, ms))

/* ------------------------------------------------------------------ */
/* Persistencia local                                                  */
/* ------------------------------------------------------------------ */
const storeKey = uid => `ft_finanzas_${uid}`
const uidGen = p => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

function emptyState(user) {
  return {
    usuarios: [{ id: String(user.id), nombre: user.nombre, email: user.email }],
    grupos: [], miembros: [], gastos: [], divisiones: [], historial: [], recibos: [],
    alcancias: [], aportes_alcancia: [], agrupaciones: [],
  }
}

function hydrateExtendedState(st, user) {
  const me = String(user.id)
  if (!Array.isArray(st.agrupaciones) || (st.demo && st.agrupaciones.length === 0)) {
    st.agrupaciones = [
      { id: 'ag-hogar', nombre: 'Vivienda y Hogar', descripcion: 'Gastos fijos residenciales y servicios', color: '#1f9d63' },
      { id: 'ag-viajes', nombre: 'Viajes y Salidas', descripcion: 'Excursiones, vacaciones y recreación', color: '#0284c7' },
      { id: 'ag-trabajo', nombre: 'Operación y Equipos', descripcion: 'Cajas menores y proyectos laborales', color: '#7c3aed' },
    ]
  }
  const mapAgrupacion = { 'g-apto': 'ag-hogar', 'g-viaje': 'ag-viajes', 'g-caja': 'ag-trabajo' }
  for (const g of st.grupos || []) {
    if (g.agrupacion_id === undefined && mapAgrupacion[g.id]) {
      g.agrupacion_id = mapAgrupacion[g.id]
    }
  }
  if (!Array.isArray(st.alcancias)) st.alcancias = []
  if (!Array.isArray(st.aportes_alcancia)) st.aportes_alcancia = []
  if (st.demo && st.alcancias.length === 0 && (st.grupos || []).some(g => g.id === 'g-apto')) {
    const hoy = today()
    st.alcancias.push(
      { grupo_id: 'g-apto', nombre: 'Fondo de imprevistos y mejoras', meta: 600000, ahorrado: 380000 },
      { grupo_id: 'g-viaje', nombre: 'Tour Islas del Rosario y lancha', meta: 900000, ahorrado: 650000 },
      { grupo_id: 'g-caja', nombre: 'Reserva cafetera y equipos', meta: 400000, ahorrado: 220000 },
    )
    st.aportes_alcancia.push(
      { id: 'ap-1', grupo_id: 'g-apto', usuario_id: me, monto: 150000, nota: 'Aporte inicial fondo hogar', fecha: hoy },
      { id: 'ap-2', grupo_id: 'g-apto', usuario_id: 'u-johan', monto: 130000, nota: 'Cuota mantenimiento', fecha: hoy },
      { id: 'ap-3', grupo_id: 'g-apto', usuario_id: 'u-sanny', monto: 100000, nota: 'Reserva reparaciones', fecha: hoy },
      { id: 'ap-4', grupo_id: 'g-viaje', usuario_id: me, monto: 250000, nota: 'Reserva lancha privada', fecha: hoy },
      { id: 'ap-5', grupo_id: 'g-viaje', usuario_id: 'u-johan', monto: 200000, nota: 'Aporte excursión islas', fecha: hoy },
      { id: 'ap-6', grupo_id: 'g-viaje', usuario_id: 'u-sanny', monto: 200000, nota: 'Aporte excursión islas', fecha: hoy },
      { id: 'ap-7', grupo_id: 'g-caja', usuario_id: me, monto: 120000, nota: 'Fondo insumos trimestral', fecha: hoy },
      { id: 'ap-8', grupo_id: 'g-caja', usuario_id: 'u-maria', monto: 100000, nota: 'Aporte caja ahorro oficina', fecha: hoy },
    )
  }
  return st
}

const memoryStore = new Map()

function load(user) {
  const key = storeKey(user.id)
  try {
    const raw = typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function'
      ? localStorage.getItem(key)
      : memoryStore.get(key)
    if (raw) {
      const st = hydrateExtendedState(JSON.parse(raw), user)
      // Mantener sincronizado el nombre del usuario autenticado.
      const me = st.usuarios.find(u => u.id === String(user.id))
      if (me) me.nombre = user.nombre
      return st
    }
  } catch { /* datos corruptos: se regeneran */ }
  const st = demoState(user)
  save(user, st)
  return st
}
function save(user, st) {
  const key = storeKey(user.id)
  const serialized = JSON.stringify(st)
  memoryStore.set(key, serialized)
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem(key, serialized)
    }
  } catch { /* sin almacenamiento */ }
}

function addHistorial(st, me, grupo_id, tipo_movimiento, descripcion, gasto_id = null) {
  st.historial.unshift({ id: uidGen('h'), usuario_id: me, grupo_id, gasto_id, tipo_movimiento, descripcion, fecha: new Date().toISOString() })
}

/* ------------------------------------------------------------------ */
/* Datos de demostración (basados en el prototipo)                     */
/* ------------------------------------------------------------------ */
function demoState(user) {
  const me = String(user.id)
  const st = emptyState(user)
  st.usuarios.push(
    { id: 'u-johan', nombre: 'Johan', email: 'johan@ejemplo.com' },
    { id: 'u-sanny', nombre: 'Sanny', email: 'sanny@ejemplo.com' },
    { id: 'u-maria', nombre: 'María', email: 'maria@ejemplo.com' },
  )
  const now = new Date()
  const ym = (offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  const cur = ym(0), prev = ym(-1)
  const day = Math.min(now.getDate(), 28)
  const d = (m, n) => `${m}-${String(Math.min(n, m === cur ? day : 28)).padStart(2, '0')}`

  const grupos = [
    { id: 'g-apto', nombre: 'Apartamento 402', descripcion: 'Gastos del hogar', icono: 'building', ciudad: 'Medellín', lat: 6.2442, lng: -75.5812, miembros: [me, 'u-johan', 'u-sanny', 'u-maria'] },
    { id: 'g-viaje', nombre: 'Viaje Cartagena', descripcion: 'Vacaciones de mitad de año', icono: 'plane', ciudad: 'Cartagena', lat: 10.391, lng: -75.4794, miembros: [me, 'u-johan', 'u-sanny'] },
    { id: 'g-caja', nombre: 'Caja chica equipo', descripcion: 'Oficina y papelería', icono: 'safe', ciudad: 'Bogotá', lat: 4.711, lng: -74.0721, miembros: [me, 'u-maria'] },
  ]
  for (const g of grupos) {
    const { miembros, ...rest } = g
    st.grupos.push({ ...rest, creado_por: me, fecha_creacion: `${prev}-01`, estado: 'activo' })
    miembros.forEach((u, i) => st.miembros.push({ grupo_id: g.id, usuario_id: u, rol: i === 0 ? 'administrador' : 'miembro', estado: 'activo' }))
  }

  const gastos = [
    ['Arriendo del mes', 'g-apto', 'u-johan', 1200000, d(cur, 1), 'vivienda', ['u-sanny']],
    ['Servicios públicos', 'g-apto', 'u-johan', 280000, d(cur, 3), 'servicios', [me, 'u-sanny', 'u-maria']],
    ['Papelería y suministros', 'g-caja', 'u-maria', 320000, d(cur, 5), 'oficina', []],
    ['Mercado semanal', 'g-apto', 'u-sanny', 360000, d(cur, 7), 'alimentacion', ['u-johan']],
    ['Cena de bienvenida', 'g-apto', me, 240000, d(cur, 10), 'entretenimiento', ['u-sanny']],
    ['Tiquetes de avión', 'g-viaje', me, 1260000, d(prev, 18), 'transporte', ['u-johan']],
    ['Hotel Caribe – 3 noches', 'g-viaje', 'u-johan', 1980000, d(prev, 22), 'alojamiento', [me, 'u-sanny']],
  ]
  gastos.forEach(([descripcion, grupo_id, pagador_id, monto_total, fecha_gasto, categoria, pagados], idx) => {
    const id = `e-${idx + 1}`
    const miembros = st.miembros.filter(m => m.grupo_id === grupo_id).map(m => m.usuario_id)
    st.gastos.push({ id, grupo_id, pagador_id, descripcion, monto_total, fecha_gasto, categoria, tipo_division: 'equitativa', origen_registro: 'manual', fecha_registro: fecha_gasto })
    for (const div of splitEqual(monto_total, miembros)) {
      const pagado = div.usuario_id === pagador_id || pagados.includes(div.usuario_id)
      st.divisiones.push({ gasto_id: id, ...div, estado_pago: pagado ? 'pagado' : 'pendiente', fecha_pago: pagado ? fecha_gasto : null })
    }
  })
  st.demo = true
  return hydrateExtendedState(st, user)
}

/* ------------------------------------------------------------------ */
/* Vistas derivadas                                                    */
/* ------------------------------------------------------------------ */
function viewGroups(st, me) {
  const misGrupos = st.grupos.filter(g => g.estado === 'activo' && st.miembros.some(m => m.grupo_id === g.id && m.usuario_id === me && m.estado === 'activo'))
  const debts = pendingDebts(st.gastos, st.divisiones)
  const usuarios = new Map(st.usuarios.map(u => [u.id, u]))
  const agrupaciones = new Map((st.agrupaciones || []).map(a => [a.id, a]))
  return misGrupos.map(g => {
    const miembros = st.miembros.filter(m => m.grupo_id === g.id && m.estado === 'activo')
      .map(m => ({ ...st.usuarios.find(u => u.id === m.usuario_id), rol: m.rol }))
    const gastos = st.gastos.filter(x => x.grupo_id === g.id)
    const deudasGrupo = debts.filter(x => x.grupo_id === g.id)
    const net = netBalances(deudasGrupo)
    const alcRaw = (st.alcancias || []).find(a => a.grupo_id === g.id) || {
      grupo_id: g.id,
      nombre: `Alcancía ${g.nombre}`,
      meta: 0,
      ahorrado: 0,
    }
    const aportes = (st.aportes_alcancia || [])
      .filter(ap => ap.grupo_id === g.id)
      .map(ap => ({
        ...ap,
        usuario: usuarios.get(ap.usuario_id)?.nombre || 'Integrante',
      }))
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    const ahorrado = Number(alcRaw.ahorrado || 0)
    const meta = Number(alcRaw.meta || 0)
    const progreso = meta > 0 ? Math.min(100, Math.round((ahorrado / meta) * 100)) : (ahorrado > 0 ? 100 : 0)
    const agrupacion = g.agrupacion_id ? agrupaciones.get(g.agrupacion_id) || null : null
    return {
      ...g,
      agrupacion,
      miembros,
      rol: miembros.find(m => m.id === me)?.rol,
      total_gastos: gastos.reduce((s, x) => s + x.monto_total, 0),
      num_gastos: gastos.length,
      mi_balance: Math.round(net[me] || 0),
      liquidaciones: pairwise(deudasGrupo),
      alcancia: {
        nombre: alcRaw.nombre || `Alcancía ${g.nombre}`,
        meta,
        ahorrado,
        progreso,
        aportes,
      },
    }
  })
}

function viewExpenses(st, me) {
  const grupos = new Map(st.grupos.map(g => [g.id, g]))
  const usuarios = new Map(st.usuarios.map(u => [u.id, u]))
  const visibles = new Set(viewGroups(st, me).map(g => g.id))
  return st.gastos
    .filter(g => visibles.has(g.grupo_id))
    .map(g => {
      const divs = st.divisiones.filter(d => d.gasto_id === g.id)
      const mia = divs.find(d => d.usuario_id === me)
      const pendientesOtros = g.pagador_id === me
        ? divs.filter(d => d.usuario_id !== me && d.estado_pago === 'pendiente').reduce((s, d) => s + d.monto_asignado, 0) : 0
      return {
        ...g,
        grupo: grupos.get(g.grupo_id),
        pagador: usuarios.get(g.pagador_id),
        personas: divs.length,
        divisiones: divs.map(d => ({ ...d, usuario: usuarios.get(d.usuario_id) })),
        mi_parte: mia?.monto_asignado || 0,
        mi_estado: !mia ? 'no_participa' : g.pagador_id === me ? 'pagador' : mia.estado_pago,
        me_deben: pendientesOtros,
      }
    })
    .sort((a, b) => b.fecha_gasto.localeCompare(a.fecha_gasto) || String(b.fecha_registro).localeCompare(String(a.fecha_registro)))
}

/* ------------------------------------------------------------------ */
/* Implementación local                                                */
/* ------------------------------------------------------------------ */
const local = {
  async summary(user) {
    await delay()
    const st = load(user), me = String(user.id)
    const grupos = viewGroups(st, me)
    const usuarios = new Map(st.usuarios.map(u => [u.id, u]))
    let teDeben = 0, debes = 0
    const liquidaciones = []
    for (const g of grupos) {
      for (const p of g.liquidaciones) {
        if (p.para === me) teDeben += p.monto
        if (p.de === me) debes += p.monto
        liquidaciones.push({ ...p, grupo_id: g.id, grupo: g.nombre, deUsuario: usuarios.get(p.de), paraUsuario: usuarios.get(p.para) })
      }
    }
    liquidaciones.sort((a, b) => (b.de === me || b.para === me) - (a.de === me || a.para === me) || b.monto - a.monto)
    return { grupos, teDeben, debes, balance: teDeben - debes, liquidaciones, demo: !!st.demo }
  },

  async groups(user) { await delay(); return viewGroups(load(user), String(user.id)) },

  async createGroup(user, { nombre, descripcion, icono, ciudad, lat, lng, integrantes }) {
    await delay()
    const st = load(user), me = String(user.id)
    const id = uidGen('g-')
    st.grupos.push({ id, nombre: nombre.trim(), descripcion: descripcion?.trim() || null, icono, ciudad, lat, lng, creado_por: me, fecha_creacion: today(), estado: 'activo' })
    st.miembros.push({ grupo_id: id, usuario_id: me, rol: 'administrador', estado: 'activo' })
    for (const inv of integrantes) {
      const email = inv.email?.trim().toLowerCase()
      let u = email ? st.usuarios.find(x => x.email === email) : null
      if (!u) {
        u = { id: uidGen('u-'), nombre: inv.nombre?.trim() || email.split('@')[0], email: email || null }
        st.usuarios.push(u)
      }
      if (u.id !== me && !st.miembros.some(m => m.grupo_id === id && m.usuario_id === u.id)) {
        st.miembros.push({ grupo_id: id, usuario_id: u.id, rol: 'miembro', estado: 'activo' })
        addHistorial(st, me, id, 'miembro_agregado', `${u.nombre} se unió al grupo`)
      }
    }
    save(user, st)
    return viewGroups(st, me).find(g => g.id === id)
  },

  async addMember(user, grupoId, email) {
    await delay()
    const st = load(user), me = String(user.id)
    const e = email.trim().toLowerCase()
    let u = st.usuarios.find(x => x.email === e)
    if (!u) { u = { id: uidGen('u-'), nombre: e.split('@')[0], email: e }; st.usuarios.push(u) }
    if (st.miembros.some(m => m.grupo_id === grupoId && m.usuario_id === u.id)) throw new Error(`${u.nombre} ya pertenece al grupo.`)
    st.miembros.push({ grupo_id: grupoId, usuario_id: u.id, rol: 'miembro', estado: 'activo' })
    addHistorial(st, me, grupoId, 'miembro_agregado', `${u.nombre} se unió al grupo`)
    save(user, st)
  },

  async history(user) {
    await delay()
    const st = load(user)
    const grupos = new Map(st.grupos.map(g => [g.id, g]))
    const usuarios = new Map(st.usuarios.map(u => [u.id, u]))
    return st.historial.slice(0, 50).map(h => ({ ...h, usuario: usuarios.get(h.usuario_id), grupo: grupos.get(h.grupo_id) }))
  },

  async archiveGroup(user, grupoId) {
    await delay()
    const st = load(user)
    const g = st.grupos.find(x => x.id === grupoId)
    if (g) g.estado = 'archivado'
    save(user, st)
  },

  async expenses(user) { await delay(); return viewExpenses(load(user), String(user.id)) },

  async createExpense(user, { grupo_id, pagador_id, descripcion, monto_total, fecha_gasto, categoria, tipo_division, divisiones, origen_registro = 'manual', recibo }) {
    await delay()
    const st = load(user), me = String(user.id)
    const total = Math.round(Number(monto_total))
    if (!(total > 0)) throw new Error('El monto debe ser mayor que cero.')
    const suma = divisiones.reduce((s, d) => s + Math.round(Number(d.monto_asignado) || 0), 0)
    if (suma !== total) throw new Error('La suma de las partes debe ser igual al monto total.')
    const id = uidGen('e-')
    st.gastos.push({ id, grupo_id, pagador_id, descripcion: descripcion.trim(), monto_total: total, fecha_gasto, categoria, tipo_division, origen_registro, fecha_registro: new Date().toISOString() })
    for (const d of divisiones) {
      const monto = Math.round(Number(d.monto_asignado) || 0)
      if (monto <= 0 && tipo_division === 'personalizada') continue
      const pagado = d.usuario_id === pagador_id
      st.divisiones.push({ gasto_id: id, usuario_id: d.usuario_id, monto_asignado: monto, estado_pago: pagado ? 'pagado' : 'pendiente', fecha_pago: pagado ? fecha_gasto : null })
    }
    if (recibo) st.recibos.push({ id: uidGen('r-'), gasto_id: id, ...recibo, estado_validacion: 'confirmado', fecha_procesamiento: new Date().toISOString() })
    addHistorial(st, me, grupo_id, 'gasto_creado', descripcion, id)
    save(user, st)
    return id
  },

  async deleteExpense(user, gastoId) {
    await delay()
    const st = load(user)
    st.gastos = st.gastos.filter(g => g.id !== gastoId)
    st.divisiones = st.divisiones.filter(d => d.gasto_id !== gastoId)
    save(user, st)
  },

  /** Registrar el pago de una parte (DIVISION_GASTO.estado_pago = pagado). */
  async payShare(user, gastoId, usuarioId = String(user.id)) {
    await delay()
    const st = load(user)
    const d = st.divisiones.find(x => x.gasto_id === gastoId && x.usuario_id === usuarioId)
    if (d) { d.estado_pago = 'pagado'; d.fecha_pago = new Date().toISOString() }
    const g = st.gastos.find(x => x.id === gastoId)
    addHistorial(st, String(user.id), g?.grupo_id, 'pago_registrado', `Pago de ${g?.descripcion}`, gastoId)
    save(user, st)
  },

  /** Salda todas las deudas pendientes entre dos personas dentro de un grupo. */
  async settle(user, { grupo_id, de, para }) {
    await delay()
    const st = load(user)
    const gastos = new Set(st.gastos.filter(g => g.grupo_id === grupo_id && g.pagador_id === para).map(g => g.id))
    const ahora = new Date().toISOString()
    for (const d of st.divisiones) {
      if (gastos.has(d.gasto_id) && d.usuario_id === de && d.estado_pago === 'pendiente') {
        d.estado_pago = 'pagado'; d.fecha_pago = ahora
      }
    }
    // El saldo es neto por pares: también se cierran las deudas en sentido contrario.
    const inversos = new Set(st.gastos.filter(g => g.grupo_id === grupo_id && g.pagador_id === de).map(g => g.id))
    for (const d of st.divisiones) {
      if (inversos.has(d.gasto_id) && d.usuario_id === para && d.estado_pago === 'pendiente') {
        d.estado_pago = 'pagado'; d.fecha_pago = ahora
      }
    }
    addHistorial(st, String(user.id), grupo_id, 'pago_registrado', 'Liquidación registrada')
    save(user, st)
  },

  /** Configura el nombre y la meta de ahorro de la alcancía compartida de un grupo. */
  async configureAlcancia(user, grupoId, { nombre, meta }) {
    await delay()
    const st = load(user), me = String(user.id)
    const metaNum = Math.max(0, Math.round(Number(meta) || 0))
    const cleanName = (nombre || '').trim() || 'Alcancía del grupo'
    let alc = st.alcancias.find(a => a.grupo_id === grupoId)
    if (!alc) {
      alc = { grupo_id: grupoId, nombre: cleanName, meta: metaNum, ahorrado: 0 }
      st.alcancias.push(alc)
    } else {
      alc.nombre = cleanName
      alc.meta = metaNum
    }
    addHistorial(st, me, grupoId, 'alcancia_configurada', `Meta de alcancía actualizada: ${cleanName}`)
    save(user, st)
    return viewGroups(st, me).find(g => g.id === grupoId)?.alcancia
  },

  /** Registra un nuevo aporte monetario en la alcancía del grupo. */
  async contributeAlcancia(user, grupoId, { monto, nota }) {
    await delay()
    const st = load(user), me = String(user.id)
    const valor = Math.round(Number(monto) || 0)
    if (!(valor > 0)) throw new Error('El aporte debe ser mayor que cero.')
    let alc = st.alcancias.find(a => a.grupo_id === grupoId)
    if (!alc) {
      const grp = st.grupos.find(g => g.id === grupoId)
      alc = { grupo_id: grupoId, nombre: `Alcancía ${grp?.nombre || ''}`.trim(), meta: valor * 2, ahorrado: 0 }
      st.alcancias.push(alc)
    }
    alc.ahorrado = Number(alc.ahorrado || 0) + valor
    const ap = {
      id: uidGen('ap-'),
      grupo_id: grupoId,
      usuario_id: me,
      monto: valor,
      nota: nota?.trim() || 'Aporte voluntario',
      fecha: today(),
    }
    st.aportes_alcancia.unshift(ap)
    addHistorial(st, me, grupoId, 'aporte_alcancia', `Aporte a alcancía (${alc.nombre}): ${ap.nota}`)
    save(user, st)
    return viewGroups(st, me).find(g => g.id === grupoId)?.alcancia
  },

  async resetDemo(user, { empty = false } = {}) {
    const st = empty ? emptyState(user) : demoState(user)
    save(user, st)
  },
}

/* ------------------------------------------------------------------ */
/* Implementación remota: backend + PostgreSQL                         */
/* ------------------------------------------------------------------ */
const remote = {
  // Las respuestas del backend usan los mismos nombres de campos que el modo local.
  summary: () => request('/panel/resumen', { auth: true }),
  async groups() {
    const response = await request('/grupos', { auth: true })
    return arrayFromResponse(response, ['grupos'], '/grupos')
  },
  createGroup: (_u, body) => request('/grupos', { method: 'POST', auth: true, body }),
  addMember: (_u, id, email) => request(`/grupos/${id}/miembros`, { method: 'POST', auth: true, body: { email } }),
  async history() {
    const response = await request('/historial?limite=50', { auth: true })
    return arrayFromResponse(response, ['historial', 'movimientos'], '/historial')
  },
  archiveGroup: (_u, id) => request(`/grupos/${id}`, { method: 'DELETE', auth: true }),
  async expenses() {
    const response = await request('/gastos', { auth: true })
    return arrayFromResponse(response, ['gastos'], '/gastos')
  },
  createExpense: (_u, body) => request('/gastos', { method: 'POST', auth: true, body }),
  deleteExpense: (_u, id) => request(`/gastos/${id}`, { method: 'DELETE', auth: true }),
  payShare: (u, gastoId, usuarioId = String(u.id)) =>
    request(`/gastos/${gastoId}/pagar`, { method: 'POST', auth: true, body: { usuario_id: usuarioId } }),
  settle: (_u, body) => request('/balances/liquidar', { method: 'POST', auth: true, body }),
  configureAlcancia: (_u, grupoId, body) =>
    request(`/grupos/${grupoId}/alcancia`, { method: 'PUT', auth: true, body }),
  contributeAlcancia: (_u, grupoId, body) =>
    request(`/grupos/${grupoId}/alcancia/aportes`, { method: 'POST', auth: true, body }),
  resetDemo: async () => {},
}

const ACCIONES_AUDITADAS = {
  summary: 'panel_consultar',
  groups: 'grupos_consultar',
  history: 'historial_consultar',
  expenses: 'gastos_consultar',
  createGroup: 'grupo_crear',
  addMember: 'miembro_agregar',
  archiveGroup: 'grupo_archivar',
  createExpense: 'gasto_crear',
  deleteExpense: 'gasto_eliminar',
  payShare: 'pago_registrar',
  settle: 'liquidacion_registrar',
  configureAlcancia: 'alcancia_configurar',
  contributeAlcancia: 'alcancia_aportar',
}

const localConAuditoria = new Proxy(local, {
  get(target, propiedad, receiver) {
    const metodo = Reflect.get(target, propiedad, receiver)
    if (typeof metodo !== 'function') return metodo

    return async (...argumentos) => {
      const resultado = await metodo.apply(target, argumentos)
      const accion = propiedad === 'resetDemo'
        ? (argumentos[1]?.empty ? 'datos_demo_borrar' : 'datos_demo_restaurar')
        : ACCIONES_AUDITADAS[propiedad]
      if (accion) {
        auditoriaApi.record(accion).catch(error => {
          console.error('No fue posible sincronizar la actividad local con la auditoría:', error)
        })
      }
      return resultado
    }
  },
})

function withFallback(remoteFn, localFn) {
  return async function (user, ...args) {
    if (shouldUseLocalFinance(user, MODE)) {
      return localFn(user, ...args)
    }
    try {
      return await remoteFn(user, ...args)
    } catch (err) {
      if (err.status === 0 || err.status === 404 || err.status === 502 || err.status === 503) {
        return localFn(user, ...args)
      }
      throw err
    }
  }
}

export const financeApi = {
  summary: withFallback(remote.summary, localConAuditoria.summary),
  groups: withFallback(remote.groups, localConAuditoria.groups),
  createGroup: withFallback(remote.createGroup, localConAuditoria.createGroup),
  addMember: withFallback(remote.addMember, localConAuditoria.addMember),
  history: withFallback(remote.history, localConAuditoria.history),
  archiveGroup: withFallback(remote.archiveGroup, localConAuditoria.archiveGroup),
  expenses: withFallback(remote.expenses, localConAuditoria.expenses),
  createExpense: withFallback(remote.createExpense, localConAuditoria.createExpense),
  deleteExpense: withFallback(remote.deleteExpense, localConAuditoria.deleteExpense),
  payShare: withFallback(remote.payShare, localConAuditoria.payShare),
  settle: withFallback(remote.settle, localConAuditoria.settle),
  configureAlcancia: withFallback(remote.configureAlcancia, localConAuditoria.configureAlcancia),
  contributeAlcancia: withFallback(remote.contributeAlcancia, localConAuditoria.contributeAlcancia),
  resetDemo: localConAuditoria.resetDemo,
}

export const financeMode = MODE
export const usesLocalFinance = user => shouldUseLocalFinance(user, MODE)
