import { Router } from 'express';
import { AnaliticaController } from '../controllers/AnaliticaController';
import { autenticar } from '../middlewares/auth';

/** GET /api/analitica/kpis y /api/analitica/predicciones (requieren Bearer token). */
const router = Router();
router.use(autenticar);
router.get('/kpis', AnaliticaController.kpis);
router.get('/predicciones', AnaliticaController.predicciones);
export default router;
