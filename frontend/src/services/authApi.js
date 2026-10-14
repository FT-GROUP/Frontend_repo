// Módulo de usuarios / autenticación — conectado al backend real (/api/auth).
import { request, tokens, refreshSession } from './http'

export const authApi = {
  async login(email, password) {
    const data = await request('/auth/login', { method: 'POST', body: { email, password } })
    tokens.save(data)
    return data.usuario
  },

  register({ nombre, email, password, telefono }) {
    const body = { nombre, email, password }
    if (telefono?.trim()) body.telefono = telefono.trim()
    return request('/auth/registro', { method: 'POST', body })
  },

  async me() {
    const data = await request('/auth/me', { auth: true })
    return data.usuario
  },

  /** Restaura la sesión guardada (renovando el token si hace falta). */
  async restore() {
    if (!tokens.access && !tokens.refresh) return null
    try {
      return await this.me()
    } catch {
      await refreshSession()
      return this.me()
    }
  },

  async updateProfile(payload) {
    const data = await request('/auth/me', { method: 'PUT', auth: true, body: payload })
    return data.usuario
  },

  async deactivate() {
    const data = await request('/auth/me', { method: 'DELETE', auth: true })
    return data.usuario
  },

  async logout() {
    try {
      if (tokens.refresh) {
        await request('/auth/logout', { method: 'POST', body: { refreshToken: tokens.refresh } })
      }
    } finally {
      tokens.clear()
    }
  },

  hasSession: () => Boolean(tokens.access || tokens.refresh),
}
