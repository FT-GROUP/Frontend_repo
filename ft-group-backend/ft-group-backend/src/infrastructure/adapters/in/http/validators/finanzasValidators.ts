import { z } from 'zod';

/** Validacion de "forma" de las peticiones de los modulos financieros. */

const id = z.coerce.number({ invalid_type_error: 'Identificador inválido.' }).int().positive('Identificador inválido.');

export const idParamSchema = z.object({ id });

export const crearGrupoSchema = z.object({
  nombre: z.string({ required_error: 'El nombre es obligatorio.' }).trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(120),
  descripcion: z.string().trim().max(500).nullable().optional(),
  icono: z.enum(['building', 'plane', 'safe', 'users', 'heart', 'cart']).optional(),
  ciudad: z.string().trim().max(80).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  integrantes: z.array(z.object({
    email: z.string().trim().toLowerCase().email('Hay un correo de integrante con formato inválido.'),
    nombre: z.string().optional(),
  })).max(50).default([]),
});

export const agregarMiembroSchema = z.object({
  email: z.string().trim().toLowerCase().email('El correo no tiene un formato válido.'),
});

export const registrarGastoSchema = z.object({
  grupo_id: id,
  pagador_id: id,
  descripcion: z.string({ required_error: 'La descripción es obligatoria.' }).trim().min(1, 'La descripción es obligatoria.').max(255),
  monto_total: z.coerce.number().positive('El monto debe ser mayor que cero.').max(9_999_999_999),
  fecha_gasto: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD.'),
  categoria: z.string().trim().max(60),
  tipo_division: z.enum(['equitativa', 'personalizada']),
  divisiones: z.array(z.object({
    usuario_id: id,
    monto_asignado: z.coerce.number().min(0).optional(),
  })).min(1, 'Debe haber al menos un participante.').max(50),
  origen_registro: z.enum(['manual', 'ocr']).default('manual'),
  recibo: z.object({
    imagen_url: z.string().trim().min(1).max(500),
    monto_extraido: z.coerce.number().nullable().optional(),
    fecha_extraida: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    comercio_extraido: z.string().max(150).nullable().optional(),
    categoria_sugerida: z.string().max(60).nullable().optional(),
    confianza_ocr: z.coerce.number().min(0).max(100).nullable().optional(),
  }).optional(),
});

export const registrarPagoSchema = z.object({
  usuario_id: id.optional(),
});

export const liquidarSchema = z.object({
  grupo_id: id,
  de: id,
  para: id,
});

export type CrearGrupoInput = z.infer<typeof crearGrupoSchema>;
export type RegistrarGastoInput = z.infer<typeof registrarGastoSchema>;
