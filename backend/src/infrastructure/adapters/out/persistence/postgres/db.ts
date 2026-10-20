import { Pool, PoolConfig, types } from 'pg';
import { env } from '../../../../config/env';

/**
 * Por defecto, node-postgres devuelve las columnas BIGINT/BIGSERIAL
 * (OID 20) como string en JavaScript, para no perder precision con
 * numeros mayores a Number.MAX_SAFE_INTEGER. En este proyecto los IDs
 * (usuario.id, refresh_token.id, etc.) nunca alcanzaran ese rango, y
 * el dominio los tipa como `number`, por lo que se configura el parser
 * para que los convierta automaticamente.
 */
types.setTypeParser(20, (valor: string) => parseInt(valor, 10));


/**
 * Pool de conexiones a PostgreSQL. Este es el UNICO lugar del proyecto
 * (junto con los repositorios en esta misma carpeta) que conoce que la
 * base de datos es Postgres. El resto de la aplicacion solo conoce las
 * interfaces UsuarioRepository / RefreshTokenRepository (puertos de salida).
 */
const poolConfig: PoolConfig = env.databaseUrl
  ? {
      connectionString: env.databaseUrl,
      ssl: env.databaseSsl ? { rejectUnauthorized: true } : undefined,
      max: env.databasePoolMax,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 5_000,
    }
  : {
      host: env.dbHost,
      port: env.dbPort,
      user: env.dbUser,
      password: env.dbPassword,
      database: env.dbName,
      ssl: env.databaseSsl ? { rejectUnauthorized: true } : undefined,
      max: env.databasePoolMax,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 5_000,
    };

export const pool = new Pool(poolConfig);

pool.on('error', (err: Error) => {
  const code = 'code' in err ? err.code : undefined;
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    type: 'database_pool_error',
    code,
  }));
});

export async function verificarConexionBD(): Promise<number> {
  const inicio = Date.now();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '3000'");
    await client.query('SELECT 1');
    await client.query('COMMIT');
    return Date.now() - inicio;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
