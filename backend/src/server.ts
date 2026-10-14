import { crearApp } from './app';
import { env } from './infrastructure/config/env';
import { verificarConexionBD } from './infrastructure/adapters/out/persistence/postgres/db';

/**
 * Arranque del servidor HTTP. Antes de aceptar peticiones, verifica
 * que la conexion a PostgreSQL este disponible (falla rapido y con un
 * mensaje claro si la base de datos no esta accesible).
 */
async function iniciar(): Promise<void> {
  try {
    await verificarConexionBD();
    // eslint-disable-next-line no-console
    console.log('Conexion a PostgreSQL establecida correctamente.');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('No fue posible conectar a PostgreSQL. Verifique las variables de entorno (.env).');
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  }

  const app = crearApp();

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`FT. GROUP backend escuchando en http://localhost:${env.port}`);
    // eslint-disable-next-line no-console
    console.log(`Entorno: ${env.nodeEnv}`);
  });
}

iniciar();
