import { request } from './http'

export const auditoriaApi = {
  async list(filters) {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) params.set(key, value)
    })
    return request(`/auditoria?${params}`, { auth: true })
  },

  record(accion) {
    return request('/auditoria/eventos', {
      method: 'POST',
      auth: true,
      body: { accion },
    })
  },
}
