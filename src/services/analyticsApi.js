// Cliente del microservicio de analítica (KPIs, estimadores y predicciones).
// Es un servicio aparte (puerto 4000) que valida el mismo JWT del backend principal.

import { ApiError, refreshSession, tokens } from './http'

export const ANALYTICS_URL = import.meta.env.VITE_ANALYTICS_URL || 'http://localhost:4000/api'

async function call(path, params = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'todos'))
  const url = `${ANALYTICS_URL}${path}${qs.size ? `?${qs}` : ''}`
  const send = () => fetch(url, { headers: { Authorization: `Bearer ${tokens.access}` } })

  let res
  try { res = await send() }
  catch { throw new ApiError('El servicio de analítica no está disponible. Inícialo con «npm run dev» en ft-group-analytics (puerto 4000).', 0) }

  if (res.status === 401 && tokens.refresh) {
    await refreshSession()
    res = await send()
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.mensaje || 'No fue posible obtener el análisis.', res.status)
  return data
}

export const analyticsApi = {
  kpis: ({ grupoId, meses = 12 } = {}) => call('/analitica/kpis', { grupoId, meses }),
  predicciones: ({ grupoId, horizonte = 3 } = {}) => call('/analitica/predicciones', { grupoId, horizonte }),
}
