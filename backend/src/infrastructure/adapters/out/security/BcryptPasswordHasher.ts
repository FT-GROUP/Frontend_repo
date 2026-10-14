import bcrypt from 'bcrypt';
import { PasswordHasher } from '../../../../domain/ports/out/PasswordHasher';

const SALT_ROUNDS = 12;

/**
 * Adaptador de salida: implementa el puerto PasswordHasher usando
 * Bcrypt, conforme a las "Consideraciones de seguridad" del documento
 * de arquitectura (almacenamiento seguro de contrasenas).
 */
export class BcryptPasswordHasher implements PasswordHasher {
  async hash(passwordPlano: string): Promise<string> {
    return bcrypt.hash(passwordPlano, SALT_ROUNDS);
  }

  async comparar(passwordPlano: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(passwordPlano, passwordHash);
  }
}
