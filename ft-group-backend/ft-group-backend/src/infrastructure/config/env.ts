import dotenv from 'dotenv';

dotenv.config();

function requerido(nombre: string, valorPorDefecto?: string): string {
  const valor = process.env[nombre] ?? valorPorDefecto;
  if (valor === undefined) {
    throw new Error(`Falta la variable de entorno obligatoria: ${nombre}`);
  }
  return valor;
}

/**
 * Punto unico de lectura de variables de entorno. Ningun otro archivo
 * del proyecto deberia leer process.env directamente: esto facilita
 * probar la aplicacion y evita duplicar valores por defecto.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),

  // Conexion a PostgreSQL: se puede usar DATABASE_URL directamente
  // (recomendado en produccion/servicios cloud) o variables sueltas
  // (comodo en desarrollo local).
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: process.env.DATABASE_SSL === 'true',
  dbHost: process.env.DB_HOST ?? 'localhost',
  dbPort: parseInt(process.env.DB_PORT ?? '5432', 10),
  dbUser: process.env.DB_USER ?? 'postgres',
  dbPassword: process.env.DB_PASSWORD ?? 'postgres',
  dbName: process.env.DB_NAME ?? 'ft_group',

  jwtSecret: requerido('JWT_SECRET', 'cambia-este-secreto-en-produccion'),
  jwtExpiracion: process.env.JWT_EXPIRATION ?? '15m',

  corsOrigin: process.env.CORS_ORIGIN ?? '*',
};
