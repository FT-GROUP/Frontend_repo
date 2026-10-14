import { NextFunction, Request, Response } from 'express';
import { tokenServiceInstancia } from '../../../../config/container';

export interface RequestAutenticado extends Request {
  usuario?: { id: number; email: string };
}

/**
 * Adaptador de entrada (middleware HTTP): protege rutas exigiendo un
 * access token JWT valido en el header "Authorization: Bearer <token>".
 * Traduce el resultado del puerto TokenService al contexto de Express
 * (req.usuario), sin que el dominio conozca nada de HTTP.
 */
export function autenticar(req: RequestAutenticado, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'NoAutenticado', mensaje: 'Se requiere un token de acceso valido.' });
    return;
  }

  const token = authHeader.substring('Bearer '.length).trim();

  try {
    const payload = tokenServiceInstancia.verificarAccessToken(token);
    req.usuario = { id: payload.usuarioId, email: payload.email };
    next();
  } catch (error) {
    res.status(401).json({ error: 'TokenInvalido', mensaje: 'El token de acceso es invalido o ha expirado.' });
  }
}
