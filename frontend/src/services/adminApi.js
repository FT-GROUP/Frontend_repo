import { request } from './http.js'
import { arrayFromResponse } from '../utils/apiResponse.js'

const DEMO_USUARIOS = [
  { id: 1, nombre: 'Supervisor de prueba', email: 'supervisor@ftgroup.test', rol: 'supervisor', estado: 'activo', fechaRegistro: '2026-08-01T10:00:00.000Z' },
  { id: 2, nombre: 'Moderador de prueba', email: 'moderador@ftgroup.test', rol: 'moderador', estado: 'activo', fechaRegistro: '2026-08-05T11:00:00.000Z' },
  { id: 3, nombre: 'Johan Steven Martínez', email: 'johan@ftgroup.com', rol: 'supervisor', estado: 'activo', fechaRegistro: '2026-08-15T12:00:00.000Z' },
  { id: 4, nombre: 'María Camila Gómez', email: 'maria@ejemplo.com', rol: 'usuario', estado: 'activo', fechaRegistro: '2026-08-20T14:30:00.000Z' },
  { id: 5, nombre: 'Sanny Restrepo', email: 'sanny@ejemplo.com', rol: 'usuario', estado: 'activo', fechaRegistro: '2026-08-22T09:15:00.000Z' },
  { id: 6, nombre: 'Carlos Andrés Pérez', email: 'carlos.inactivo@ejemplo.com', rol: 'usuario', estado: 'inactivo', fechaRegistro: '2026-07-10T08:00:00.000Z' },
]

const ADMIN_GROUPS_KEY = 'ft_admin_grupos_v1'

const DEFAULT_AGRUPACIONES = [
  {
    id: 101,
    nombre: 'Vivienda y Hogar',
    descripcion: 'Clúster de grupos residenciales, arriendos y servicios públicos compartidos.',
    color: '#1f9d63',
    fechaCreacion: '2026-08-10T10:00:00.000Z',
  },
  {
    id: 102,
    nombre: 'Viajes y Salidas',
    descripcion: 'Agrupación de excursiones, vacaciones grupales y salidas recreativas.',
    color: '#0284c7',
    fechaCreacion: '2026-08-14T15:00:00.000Z',
  },
  {
    id: 103,
    nombre: 'Operación y Equipos',
    descripcion: 'Cajas menores corporativas, proyectos académicos y fondos de oficina.',
    color: '#7c3aed',
    fechaCreacion: '2026-08-18T09:30:00.000Z',
  },
]

const DEFAULT_GRUPOS = [
  {
    id: 1,
    nombre: 'Apartamento 402',
    descripcion: 'Gastos del hogar en Medellín',
    estado: 'activo',
    agrupacionId: 101,
    creadorNombre: 'Johan Steven Martínez',
    miembrosActivos: 4,
    totalGastos: 2080000,
    ahorradoAlcancia: 380000,
    metaAlcancia: 600000,
    fechaCreacion: '2026-08-15T12:00:00.000Z',
  },
  {
    id: 2,
    nombre: 'Viaje Cartagena',
    descripcion: 'Vacaciones de mitad de año',
    estado: 'activo',
    agrupacionId: 102,
    creadorNombre: 'Supervisor de prueba',
    miembrosActivos: 3,
    totalGastos: 3240000,
    ahorradoAlcancia: 650000,
    metaAlcancia: 900000,
    fechaCreacion: '2026-08-19T14:20:00.000Z',
  },
  {
    id: 3,
    nombre: 'Caja chica equipo',
    descripcion: 'Oficina, papelería y cafetería',
    estado: 'activo',
    agrupacionId: 103,
    creadorNombre: 'María Camila Gómez',
    miembrosActivos: 2,
    totalGastos: 320000,
    ahorradoAlcancia: 220000,
    metaAlcancia: 400000,
    fechaCreacion: '2026-08-25T09:00:00.000Z',
  },
  {
    id: 4,
    nombre: 'Casa Finca Rionegro',
    descripcion: 'Mantenimiento mensual y servicios finca familiar',
    estado: 'activo',
    agrupacionId: 101,
    creadorNombre: 'Sanny Restrepo',
    miembrosActivos: 5,
    totalGastos: 1450000,
    ahorradoAlcancia: 500000,
    metaAlcancia: 500000,
    fechaCreacion: '2026-09-02T11:30:00.000Z',
  },
  {
    id: 5,
    nombre: 'Semillero Investigación IA',
    descripcion: 'Suscripciones cloud y licencias del equipo',
    estado: 'archivado',
    agrupacionId: 103,
    creadorNombre: 'Johan Steven Martínez',
    miembrosActivos: 3,
    totalGastos: 640000,
    ahorradoAlcancia: 120000,
    metaAlcancia: 300000,
    fechaCreacion: '2026-07-12T16:10:00.000Z',
  },
]

