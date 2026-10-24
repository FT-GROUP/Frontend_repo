// Cliente del asistente de soporte. Todas las llamadas van autenticadas:
// el agente responde en nombre del usuario de la sesión, y el backend saca
// su identidad del token, no de lo que se envíe aquí.

import { request } from './http'

// Un turno del agente puede incluir varias llamadas a herramientas, así que
// se le da margen por encima del tiempo de espera habitual del cliente.
const TIMEOUT_ASISTENTE = 30000

/** Indica si el servidor tiene el asistente con IA configurado. */
export async function consultarDisponibilidad() {
  const data = await request('/asistente/estado', { auth: true })
  return Boolean(data?.disponible)
}

/**
 * Envía un mensaje al agente.
 * @param {string} mensaje
 * @param {number|undefined} conversacionId identificador devuelto por la
 *   llamada anterior, para que el agente conserve el hilo.
 * @returns {Promise<{conversacionId: number, respuesta: string, ticket: object|null}>}
 */
export function enviarMensaje(mensaje, conversacionId) {
  return request('/asistente/mensajes', {
    method: 'POST',
    auth: true,
    timeout: TIMEOUT_ASISTENTE,
    body: conversacionId ? { mensaje, conversacionId } : { mensaje },
  })
}

/** Tickets de soporte del usuario autenticado. */
export async function listarMisTickets() {
  const data = await request('/soporte/tickets', { auth: true })
  return Array.isArray(data?.tickets) ? data.tickets : []
}

/** Detalle y hilo de mensajes de un ticket propio. */
export async function obtenerTicket(numero) {
  const data = await request(`/soporte/tickets/${encodeURIComponent(numero)}`, { auth: true })
  return data?.ticket ?? null
}

/** Añade información a un ticket abierto. */
export function comentarTicket(numero, comentario) {
  return request(`/soporte/tickets/${encodeURIComponent(numero)}/mensajes`, {
    method: 'POST',
    auth: true,
    body: { comentario },
  })
}
