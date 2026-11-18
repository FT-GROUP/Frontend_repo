/**
 * Politica de contrasenas de FT. GROUP (regla de negocio, sin dependencias).
 *
 * - Entre 8 y 72 caracteres (72 es el limite practico de los hash).
 * - Sin espacios: la contrasena se guarda tal cual se escribe, y un
 *   espacio al inicio o al final es casi siempre un error de tipeo.
 * - Al menos una letra y al menos un numero.
 *
 * La misma regla se usa en el registro, en el cambio de contrasena y al
 * iniciar sesion, para detectar cuentas antiguas con contrasenas debiles.
 */

export const LONGITUD_MINIMA_CONTRASENA = 8;
export const LONGITUD_MAXIMA_CONTRASENA = 72;

export const MENSAJES_POLITICA_CONTRASENA = {
  minima: `La contrasena debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`,
  maxima: `La contrasena no puede superar los ${LONGITUD_MAXIMA_CONTRASENA} caracteres.`,
  espacios: 'La contrasena no puede contener espacios.',
  letra: 'La contrasena debe incluir al menos una letra.',
  numero: 'La contrasena debe incluir al menos un numero.',
} as const;

/** Devuelve los incumplimientos de la politica; vacio si la contrasena es valida. */
export function incumplimientosContrasena(password: string): string[] {
  const errores: string[] = [];
  if (password.length < LONGITUD_MINIMA_CONTRASENA) errores.push(MENSAJES_POLITICA_CONTRASENA.minima);
  if (password.length > LONGITUD_MAXIMA_CONTRASENA) errores.push(MENSAJES_POLITICA_CONTRASENA.maxima);
  if (/\s/.test(password)) errores.push(MENSAJES_POLITICA_CONTRASENA.espacios);
  if (!/\p{L}/u.test(password)) errores.push(MENSAJES_POLITICA_CONTRASENA.letra);
  if (!/\p{N}/u.test(password)) errores.push(MENSAJES_POLITICA_CONTRASENA.numero);
  return errores;
}

export function cumplePoliticaContrasena(password: string): boolean {
  return incumplimientosContrasena(password).length === 0;
}
