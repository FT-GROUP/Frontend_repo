import { z } from 'zod';
import {
  LONGITUD_MAXIMA_CONTRASENA,
  LONGITUD_MINIMA_CONTRASENA,
  MENSAJES_POLITICA_CONTRASENA,
} from '../../../../../domain/services/politicaContrasena';

/**
 * Esquemas de validacion/sanitizacion de entrada (adaptador de entrada).
 * Estas reglas son de "forma" del dato HTTP, no de negocio: por eso
 * viven en la capa de infraestructura y no en el dominio.
 */

/* ------------------------------------------------------------------ */
/* Reglas compartidas                                                  */
/* ------------------------------------------------------------------ */
// La contrasena no se recorta ni se normaliza: se guarda tal cual la
// escribe la persona. Por eso se rechazan los espacios en lugar de
// quitarlos: si se recortaran, despues no sabria cual es su contrasena.
const passwordSchema = z
  .string({ required_error: 'La contrasena es obligatoria.' })
  .min(LONGITUD_MINIMA_CONTRASENA, MENSAJES_POLITICA_CONTRASENA.minima)
  .max(LONGITUD_MAXIMA_CONTRASENA, MENSAJES_POLITICA_CONTRASENA.maxima)
  .regex(/^\S+$/, MENSAJES_POLITICA_CONTRASENA.espacios)
  .regex(/\p{L}/u, MENSAJES_POLITICA_CONTRASENA.letra)
  .regex(/\p{N}/u, MENSAJES_POLITICA_CONTRASENA.numero);

// Nombre: letras de cualquier idioma, espacios y los signos propios de un
// nombre (punto, apostrofo, guion), siempre entre letras y sin repetirse
// ("O'Neil-Pérez", "Jr. Gómez"). Se rechazan < > " ` { } = ; y similares,
// que no forman parte de un nombre y son la base de una inyeccion de HTML.
const NOMBRE_PERMITIDO = /^[\p{L}\p{M}]+(?:[ .'’-]{1,2}[\p{L}\p{M}]+)*\.?$/u;
const nombreSchema = z
  .string({ required_error: 'El nombre es obligatorio.' })
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres.')
  .max(120, 'El nombre no puede superar los 120 caracteres.')
  .regex(NOMBRE_PERMITIDO, 'El nombre solo puede contener letras, espacios, puntos, apostrofos y guiones.');

// Telefono: digitos con un + inicial opcional; se aceptan espacios,
// guiones y parentesis como separadores. Entre 7 y 15 digitos.
const telefonoSchema = z
  .string()
  .trim()
  .max(20, 'El telefono no puede superar los 20 caracteres.')
  .regex(/^\+?[0-9 ()-]+$/, 'El telefono solo puede contener numeros, espacios, guiones, parentesis y un + inicial.')
  .refine((valor) => {
    const digitos = valor.replace(/\D/g, '').length;
    return digitos >= 7 && digitos <= 15;
  }, 'El telefono debe tener entre 7 y 15 digitos.');

/* ------------------------------------------------------------------ */
/* Registrar usuario                                                   */
/* ------------------------------------------------------------------ */
export const registrarUsuarioSchema = z.object({
  nombre: nombreSchema,
  email: z
    .string({ required_error: 'El correo es obligatorio.' })
    .trim()
    .toLowerCase()
    .email('El correo electronico no tiene un formato valido.')
    .max(150),
  password: passwordSchema,
  // Un telefono vacio se trata como "no enviado".
  telefono: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), telefonoSchema.optional()),
});

/* ------------------------------------------------------------------ */
/* Iniciar sesion                                                      */
/* ------------------------------------------------------------------ */
// El inicio de sesion NO exige la politica a proposito: las cuentas creadas
// antes de ella pueden tener contrasenas debiles, y rechazarlas aqui las
// dejaria fuera para siempre. En su lugar, el caso de uso detecta la
// contrasena debil, marca la cuenta y el backend solo le permite cambiarla.
export const iniciarSesionSchema = z.object({
  email: z
    .string({ required_error: 'El correo es obligatorio.' })
    .trim()
    .toLowerCase()
    .email('El correo electronico no tiene un formato valido.'),
  password: z
    .string({ required_error: 'La contrasena es obligatoria.' })
    .min(1, 'La contrasena es obligatoria.')
    .max(72, 'La contrasena no puede superar los 72 caracteres.'),
});

/* ------------------------------------------------------------------ */
/* Refrescar token / Logout                                            */
/* ------------------------------------------------------------------ */
export const refrescarTokenSchema = z.object({
  refreshToken: z
    .string({ required_error: 'El refreshToken es obligatorio.' })
    .min(1, 'El refreshToken es obligatorio.'),
});

/* ------------------------------------------------------------------ */
/* Actualizar perfil del usuario                                       */
/* ------------------------------------------------------------------ */
export const actualizarPerfilSchema = z
  .object({
    nombre: nombreSchema.optional(),
    // "" o null borran el telefono; cualquier otro valor debe ser valido.
    telefono: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
      telefonoSchema.nullable().optional(),
    ),
  })
  .refine(
    (datos) => datos.nombre !== undefined || datos.telefono !== undefined,
    { message: 'Debes enviar al menos un campo para actualizar (nombre o telefono).' },
  );

/* ------------------------------------------------------------------ */
/* Cambiar contrasena                                                  */
/* ------------------------------------------------------------------ */
export const cambiarContrasenaSchema = z.object({
  passwordActual: z
    .string({ required_error: 'La contrasena actual es obligatoria.' })
    .min(1, 'La contrasena actual es obligatoria.')
    .max(LONGITUD_MAXIMA_CONTRASENA),
  passwordNueva: passwordSchema,
});

/* ------------------------------------------------------------------ */
/* Cambiar estado (soft delete: activo/inactivo)                       */
/* ------------------------------------------------------------------ */
export const cambiarEstadoUsuarioSchema = z.object({
  activo: z.boolean({
    required_error: 'El campo activo es obligatorio.',
    invalid_type_error: 'El campo activo debe ser booleano (true o false).',
  }),
});

/* ------------------------------------------------------------------ */
/* Validacion de params de ruta (:id)                                  */
/* ------------------------------------------------------------------ */
export const idUsuarioSchema = z.object({
  id: z.coerce.number().int().positive('El id debe ser un entero positivo.'),
});

/* ------------------------------------------------------------------ */
/* Tipos inferidos                                                     */
/* ------------------------------------------------------------------ */
export type RegistrarUsuarioInput = z.infer<typeof registrarUsuarioSchema>;
export type IniciarSesionInput = z.infer<typeof iniciarSesionSchema>;
export type RefrescarTokenInput = z.infer<typeof refrescarTokenSchema>;
export type ActualizarPerfilInput = z.infer<typeof actualizarPerfilSchema>;
export type CambiarContrasenaInput = z.infer<typeof cambiarContrasenaSchema>;
export type CambiarEstadoUsuarioInput = z.infer<typeof cambiarEstadoUsuarioSchema>;
export type IdUsuarioInput = z.infer<typeof idUsuarioSchema>;
