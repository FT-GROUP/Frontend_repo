// Misma política que el backend (domain/services/politicaContrasena.ts).
// Validarla aquí solo evita el viaje al servidor: la regla real vive en el backend.
export const PASSWORD_RULES = [
  { id: 'length', label: 'Entre 8 y 72 caracteres', test: p => p.length >= 8 && p.length <= 72 },
  { id: 'spaces', label: 'Sin espacios', test: p => p.length > 0 && !/\s/.test(p) },
  { id: 'letter', label: 'Al menos una letra', test: p => /\p{L}/u.test(p) },
  { id: 'number', label: 'Al menos un número', test: p => /\p{N}/u.test(p) },
]

/** Primer incumplimiento como mensaje de error, o '' si la contraseña es válida. */
export function passwordError(password) {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (password.length > 72) return 'La contraseña no puede superar los 72 caracteres.'
  if (/\s/.test(password)) return 'La contraseña no puede contener espacios.'
  if (!/\p{L}/u.test(password)) return 'La contraseña debe incluir al menos una letra.'
  if (!/\p{N}/u.test(password)) return 'La contraseña debe incluir al menos un número.'
  return ''
}
