import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import analiticaRoutes from './infrastructure/adapters/in/http/routes/analiticaRoutes';
import { manejarErrores, rutaNoEncontrada } from './infrastructure/adapters/in/http/middlewares/errores';
import { env } from './infrastructure/config/env';

export function crearApp(): Application {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => {
    res.status(200).json({ estado: 'ok', servicio: 'ft-group-analytics', version: '1.0.0', funciones: ['kpis', 'estimadores', 'predicciones'] });
  });
  app.use('/api/analitica', analiticaRoutes);

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
