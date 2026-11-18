// Módulo de usuarios / autenticación — conectado al backend real (/api/auth) con soporte de demo offline.
import { request, tokens, refreshSession } from './http'

const DEMO_USER_KEY = 'ft_current_user'

function saveLocalUser(user) {
  try {
    sessionStorage.setItem(DEMO_USER_KEY, JSON.stringify(user))
  } catch {}
}

export const authApi = {
  async login(email, password) {
    const cleanEmail = email.trim().toLowerCase()

    // 1. Limpiar tokens anteriores antes de autenticar
    tokens.clear()
    sessionStorage.removeItem(DEMO_USER_KEY)

    // Los errores de conectividad no crean una sesión simulada ni asignan roles locales.
    const data = await request('/auth/login', {
      method: 'POST',
      body: { email: cleanEmail, password },
      timeout: 15000,
    })
    tokens.save(data)
    // Si la contraseña no cumple la política, el backend solo permite cambiarla.
    const user = { ...data.usuario, debeCambiarContrasena: Boolean(data.debeCambiarContrasena) }
    saveLocalUser(user)
    return user
  },

  /**
   * Cambia la contraseña. El backend cierra todas las sesiones al hacerlo,
   * así que se vuelve a iniciar sesión con la nueva para seguir trabajando.
   */
  async changePassword(email, passwordActual, passwordNueva) {
    await request('/auth/me/contrasena', {
      method: 'PUT',
      auth: true,
      body: { passwordActual, passwordNueva },
    })
    return this.login(email, passwordNueva)
  },

  async register({ nombre, email, password, telefono }) {
    const cleanEmail = email.trim().toLowerCase()
    const body = { nombre: nombre.trim(), email: cleanEmail, password }
    if (telefono?.trim()) body.telefono = telefono.trim()

    return request('/auth/registro', { method: 'POST', body })
  },

  async me() {
    const data = await request('/auth/me', { auth: true })
    const user = { ...data.usuario, debeCambiarContrasena: Boolean(data.debeCambiarContrasena) }
    saveLocalUser(user)
    return user
  },

  /** Restaura la sesión guardada (renovando el token si hace falta). */
  async restore() {
    if (!tokens.access && !tokens.refresh) return null
    try {
      return await this.me()
    } catch {
      try {
        await refreshSession()
        return await this.me()
      } catch {
        tokens.clear()
        sessionStorage.removeItem(DEMO_USER_KEY)
        return null
      }
    }
  },

  async updateProfile(payload) {
    const data = await request('/auth/me', { method: 'PUT', auth: true, body: payload })
    saveLocalUser(data.usuario)
    return data.usuario
  },

  async deactivate() {
    const data = await request('/auth/me', { method: 'DELETE', auth: true })
    sessionStorage.removeItem(DEMO_USER_KEY)
    return data.usuario
  },

  async logout() {
    try {
      if (tokens.refresh && tokens.refresh !== 'demo_refresh_ft') {
        await request('/auth/logout', { method: 'POST', body: { refreshToken: tokens.refresh } })
      }
    } catch {}
    tokens.clear()
    sessionStorage.removeItem(DEMO_USER_KEY)
  },

  hasSession: () => Boolean(tokens.access || tokens.refresh || sessionStorage.getItem(DEMO_USER_KEY)),
}
