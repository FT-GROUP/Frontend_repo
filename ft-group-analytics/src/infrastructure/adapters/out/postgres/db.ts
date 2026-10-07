import { Pool, PoolConfig, types } from 'pg';
import { env } from '../../../config/env';

// BIGINT (OID 20) llega como string por defecto; los IDs del proyecto caben en number.
types.setTypeParser(20, (v: string) => parseInt(v, 10));

/**
 * Pool de solo lectura: `default_transaction_read_only=on` hace que
 * PostgreSQL rechace cualquier INSERT/UPDATE/DELETE de esta conexion.
 */
export function crearPool(soloLectura = true): Pool {
  const opciones = soloLectura ? '-c default_transaction_read_only=on' : undefined;
  const config: PoolConfig = env.databaseUrl
    ? { connectionString: env.databaseUrl, ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined, options: opciones }
    : { host: env.dbHost, port: env.dbPort, user: env.dbUser, password: env.dbPassword, database: env.dbName, ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined, options: opciones };
  const pool = new Pool(config);
  pool.on('error', (err: Error) => console.error('Error inesperado en el pool de PostgreSQL:', err));
  return pool;
}

export const pool = crearPool(true);

export async function verificarConexionBD(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
