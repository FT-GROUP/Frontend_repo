import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AccesoDenegadoError } from '../../../../../domain/errors';

export function rutaNoEncontrada(_req: Request, res: Response): void {
  res.status(404).json({ error: 'NoEncontrado', mensaje: 'El recurso solicitado no existe.' });
}

export function manejarErrores(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'ValidacionError', mensaje: err.issues[0]?.message ?? 'Parametros invalidos.', errores: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })) });
    return;
  }
  if (err instanceof AccesoDenegadoError) {
    res.status(403).json({ error: 'AccesoDenegado', mensaje: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'ErrorInterno', mensaje: 'Ocurrio un error inesperado.' });
}
