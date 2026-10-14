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
  ? { connectionString: env.databaseUrl, ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined }
  : {
      host: env.dbHost,
      port: env.dbPort,
      user: env.dbUser,
      password: env.dbPassword,
      database: env.dbName,
      ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
    };

export const pool = new Pool(poolConfig);

pool.on('error', (err: Error) => {
  // Errores en clientes inactivos del pool: se loguean pero no deben
  // tumbar el proceso completo.
  // eslint-disable-next-line no-console
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

export async function verificarConexionBD(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
