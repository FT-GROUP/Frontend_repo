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
import { motivoSolicitudAuditoria } from './motivoAuditoria';

export interface RequestAutenticado extends Request {
  usuario?: { id: number; email: string; rol: RolUsuario };
}

/**
 * Extrae el nombre de la operacion de una peticion GraphQL para que la
 * bitacora diga QUE se ejecuto y no solo "POST /graphql".
 *
 * Nunca se guarda la consulta completa: puede ser larga y puede llevar
 * datos en las variables, y la regla 5W no almacena cuerpos. Solo se toma
 * el nombre, saneado y acotado.
 */
export function nombreOperacionGraphql(cuerpo: unknown): string | null {
  if (typeof cuerpo !== 'object' || cuerpo === null) return null;
  const { operationName, query } = cuerpo as { operationName?: unknown; query?: unknown };

  if (typeof operationName === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(operationName)) {
    return operationName.slice(0, 60);
  }
  if (typeof query !== 'string') return null;

  // Primer campo que se pide: "query { misGrupos ... }" -> misGrupos.
  const coincidencia = query.match(/(?:query|mutation|subscription)?\s*(?:[A-Za-z_][A-Za-z0-9_]*)?\s*(?:\([^)]*\))?\s*\{\s*([A-Za-z_][A-Za-z0-9_]*)/);
  return coincidencia?.[1]?.slice(0, 60) ?? null;
}

/**
 * GraphQL responde HTTP 200 aunque el resolver rechace la operacion: el
 * error viaja dentro del cuerpo, en el arreglo "errors". Sin mirar ese
 * cuerpo, la bitacora registraria un intento bloqueado igual que una
 * accion consumada, que es justo lo que una auditoria no puede permitirse.
 */
export function respuestaGraphqlTieneErrores(cuerpo: string): boolean {
  // Descarte barato: si no aparece la palabra, no hace falta parsear.
  if (!cuerpo.includes('"errors"')) return false;
  try {
    const datos = JSON.parse(cuerpo) as { errors?: unknown };
    return Array.isArray(datos.errors) && datos.errors.length > 0;
  } catch {
    return false;
  }
}

/** Tamaño maximo de respuesta que se inspecciona, para no parsear de mas. */
const MAX_CUERPO_INSPECCIONADO = 256 * 1024;

export function auditarActividad(req: RequestAutenticado, res: Response, next: NextFunction): void {
  const rutaOriginal = req.path;
  // GraphQL se audita igual que REST: sus mutaciones archivan grupos y
  // desactivan cuentas, asi que dejarlas fuera abriria un camino para
  // ejecutar acciones administrativas sin rastro.
  const esGraphql = rutaOriginal === '/graphql';
  if (!rutaOriginal.startsWith('/api/') && !esGraphql) {
    next();
    return;
  }

  // Se intercepta la escritura de la respuesta solo en GraphQL, y solo
  // para leer si trae errores. El cuerpo no se almacena ni se modifica.
  let operacionRechazada = false;
  if (esGraphql) {
    const terminarOriginal = res.end.bind(res);
    let yaInspeccionado = false;
    res.end = function (this: Response, ...argumentos: unknown[]) {
      if (!yaInspeccionado) {
        yaInspeccionado = true;
        const trozo = argumentos[0];
        const cuerpo =
          typeof trozo === 'string' ? trozo : Buffer.isBuffer(trozo) ? trozo.toString('utf8') : '';
        if (cuerpo && cuerpo.length <= MAX_CUERPO_INSPECCIONADO) {
          operacionRechazada = respuestaGraphqlTieneErrores(cuerpo);
        }
      }
      return (terminarOriginal as (...a: unknown[]) => Response)(...argumentos);
    } as Response['end'];
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

      const ruta = esGraphql
        ? rutaOriginal
        : `${req.baseUrl}${req.route?.path ?? req.path}`.slice(0, 255);
      const operacion = esGraphql ? nombreOperacionGraphql(req.body) : null;
      const solicitudId = res.locals.requestId;
      await auditoriaService.registrar({
        actorId: usuario.id,
        actorEmail: usuario.email,
        actorRol: usuario.rol,
        accion: [
          req.method,
          ruta,
          operacion,
          operacionRechazada ? '[rechazada]' : null,
        ].filter(Boolean).join(' '),
        motivo: motivoSolicitudAuditoria(req.method, ruta, operacion),
        metodo: req.method,
        ruta,
        estadoHttp: res.statusCode,
        solicitudId: typeof solicitudId === 'string' ? solicitudId : randomUUID(),
      });
    })().catch(() => {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        type: 'activity_audit_write_failed',
      }));
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

export async function autenticarOpcional(req: RequestAutenticado, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = authHeader.substring('Bearer '.length).trim();
  try {
    const payload = tokenServiceInstancia.verificarAccessToken(token);
    const usuario = await usuarioRepositoryInstancia.buscarPorId(payload.usuarioId);
    if (usuario && usuario.puedeIniciarSesion()) {
      req.usuario = { id: usuario.id as number, email: usuario.email, rol: usuario.rol };
    }
  } catch {
    // Si no es valido se continua sin req.usuario
  }
  next();
}