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
  databasePoolMax: Number.parseInt(
    process.env.DB_POOL_MAX ?? (process.env.NODE_ENV === 'production' ? '2' : '10'),
    10,
  ),

  // Conexion a PostgreSQL: se puede usar DATABASE_URL directamente
  // (recomendado en produccion/servicios cloud) o variables sueltas
  // (comodo en desarrollo local).
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: process.env.DATABASE_SSL === 'true' || (
    process.env.NODE_ENV === 'production' && Boolean(process.env.DATABASE_URL)
  ),
  dbHost: process.env.DB_HOST ?? 'localhost',
  dbPort: parseInt(process.env.DB_PORT ?? '5432', 10),
  dbUser: process.env.DB_USER ?? 'postgres',
  dbPassword: process.env.DB_PASSWORD ?? 'postgres',
  dbName: process.env.DB_NAME ?? 'ft_group',

  jwtSecret: requerido('JWT_SECRET'),
  jwtExpiracion: process.env.JWT_EXPIRATION ?? '15m',

  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean),
};

if (env.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
}
if (env.nodeEnv === 'production' && env.corsOrigins.some((origen) => origen === '*')) {
  throw new Error('CORS_ORIGIN debe definir orígenes explícitos en producción.');
}
if (env.nodeEnv === 'production' && !process.env.CORS_ORIGIN) {
  throw new Error('CORS_ORIGIN es obligatorio en producción.');
}
if (env.nodeEnv === 'production' && env.corsOrigins.length === 0) {
  throw new Error('CORS_ORIGIN debe incluir al menos un origen permitido.');
}
if (env.nodeEnv === 'production' && env.corsOrigins.some((origen) => !origen.startsWith('https://'))) {
  throw new Error('CORS_ORIGIN debe usar HTTPS en producción.');
}
if (env.nodeEnv === 'production' && env.jwtSecret === 'solo-desarrollo-local-cambiar-antes-de-desplegar-1234567890') {
  throw new Error('Configura un JWT_SECRET único antes de desplegar.');
}
if (!Number.isSafeInteger(env.databasePoolMax) || env.databasePoolMax < 1) {
  throw new Error('DB_POOL_MAX debe ser un entero positivo.');
}
