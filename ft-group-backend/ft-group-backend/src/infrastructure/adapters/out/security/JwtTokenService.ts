import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PayloadTokenAcceso, TokenService } from '../../../../domain/ports/out/TokenService';
import { TokenInvalidoError } from '../../../../domain/errors/DomainErrors';

/**
 * Adaptador de salida: implementa el puerto TokenService usando la
 * libreria jsonwebtoken (JWT) para access tokens, y crypto.randomBytes
 * para refresh tokens opacos (no-JWT), que se validan contra la tabla
 * REFRESH_TOKEN en base de datos (permite revocacion inmediata).
 */
export class JwtTokenService implements TokenService {
  constructor(
    private readonly secreto: string,
    private readonly expiracionAccessToken: string = '15m'
  ) {}

  generarAccessToken(payload: PayloadTokenAcceso): string {
    return jwt.sign(payload, this.secreto, { expiresIn: this.expiracionAccessToken as any });
  }

  verificarAccessToken(token: string): PayloadTokenAcceso {
    try {
      const decodificado = jwt.verify(token, this.secreto) as jwt.JwtPayload;
      return {
        usuarioId: decodificado.usuarioId,
        email: decodificado.email,
      };
    } catch (error) {
      throw new TokenInvalidoError('El access token es invalido o ha expirado.');
    }
  }

  generarRefreshTokenString(): string {
    return crypto.randomBytes(64).toString('hex');
  }
}
