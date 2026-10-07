import { NextFunction, Response } from 'express';
import { z } from 'zod';
import { obtenerKpisUseCase, obtenerPrediccionesUseCase } from '../../../../config/container';
import { RequestAutenticado } from '../middlewares/auth';

const grupo = z.coerce.number().int().positive('grupoId invalido.').optional();

const kpisQuery = z.object({
  grupoId: grupo,
  meses: z.coerce.number().int().min(1, 'meses debe estar entre 1 y 24.').max(24, 'meses debe estar entre 1 y 24.').default(6),
});
const prediccionesQuery = z.object({
  grupoId: grupo,
  horizonte: z.coerce.number().int().min(1, 'horizonte debe estar entre 1 y 6.').max(6, 'horizonte debe estar entre 1 y 6.').default(3),
});

/** Adaptador de entrada: traduce HTTP <-> casos de uso. */
export const AnaliticaController = {
  async kpis(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const q = kpisQuery.parse(req.query);
      res.json(await obtenerKpisUseCase.ejecutar({ usuarioId: req.usuario!.id, grupoId: q.grupoId, meses: q.meses }));
    } catch (e) { next(e); }
  },
  async predicciones(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const q = prediccionesQuery.parse(req.query);
      res.json(await obtenerPrediccionesUseCase.ejecutar({ usuarioId: req.usuario!.id, grupoId: q.grupoId, horizonte: q.horizonte }));
    } catch (e) { next(e); }
  },
};
