import { ContrasenaActualIncorrectaError, ContrasenaNoValidaError, UsuarioNoEncontradoError } from '../../domain/errors/DomainErrors';
import { CambiarContrasenaComando, CambiarContrasenaUseCase } from '../../domain/ports/in/UsuarioUseCases';
import { PasswordHasher } from '../../domain/ports/out/PasswordHasher';
import { RefreshTokenRepository } from '../../domain/ports/out/RefreshTokenRepository';
import { UsuarioRepository } from '../../domain/ports/out/UsuarioRepository';
import { incumplimientosContrasena } from '../../domain/services/politicaContrasena';

/**
 * Caso de uso "Cambiar contrasena".
 *
 * 1. Exige la contrasena actual (un token robado no basta para cambiarla).
 * 2. Aplica la politica de contrasenas a la nueva.
 * 3. Guarda el nuevo hash y quita la marca de cambio obligatorio.
 * 4. Cierra todas las sesiones abiertas (revoca los refresh tokens).
 */
export class CambiarContrasenaUseCaseImpl implements CambiarContrasenaUseCase {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async ejecutar(comando: CambiarContrasenaComando): Promise<void> {
    const usuario = await this.usuarioRepository.buscarPorId(comando.usuarioId);
    if (!usuario) throw new UsuarioNoEncontradoError(comando.usuarioId);

    const actualValida = await this.passwordHasher.comparar(comando.passwordActual, usuario.passwordHash);
    if (!actualValida) throw new ContrasenaActualIncorrectaError();

    const errores = incumplimientosContrasena(comando.passwordNueva);
    if (errores.length > 0) throw new ContrasenaNoValidaError(errores[0]);
    if (comando.passwordNueva === comando.passwordActual) {
      throw new ContrasenaNoValidaError('La nueva contrasena debe ser distinta de la actual.');
    }

    const hash = await this.passwordHasher.hash(comando.passwordNueva);
    await this.usuarioRepository.cambiarContrasena(comando.usuarioId, hash);
    await this.refreshTokenRepository.revocarTodosDeUsuario(comando.usuarioId);
  }
}