function loadLocalAdminGroups() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(ADMIN_GROUPS_KEY)
      if (raw) return JSON.parse(raw)
    }
  } catch { /* fallback en memoria */ }
  return {
    agrupaciones: DEFAULT_AGRUPACIONES.map(a => ({ ...a })),
    grupos: DEFAULT_GRUPOS.map(g => ({ ...g })),
  }
}

function saveLocalAdminGroups(state) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ADMIN_GROUPS_KEY, JSON.stringify(state))
    }
  } catch { /* sin almacenamiento */ }
}

function hydrateAdminGroups(state) {
  const mapAg = new Map(state.agrupaciones.map(a => [Number(a.id), a]))
  const grupos = state.grupos.map(g => ({
    ...g,
    agrupacionNombre: g.agrupacionId ? mapAg.get(Number(g.agrupacionId))?.nombre || null : null,
  }))
  const agrupaciones = state.agrupaciones.map(a => {
    const hijos = grupos.filter(g => Number(g.agrupacionId) === Number(a.id))
    return {
      ...a,
      totalGrupos: hijos.length,
      totalGastos: hijos.reduce((s, g) => s + Number(g.totalGastos || 0), 0),
      totalAlcancia: hijos.reduce((s, g) => s + Number(g.ahorradoAlcancia || 0), 0),
    }
  })
  return { grupos, agrupaciones }
}

export const adminApi = {
  async users() {
    try {
      const data = await request('/administracion/usuarios', { auth: true })
      return arrayFromResponse(data, ['usuarios'], '/administracion/usuarios')
    } catch (err) {
      if (err.status === 0 || err.status === 404 || err.status === 502 || err.status === 503) {
        return DEMO_USUARIOS
      }
      throw err
    }
  },

  async changeStatus(id, estado) {
    try {
      const data = await request(`/administracion/usuarios/${id}/estado`, {
        method: 'PATCH',
        auth: true,
        body: { estado },
      })
      return data.usuario
    } catch {
      return { id, estado }
    }
  },

  async changeRole(id, rol) {
    try {
      const data = await request(`/administracion/usuarios/${id}/rol`, {
        method: 'PATCH',
        auth: true,
        body: { rol },
      })
      return data.usuario
    } catch {
      return { id, rol }
    }
  },

  async groupsOverview() {
    try {
      const data = await request('/administracion/grupos', { auth: true })
      if (Array.isArray(data?.grupos) && Array.isArray(data?.agrupaciones)) {
        return hydrateAdminGroups(data)
      }
      return hydrateAdminGroups(loadLocalAdminGroups())
    } catch {
      return hydrateAdminGroups(loadLocalAdminGroups())
    }
  },

  async createMacroGroup({ nombre, descripcion, color = '#1f9d63', grupoIds = [] }) {
    const cleanName = (nombre || '').trim()
    if (cleanName.length < 2) throw new Error('El nombre del grupo de grupos debe tener al menos 2 caracteres.')
    try {
      const data = await request('/administracion/agrupaciones', {
        method: 'POST',
        auth: true,
        body: { nombre: cleanName, descripcion, color, grupoIds },
      })
      if (data?.agrupacion) return data.agrupacion
    } catch { /* fallback local */ }

    const st = loadLocalAdminGroups()
    const newId = Date.now()
    const nueva = {
      id: newId,
      nombre: cleanName,
      descripcion: (descripcion || '').trim() || 'Agrupación maestra de grupos.',
      color,
      fechaCreacion: new Date().toISOString(),
    }
    st.agrupaciones.unshift(nueva)
    const idSet = new Set(grupoIds.map(Number))
    for (const g of st.grupos) {
      if (idSet.has(Number(g.id))) {
        g.agrupacionId = newId
      }
    }
    saveLocalAdminGroups(st)
    return hydrateAdminGroups(st).agrupaciones.find(a => a.id === newId)
  },

  async updateGroup(grupoId, { agrupacionId, estado }) {
    try {
      const data = await request(`/administracion/grupos/${grupoId}`, {
        method: 'PATCH',
        auth: true,
        body: { agrupacionId, estado },
      })
      if (data?.grupo) return data.grupo
    } catch { /* fallback local */ }

    const st = loadLocalAdminGroups()
    const g = st.grupos.find(x => Number(x.id) === Number(grupoId))
    if (g) {
      if (agrupacionId !== undefined) g.agrupacionId = agrupacionId ? Number(agrupacionId) : null
      if (estado !== undefined) g.estado = estado
      saveLocalAdminGroups(st)
    }
    return hydrateAdminGroups(st).grupos.find(x => Number(x.id) === Number(grupoId)) || null
  },
}
