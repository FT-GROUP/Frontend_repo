import { z } from 'zod';

export const cambiarEstadoAdminSchema = z.object({
  estado: z.enum(['activo', 'inactivo', 'bloqueado']),
});

export const cambiarRolAdminSchema = z.object({
  rol: z.enum(['usuario', 'moderador', 'supervisor']),
});

export const usuarioIdAdminSchema = z.object({
  id: z.coerce.number().int().positive('El id debe ser un entero positivo.'),
});

export const crearAgrupacionAdminSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  descripcion: z.string().trim().max(255).optional(),
  color: z.string().trim().max(32).optional(),
  grupoIds: z.array(z.number().int().positive()).optional(),
});

export const actualizarGrupoAdminSchema = z.object({
  agrupacionId: z.number().int().positive().nullable().optional(),
  estado: z.enum(['activo', 'archivado']).optional(),
});

export type CambiarEstadoAdminInput = z.infer<typeof cambiarEstadoAdminSchema>;
export type CambiarRolAdminInput = z.infer<typeof cambiarRolAdminSchema>;
export type CrearAgrupacionAdminInput = z.infer<typeof crearAgrupacionAdminSchema>;
export type ActualizarGrupoAdminInput = z.infer<typeof actualizarGrupoAdminSchema>;
