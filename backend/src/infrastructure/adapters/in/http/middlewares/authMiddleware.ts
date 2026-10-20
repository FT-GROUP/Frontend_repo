import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import {
  auditoriaService,
  refreshTokenRepositoryInstancia,
  tokenServiceInstancia,
  usuarioRepositoryInstancia,
} from '../../../../config/container';
import { RolUsuario } from '../../../../../domain/entities/Usuario';
import { PayloadTokenAcceso } from '../../../../../domain/ports/out/TokenService';

export interface RequestAutenticado extends Request {
  usuario?: { id: number; email: string; rol: RolUsuario };
}

export function auditarActividad(req: RequestAutenticado, res: Response, next: NextFunction): void {
  const rutaOriginal = req.path;
  if (!rutaOriginal.startsWith('/api/')) {
    next();
    return;
  }

  res.on('finish', () => {
    if (rutaOriginal === '/api/auditoria/eventos') return;

    void (async () => {
      let usuario = req.usuario;
      if (
        !usuario &&
        res.statusCode < 400 &&
        ['/api/auth/logout', '/api/auth/refresh'].includes(rutaOriginal) &&
        typeof req.body?.refreshToken === 'string'
      ) {
        const sesion = await refreshTokenRepositoryInstancia.buscarPorToken(req.body.refreshToken);
        if (sesion) {
          const cuenta = await usuarioRepositoryInstancia.buscarPorId(sesion.usuarioId);
          if (cuenta) {
            usuario = {
              id: cuenta.id as number,
              email: cuenta.email,
              rol: cuenta.rol,
            };
          }
        }
      }
      if (!usuario) return;

      const ruta = `${req.baseUrl}${req.route?.path ?? req.path}`.slice(0, 255);
      const solicitudId = req.get('x-request-id');
      await auditoriaService.registrar({
        actorId: usuario.id,
        actorEmail: usuario.email,
        actorRol: usuario.rol,
        accion: `${req.method} ${ruta}`,
        metodo: req.method,
        ruta,
        estadoHttp: res.statusCode,
        solicitudId: solicitudId && solicitudId.length <= 80 ? solicitudId : randomUUID(),
      });
    })().catch((error: unknown) => {
      console.error('No fue posible guardar la actividad de auditoría:', error);
    });
  });
  next();
}

/**
 * Adaptador de entrada (middleware HTTP): protege rutas exigiendo un
 * access token JWT valido en el header "Authorization: Bearer <token>".
 * Traduce el resultado del puerto TokenService al contexto de Express
 * (req.usuario), sin que el dominio conozca nada de HTTP.
 */
export async function autenticar(req: RequestAutenticado, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'NoAutenticado', mensaje: 'Se requiere un token de acceso valido.' });
    return;
  }

  const token = authHeader.substring('Bearer '.length).trim();

  let payload: PayloadTokenAcceso;
  try {
    payload = tokenServiceInstancia.verificarAccessToken(token);
  } catch (_error) {
    res.status(401).json({ error: 'TokenInvalido', mensaje: 'El token de acceso es invalido o ha expirado.' });
    return;
  }

  try {
    const usuario = await usuarioRepositoryInstancia.buscarPorId(payload.usuarioId);
    if (!usuario || !usuario.puedeIniciarSesion()) {
      res.status(401).json({ error: 'TokenInvalido', mensaje: 'La sesión ya no es válida.' });
      return;
    }
    req.usuario = { id: usuario.id as number, email: usuario.email, rol: usuario.rol };
    next();
  } catch (error) {
    next(error);
  }
}

export function autorizarRoles(...roles: RolUsuario[]) {
  return (req: RequestAutenticado, res: Response, next: NextFunction): void => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      res.status(403).json({ error: 'AccesoDenegado', mensaje: 'No tienes permisos para realizar esta acción.' });
      return;
    }
    next();
  };
}
