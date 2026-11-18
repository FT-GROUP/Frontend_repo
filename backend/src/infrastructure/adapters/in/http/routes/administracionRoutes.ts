import { Router } from 'express';
import { administracionController } from '../../../../config/container';
import { autenticar, autorizarRoles } from '../middlewares/authMiddleware';
import { validarBody, validarParams, validarQuery } from '../middlewares/validate';
import {
  actualizarGrupoAdminSchema,
  cambiarEstadoAdminSchema,
  cambiarRolAdminSchema,
  crearAgrupacionAdminSchema,
  supervisionFinanzasQuerySchema,
  usuarioIdAdminSchema,
} from '../validators/administracionValidators';

const router = Router();
router.use(autenticar);
router.get('/usuarios', autorizarRoles('moderador', 'supervisor'), administracionController.listarUsuarios);
router.get(
  '/usuarios/:id/finanzas',
  autorizarRoles('supervisor'),
  validarParams(usuarioIdAdminSchema),
  validarQuery(supervisionFinanzasQuerySchema),
  administracionController.consultarFinanzasUsuario,
);
router.patch(
  '/usuarios/:id/estado',
  autorizarRoles('moderador', 'supervisor'),
  validarParams(usuarioIdAdminSchema),
  validarBody(cambiarEstadoAdminSchema),
  administracionController.cambiarEstado,
);
router.patch(
  '/usuarios/:id/rol',
  autorizarRoles('supervisor'),
  validarParams(usuarioIdAdminSchema),
  validarBody(cambiarRolAdminSchema),
  administracionController.cambiarRol,
);
router.get('/grupos', autorizarRoles('moderador', 'supervisor'), administracionController.listarGrupos);
router.post(
  '/agrupaciones',
  autorizarRoles('moderador', 'supervisor'),
  validarBody(crearAgrupacionAdminSchema),
  administracionController.crearAgrupacion,
);
router.patch(
  '/grupos/:id',
  autorizarRoles('moderador', 'supervisor'),
  validarParams(usuarioIdAdminSchema),
  validarBody(actualizarGrupoAdminSchema),
  administracionController.actualizarGrupo,
);

export default router;
