import { NextFunction, Response } from 'express';
import { AdministracionService } from '../../../../../application/services/AdministracionService';
import { RequestAutenticado } from '../middlewares/authMiddleware';
import {
  ActualizarGrupoAdminInput,
  CambiarEstadoAdminInput,
  CambiarRolAdminInput,
  CrearAgrupacionAdminInput,
} from '../validators/administracionValidators';

export class AdministracionController {
  constructor(private readonly service: AdministracionService) {}

  listarUsuarios = async (_req: RequestAutenticado, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ usuarios: await this.service.listarUsuarios() });
    } catch (error) {
      next(error);
    }
  };

  listarGrupos = async (_req: RequestAutenticado, res: Response, next: NextFunction) => {
    try {
      const resultado = await this.service.listarGruposYAgrupaciones();
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  };

  crearAgrupacion = async (
    req: RequestAutenticado & { body: CrearAgrupacionAdminInput },
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const agrupacion = await this.service.crearAgrupacion(
        req.usuario!.id,
        req.body.nombre,
        req.body.descripcion,
        req.body.color,
        req.body.grupoIds,
      );
      res.status(201).json({ agrupacion });
    } catch (error) {
      next(error);
    }
  };

  actualizarGrupo = async (
    req: RequestAutenticado & { body: ActualizarGrupoAdminInput },
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const grupo = await this.service.actualizarGrupoAdministracion(
        Number(req.params.id),
        req.body,
      );
      res.status(200).json({ grupo });
    } catch (error) {
      next(error);
    }
  };

  cambiarEstado = async (
    req: RequestAutenticado & { body: CambiarEstadoAdminInput },
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const usuario = await this.service.cambiarEstado(
        req.usuario!.id,
        req.usuario!.rol,
        Number(req.params.id),
        req.body.estado,
      );
      res.status(200).json({ usuario });
    } catch (error) {
      next(error);
    }
  };

  cambiarRol = async (
    req: RequestAutenticado & { body: CambiarRolAdminInput },
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const usuario = await this.service.cambiarRol(
        req.usuario!.id,
        req.usuario!.rol,
        Number(req.params.id),
        req.body.rol,
      );
      res.status(200).json({ usuario });
    } catch (error) {
      next(error);
    }
  };
}
