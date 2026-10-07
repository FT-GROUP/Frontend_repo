// Cliente HTTP central. Añade el access token, y si el backend responde 401
// intenta renovar la sesión una vez con /auth/refresh antes de fallar.

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const KEYS = { access: 'ft_access_token', refresh: 'ft_refresh_token' }

export const tokens = {
  get access() { return sessionStorage.getItem(KEYS.access) },
  get refresh() { return sessionStorage.getItem(KEYS.refresh) },
  save({ accessToken, refreshToken }) {
    if (accessToken) sessionStorage.setItem(KEYS.access, accessToken)
    if (refreshToken) sessionStorage.setItem(KEYS.refresh, refreshToken)
  },
  clear() {
    sessionStorage.removeItem(KEYS.access)
    sessionStorage.removeItem(KEYS.refresh)
  },
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function rawRequest(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('No fue posible conectar con el servidor. Verifica que el backend esté en ejecución.', 0)
  }

  if (response.status === 204) return null
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detalle = Array.isArray(data.detalles) && data.detalles[0]?.mensaje
    throw new ApiError(detalle || data.mensaje || data.message || 'No fue posible completar la solicitud.', response.status, data.detalles)
  }
  return data
}

let refreshing = null
async function refreshSession() {
  if (!tokens.refresh) throw new ApiError('Sesión expirada.', 401)
  // Evita varias renovaciones simultáneas.
  refreshing ??= rawRequest('/auth/refresh', { method: 'POST', body: { refreshToken: tokens.refresh } })
    .then(data => { tokens.save(data); return data })
    .finally(() => { refreshing = null })
  return refreshing
}

export async function request(path, options = {}) {
  try {
    return await rawRequest(path, options)
  } catch (err) {
    if (options.auth && err.status === 401 && tokens.refresh) {
      await refreshSession()
      return rawRequest(path, options)
    }
    throw err
  }
}

export { refreshSession }
