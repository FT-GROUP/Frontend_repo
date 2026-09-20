import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './infrastructure/adapters/in/http/routes/authRoutes';
import { errorHandler, rutaNoEncontrada } from './infrastructure/adapters/in/http/middlewares/errorHandler';
import { env } from './infrastructure/config/env';

/**
 * Composicion de la aplicacion Express (adaptador de entrada HTTP).
 * Separado de server.ts para poder importarlo en tests (supertest)
 * sin necesidad de levantar un puerto real.
 */
export function crearApp(): Application {
  const app = express();

  // --- Seguridad basica de cabeceras HTTP ---
  app.use(helmet());

  // --- CORS ---
  app.use(cors({ origin: env.corsOrigin }));

  // --- Logging de peticiones ---
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  // --- Parseo de JSON (con limite para mitigar payloads abusivos) ---
  app.use(express.json({ limit: '100kb' }));

  // --- Chequeo de salud ---
  app.get('/health', (_req, res) => {
    res.status(200).json({ estado: 'ok', servicio: 'ft-group-backend', modulo: 'usuarios' });
  });

  // --- Rutas del modulo de usuarios / autenticacion ---
  app.use('/api/auth', authRoutes);

  // --- 404 y manejo centralizado de errores ---
  app.use(rutaNoEncontrada);
  app.use(errorHandler);

  return app;
}
