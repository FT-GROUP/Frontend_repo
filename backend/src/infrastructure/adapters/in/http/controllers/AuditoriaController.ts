import { NextFunction, Request, Response } from 'express';
import { AuditoriaService } from '../../../../../application/services/AuditoriaService';
import { RequestAutenticado } from '../middlewares/authMiddleware';
import { filtrosAuditoriaSchema, RegistrarEventoAuditoriaInput } from '../validators/auditoriaValidators';

export class AuditoriaController {
  constructor(private readonly service: AuditoriaService) {}

  listar = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const filtros = filtrosAuditoriaSchema.parse(req.query);
      const resultado = await this.service.listar(filtros);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  };

  registrarEvento = async (
    req: RequestAutenticado & { body: RegistrarEventoAuditoriaInput },
    res: Response,
    next: NextFunction,
  ) => {
    try {
      await this.service.registrar({
        actorId: req.usuario!.id,
        actorEmail: req.usuario!.email,
        actorRol: req.usuario!.rol,
        accion: req.body.accion,
        metodo: 'LOCAL',
        ruta: '/frontend/demostracion',
        estadoHttp: 200,
        solicitudId: req.get('x-request-id') ?? null,
      });
      res.status(201).json({ mensaje: 'Actividad registrada.' });
    } catch (error) {
      next(error);
    }
  };
}
