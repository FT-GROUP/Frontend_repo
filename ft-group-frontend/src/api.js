const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })

  if (response.status === 204) return null

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data.mensaje || data.message || 'No fue posible completar la solicitud.'
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  return data
}

export const authApi = {
  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    sessionStorage.setItem('ft_access_token', data.accessToken)
    if (data.refreshToken) sessionStorage.setItem('ft_refresh_token', data.refreshToken)
    return data.usuario
  },

  async register(payload) {
    return request('/auth/registro', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async refresh() {
    const refreshToken = sessionStorage.getItem('ft_refresh_token')
    if (!refreshToken) throw new Error('No existe una sesión para renovar.')
    const data = await request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
    sessionStorage.setItem('ft_access_token', data.accessToken)
    if (data.refreshToken) sessionStorage.setItem('ft_refresh_token', data.refreshToken)
    return data
  },

  async me() {
    const token = sessionStorage.getItem('ft_access_token')
    if (!token) throw new Error('No hay sesión activa.')
    return request('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async updateProfile(payload) {
    const token = sessionStorage.getItem('ft_access_token')
    return request('/auth/me', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
  },

  async logout() {
    const refreshToken = sessionStorage.getItem('ft_refresh_token')
    if (refreshToken) {
      await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      })
    }
    clearSession()
  },

  async toggleAccount(active) {
    const token = sessionStorage.getItem('ft_access_token')
    const path = active ? '/auth/me/activar' : '/auth/me'
    return request(path, {
      method: active ? 'POST' : 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  }
}

export function clearSession() {
  sessionStorage.removeItem('ft_access_token')
  sessionStorage.removeItem('ft_refresh_token')
}

export function hasSession() {
  return Boolean(sessionStorage.getItem('ft_access_token'))
}
