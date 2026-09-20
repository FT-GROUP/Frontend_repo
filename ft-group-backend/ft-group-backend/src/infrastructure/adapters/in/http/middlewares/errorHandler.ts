import { NextFunction, Request, Response } from 'express';
import {
  CredencialesInvalidasError,
  EmailYaRegistradoError,
  TokenInvalidoError,
  UsuarioInactivoError,
  UsuarioNoEncontradoError,
  ValidacionError,
} from '../../../../../domain/errors/DomainErrors';

/**
 * Adaptador de entrada: traduce errores de dominio/aplicacion a
 * respuestas HTTP con codigos de estado adecuados. Este es el UNICO
 * lugar donde se decide "que codigo HTTP le corresponde a cada error
 * de negocio" -- el dominio nunca sabe que existe HTTP.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ValidacionError) {
    res.status(400).json({ error: err.name, mensaje: err.message, detalles: err.detalles });
    return;
  }

  if (err instanceof EmailYaRegistradoError) {
    res.status(409).json({ error: err.name, mensaje: err.message });
    return;
  }

  if (err instanceof CredencialesInvalidasError || err instanceof TokenInvalidoError) {
    res.status(401).json({ error: err.name, mensaje: err.message });
    return;
  }

  if (err instanceof UsuarioInactivoError) {
    res.status(403).json({ error: err.name, mensaje: err.message });
    return;
  }

  if (err instanceof UsuarioNoEncontradoError) {
    res.status(404).json({ error: err.name, mensaje: err.message });
    return;
  }

  // Error no esperado: no se expone informacion interna al cliente.
  // eslint-disable-next-line no-console
  console.error('Error no controlado:', err);
  res.status(500).json({ error: 'ErrorInterno', mensaje: 'Ha ocurrido un error inesperado.' });
}

export function rutaNoEncontrada(_req: Request, res: Response): void {
  res.status(404).json({ error: 'NoEncontrado', mensaje: 'El recurso solicitado no existe.' });
}
