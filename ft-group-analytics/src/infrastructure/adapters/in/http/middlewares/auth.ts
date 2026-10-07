import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../../../config/env';

export interface RequestAutenticado extends Request {
  usuario?: { id: number; email: string };
}

/**
 * Valida el access token JWT emitido por el backend principal
 * (mismo JWT_SECRET). El microservicio no tiene login propio.
 */
export function autenticar(req: RequestAutenticado, res: Response, next: NextFunction): void {
  const cabecera = req.headers.authorization;
  if (!cabecera || !cabecera.startsWith('Bearer ')) {
    res.status(401).json({ error: 'NoAutenticado', mensaje: 'Se requiere un token de acceso valido.' });
    return;
  }
  try {
    const p = jwt.verify(cabecera.substring(7).trim(), env.jwtSecret) as jwt.JwtPayload;
    if (typeof p.usuarioId !== 'number') throw new Error('payload');
    req.usuario = { id: p.usuarioId, email: p.email };
    next();
  } catch {
    res.status(401).json({ error: 'TokenInvalido', mensaje: 'El token de acceso es invalido o ha expirado.' });
  }
}
