import { Router } from 'express';
import { grupoGastoController } from '../../../../config/container';
import { autenticar } from '../middlewares/authMiddleware';
import { validarBody, validarParams } from '../middlewares/validate';
import {
  aportarAlcanciaSchema,
  configurarAlcanciaSchema,
  crearGastoSchema,
  crearGrupoSchema,
  gastoParamsSchema,
  grupoIdParamsSchema,
  miembroParamsSchema,
  miembroSchema,
} from '../validators/grupoValidators';

const router = Router();

router.use(autenticar);
router.get('/', grupoGastoController.listarGrupos);
router.post('/', validarBody(crearGrupoSchema), grupoGastoController.crearGrupo);
router.get('/:grupoId/integrantes', validarParams(grupoIdParamsSchema), grupoGastoController.listarIntegrantes);
router.post('/:grupoId/integrantes', validarParams(grupoIdParamsSchema), validarBody(miembroSchema), grupoGastoController.agregarMiembro);
router.delete('/:grupoId/integrantes/:usuarioId', validarParams(miembroParamsSchema), grupoGastoController.quitarMiembro);
router.get('/:grupoId/gastos', validarParams(grupoIdParamsSchema), grupoGastoController.listarGastos);
router.post('/:grupoId/gastos', validarParams(grupoIdParamsSchema), validarBody(crearGastoSchema), grupoGastoController.crearGasto);
router.get('/:grupoId/balances', validarParams(grupoIdParamsSchema), grupoGastoController.listarBalances);
router.get('/:grupoId/historial', validarParams(grupoIdParamsSchema), grupoGastoController.listarHistorial);
router.get('/:grupoId/alcancia', validarParams(grupoIdParamsSchema), grupoGastoController.obtenerAlcancia);
router.put('/:grupoId/alcancia', validarParams(grupoIdParamsSchema), validarBody(configurarAlcanciaSchema), grupoGastoController.configurarAlcancia);
router.post('/:grupoId/alcancia/aportes', validarParams(grupoIdParamsSchema), validarBody(aportarAlcanciaSchema), grupoGastoController.aportarAlcancia);
router.post('/gastos/:gastoId/pagos', validarParams(gastoParamsSchema), grupoGastoController.registrarPago);

export default router;