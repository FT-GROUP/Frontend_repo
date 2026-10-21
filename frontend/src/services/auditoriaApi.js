import { request } from './http'

const DEMO_EVENTOS = [
  { id: '1', creado_en: new Date(Date.now() - 60000).toISOString(), actor_email: 'supervisor@ftgroup.test', rol: 'supervisor', accion: 'GET /api/auditoria/', ruta: '/api/auditoria/', codigo_estado: 200 },
  { id: '2', creado_en: new Date(Date.now() - 120000).toISOString(), actor_email: 'supervisor@ftgroup.test', rol: 'supervisor', accion: 'GET /api/estado', ruta: '/api/estado', codigo_estado: 200 },
  { id: '3', creado_en: new Date(Date.now() - 300000).toISOString(), actor_email: 'moderador@ftgroup.test', rol: 'moderador', accion: 'GET /api/administracion/usuarios', ruta: '/api/administracion/usuarios', codigo_estado: 200 },
  { id: '4', creado_en: new Date(Date.now() - 600000).toISOString(), actor_email: 'usuario@ftgroup.test', rol: 'usuario', accion: 'POST /api/grupos/1/gastos', ruta: '/api/grupos/1/gastos', codigo_estado: 201 },
  { id: '5', creado_en: new Date(Date.now() - 900000).toISOString(), actor_email: 'demo@ftgroup.com', rol: 'supervisor', accion: 'POST /api/auth/login', ruta: '/api/auth/login', codigo_estado: 200 },
]

export const auditoriaApi = {
  async list(filters) {
    const params = new URLSearchParams()
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) params.set(key, value)
    })
    try {
      return await request(`/auditoria?${params}`, { auth: true })
    } catch (err) {
      if (err.status === 0 || err.status === 404 || err.status === 502) {
        return DEMO_EVENTOS
      }
      throw err
    }
  },

  async record(accion) {
    try {
      return await request('/auditoria/eventos', {
        method: 'POST',
        auth: true,
        body: { accion },
      })
    } catch {
      return null
    }
  },
}
