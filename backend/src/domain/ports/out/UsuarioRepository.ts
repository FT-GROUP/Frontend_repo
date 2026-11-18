import { Usuario } from '../../entities/Usuario';

/**
 * Puerto de salida (output port): define QUE necesita el nucleo de la
 * aplicacion en materia de persistencia de usuarios, sin decir COMO se
 * implementa (eso lo decide el adaptador de persistencia, p. ej. Postgres).
 */
export interface UsuarioRepository {
  guardar(usuario: Usuario): Promise<Usuario>;
  actualizarPasswordHash(usuarioId: number, passwordHash: string): Promise<void>;
  /** Guarda una contrasena nueva elegida por la persona y quita la marca de cambio obligatorio. */
  cambiarContrasena(usuarioId: number, passwordHash: string): Promise<void>;
  /** Marca (o desmarca) la cuenta como obligada a cambiar su contrasena. */
  marcarCambioContrasena(usuarioId: number, debeCambiar: boolean): Promise<void>;
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarPorId(id: number): Promise<Usuario | null>;
  existeEmail(email: string): Promise<boolean>;
}
