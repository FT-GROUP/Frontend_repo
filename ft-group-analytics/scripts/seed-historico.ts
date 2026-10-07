/**
 * Datos historicos de demostracion para los KPIs y las predicciones.
 *
 * Uso:  npm run seed:demo -- tu_correo@ejemplo.com
 *
 * - El usuario indicado debe existir (registrado desde la app).
 * - Crea el grupo "Demo historico (12 meses)" con ese usuario y 2 companeros ficticios
 *   (correos @ftgroup.demo, con hash de clave inutilizable: no pueden iniciar sesion).
 * - Inserta ~12 meses de gastos con tendencia, estacionalidad y pagos con retraso variable.
 * - Es idempotente: si el grupo demo ya existe para ese usuario, lo borra y lo recrea.
 * - Es el UNICO script del servicio que escribe en la BD (el servicio en si es de solo lectura).
 */
import { crearPool } from '../src/infrastructure/adapters/out/postgres/db';

const NOMBRE_GRUPO = 'Demo historico (12 meses)';
const MESES = 12;

// PRNG determinista (mulberry32) para que la demo sea reproducible.
function prng(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORIAS: Array<{ nombre: string; base: number; peso: number }> = [
  { nombre: 'alimentacion', base: 85000, peso: 5 },
  { nombre: 'transporte', base: 45000, peso: 3 },
  { nombre: 'servicios', base: 160000, peso: 1.2 },
  { nombre: 'alojamiento', base: 420000, peso: 0.5 },
  { nombre: 'entretenimiento', base: 70000, peso: 2 },
];

function fechaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const email = (process.argv[2] ?? '').trim().toLowerCase();
  if (!email) {
    console.error('Falta el correo.  Uso: npm run seed:demo -- tu_correo@ejemplo.com');
    process.exit(1);
  }
  const pool = crearPool(false);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const u = await client.query<{ id: number; nombre: string }>('SELECT id, nombre FROM usuario WHERE email = $1', [email]);
    if (!u.rowCount) {
      console.error(`No existe un usuario con el correo ${email}. Registrate primero en la app.`);
      await client.query('ROLLBACK');
      process.exit(1);
    }
    const yo = u.rows[0].id;

    // Companeros ficticios
    const companeros: number[] = [];
    for (const [nombre, correo] of [['Beto Demo', 'beto.demo@ftgroup.demo'], ['Caro Demo', 'caro.demo@ftgroup.demo']]) {
      const r = await client.query<{ id: number }>(
        `INSERT INTO usuario (nombre, email, password_hash) VALUES ($1, $2, '!sin-acceso!')
         ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id`,
        [nombre, correo],
      );
      companeros.push(r.rows[0].id);
    }
    const miembros = [yo, ...companeros];

    // Recrear el grupo demo
    await client.query('DELETE FROM grupo WHERE nombre = $1 AND creado_por = $2', [NOMBRE_GRUPO, yo]);
    const g = await client.query<{ id: number }>(
      `INSERT INTO grupo (nombre, descripcion, icono, ciudad, creado_por)
       VALUES ($1, 'Datos de demostracion para KPIs y predicciones', 'home', 'Bogota', $2) RETURNING id`,
      [NOMBRE_GRUPO, yo],
    );
    const grupoId = g.rows[0].id;
    for (const [i, uid] of miembros.entries()) {
      await client.query(
        `INSERT INTO miembro_grupo (grupo_id, usuario_id, rol) VALUES ($1, $2, $3)`,
        [grupoId, uid, i === 0 ? 'administrador' : 'miembro'],
      );
    }

    const rnd = prng(20261006);
    const hoy = new Date();
    const hoyISO = fechaISO(hoy);
    let nGastos = 0;
    let nDivisiones = 0;

    // Del mes mas antiguo (hace MESES-1) al mes en curso
    for (let k = MESES - 1; k >= 0; k--) {
      const primero = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - k, 1));
      const diasMes = new Date(Date.UTC(primero.getUTCFullYear(), primero.getUTCMonth() + 1, 0)).getUTCDate();
      const indice = MESES - 1 - k; // 0..11
      const tendencia = 1 + 0.025 * indice; // +2.5 % mensual
      const estacional = 1 + 0.12 * Math.sin((indice / 12) * 2 * Math.PI);
      const esMesEnCurso = k === 0;
      const cuantos = esMesEnCurso ? 3 : 6 + Math.floor(rnd() * 3);

      for (let j = 0; j < cuantos; j++) {
        // categoria ponderada
        const total = CATEGORIAS.reduce((s, c) => s + c.peso, 0);
        let x = rnd() * total;
        const cat = CATEGORIAS.find((c) => (x -= c.peso) < 0) ?? CATEGORIAS[0];
        const monto = Math.round((cat.base * tendencia * estacional * (0.75 + rnd() * 0.5)) / 1000) * 1000;
        const dia = esMesEnCurso
          ? 1 + Math.floor(rnd() * Math.max(1, hoy.getUTCDate()))
          : 1 + Math.floor(rnd() * diasMes);
        const fecha = new Date(Date.UTC(primero.getUTCFullYear(), primero.getUTCMonth(), Math.min(dia, diasMes)));
        if (fechaISO(fecha) > hoyISO) continue;
        const pagador = miembros[Math.floor(rnd() * miembros.length)];

        const gs = await client.query<{ id: number }>(
          `INSERT INTO gasto (grupo_id, pagador_id, descripcion, monto_total, fecha_gasto, categoria, tipo_division, origen_registro)
           VALUES ($1, $2, $3, $4, $5, $6, 'equitativa', $7) RETURNING id`,
          [grupoId, pagador, `${cat.nombre[0].toUpperCase()}${cat.nombre.slice(1)} #${indice + 1}-${j + 1}`, monto, fechaISO(fecha), cat.nombre, rnd() < 0.3 ? 'ocr' : 'manual'],
        );
        nGastos++;

        const cuota = Math.round((monto / miembros.length) * 100) / 100;
        let acumulado = 0;
        for (const [i, uid] of miembros.entries()) {
          const monto_asignado = i === miembros.length - 1 ? Math.round((monto - acumulado) * 100) / 100 : cuota;
          acumulado += monto_asignado;
          // El pagador ya "pago" su parte el mismo dia; el resto paga con retraso variable (2-30 dias).
          let estado = 'pendiente';
          let fechaPago: string | null = null;
          if (uid === pagador) {
            estado = 'pagado';
            fechaPago = fechaISO(fecha);
          } else {
            const retraso = Math.round(2 + rnd() * rnd() * 28); // sesgado a plazos cortos
            const pago = new Date(fecha.getTime() + retraso * 86400000);
            if (fechaISO(pago) <= hoyISO && rnd() < 0.92) {
              estado = 'pagado';
              fechaPago = fechaISO(pago);
            }
          }
          await client.query(
            `INSERT INTO division_gasto (gasto_id, usuario_id, monto_asignado, estado_pago, fecha_pago)
             VALUES ($1, $2, $3, $4, $5)`,
            [gs.rows[0].id, uid, monto_asignado, estado, fechaPago],
          );
          nDivisiones++;
        }
      }
    }
    await client.query('COMMIT');
    console.log(`Grupo demo creado (id ${grupoId}) para ${email}: ${nGastos} gastos, ${nDivisiones} divisiones, ${MESES} meses de historia.`);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Error al sembrar datos:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
