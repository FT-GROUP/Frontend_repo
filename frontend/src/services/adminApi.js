import { request } from './http'

export const adminApi = {
  async users() {
    const data = await request('/administracion/usuarios', { auth: true })
    return data.usuarios
  },

  async changeStatus(id, estado) {
    const data = await request(`/administracion/usuarios/${id}/estado`, {
      method: 'PATCH',
      auth: true,
      body: { estado },
    })
    return data.usuario
  },

  async changeRole(id, rol) {
    const data = await request(`/administracion/usuarios/${id}/rol`, {
      method: 'PATCH',
      auth: true,
      body: { rol },
    })
    return data.usuario
  },
}
