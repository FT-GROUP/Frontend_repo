import dotenv from 'dotenv';

dotenv.config();

/** Unico lugar que lee variables de entorno. */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: process.env.DATABASE_SSL === 'true',
  dbHost: process.env.DB_HOST ?? 'localhost',
  dbPort: parseInt(process.env.DB_PORT ?? '5432', 10),
  dbUser: process.env.DB_USER ?? 'postgres',
  dbPassword: process.env.DB_PASSWORD ?? 'postgres',
  dbName: process.env.DB_NAME ?? 'ft_group',
  jwtSecret: process.env.JWT_SECRET ?? 'cambia-este-secreto-en-produccion',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  zonaHoraria: process.env.ZONA_HORARIA ?? 'America/Bogota',
};
