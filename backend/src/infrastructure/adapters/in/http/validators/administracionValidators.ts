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

export type CambiarEstadoAdminInput = z.infer<typeof cambiarEstadoAdminSchema>;
export type CambiarRolAdminInput = z.infer<typeof cambiarRolAdminSchema>;
