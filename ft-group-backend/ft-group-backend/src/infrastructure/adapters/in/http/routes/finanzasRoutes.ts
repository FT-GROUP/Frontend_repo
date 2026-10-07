import { Router } from 'express';
import { autenticar } from '../middlewares/authMiddleware';
import { validarBody, validarParams } from '../middlewares/validate';
import { FinanzasController as C } from '../controllers/FinanzasController';
import {
  agregarMiembroSchema, crearGrupoSchema, idParamSchema, liquidarSchema, registrarGastoSchema, registrarPagoSchema,
} from '../validators/finanzasValidators';

/**
 * Endpoints REST de los modulos: Gestion de grupos, Registro de gastos,
 * Motor de calculo, Historial financiero y Panel de usuario.
 * Todos requieren "Authorization: Bearer <accessToken>".
 */
const router = Router();
router.use(autenticar);

// Panel de usuario
router.get('/panel/resumen', C.resumen);

// Grupos
router.get('/grupos', C.listarGrupos);
router.post('/grupos', validarBody(crearGrupoSchema), C.crearGrupo);
router.post('/grupos/:id/miembros', validarParams(idParamSchema), validarBody(agregarMiembroSchema), C.agregarMiembro);
router.delete('/grupos/:id', validarParams(idParamSchema), C.archivarGrupo);

// Gastos
router.get('/gastos', C.listarGastos);
router.post('/gastos', validarBody(registrarGastoSchema), C.registrarGasto);
router.delete('/gastos/:id', validarParams(idParamSchema), C.eliminarGasto);
router.post('/gastos/:id/pagar', validarParams(idParamSchema), validarBody(registrarPagoSchema), C.registrarPago);

// Motor de calculo / balances
router.post('/balances/liquidar', validarBody(liquidarSchema), C.liquidar);

// Historial de movimientos (tabla historial_movimiento)
router.get('/historial', C.historial);

export default router;
