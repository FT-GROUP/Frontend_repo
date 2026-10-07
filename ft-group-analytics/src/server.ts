import { crearApp } from './app';
import { env } from './infrastructure/config/env';
import { verificarConexionBD } from './infrastructure/adapters/out/postgres/db';

async function iniciar(): Promise<void> {
  try {
    await verificarConexionBD();
    console.log('Conexion a PostgreSQL establecida correctamente (solo lectura).');
  } catch (error) {
    console.error('No fue posible conectar a PostgreSQL. Verifique las variables de entorno (.env).');
    console.error(error);
    process.exit(1);
  }
  crearApp().listen(env.port, () => {
    console.log(`FT. GROUP analitica escuchando en http://localhost:${env.port}`);
  });
}

iniciar();
