import { request } from './http'

export const estadoSistemaApi = {
  consultar() {
    return request('/estado', { auth: true })
  },
}
