import { Pool, PoolClient } from 'pg';
import {
  BalanceRepository, DivisionRegistro, GastoRegistro, GastoRepository, GrupoRegistro, GrupoRepository,
  HistorialRepository, MiembroRegistro, MovimientoRegistro, NotificacionRepository, NuevoGasto, NuevoGrupo,
  NuevoRecibo, RolMiembro, TipoMovimiento, TipoNotificacion,
} from '../../../../../domain/ports/out/FinanzasRepositories';
import { Deuda, Participacion, SaldoPar } from '../../../../../domain/services/MotorCalculo';

/**
 * Adaptadores de salida (persistencia en PostgreSQL) de los modulos
 * financieros. Todas las consultas son parametrizadas ($1, $2...).
 */

async function enTransaccion<T>(pool: Pool, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await fn(client);
    await client.query('COMMIT');
    return r;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/* ------------------------------------------------------------------ */
/* GRUPO / MIEMBRO_GRUPO                                               */
/* ------------------------------------------------------------------ */
const COLS_GRUPO = `g.id, g.nombre, g.descripcion, g.icono, g.ciudad, g.latitud, g.longitud,
  g.creado_por AS "creadoPor", g.fecha_creacion AS "fechaCreacion", g.estado`;

export class PostgresGrupoRepository implements GrupoRepository {
  constructor(private readonly pool: Pool) {}

  crear(datos: NuevoGrupo, creadorId: number, miembrosIds: number[]): Promise<number> {
    return enTransaccion(this.pool, async (c) => {
      const { rows } = await c.query<{ id: number }>(
        `INSERT INTO grupo (nombre, descripcion, icono, ciudad, latitud, longitud, creado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [datos.nombre, datos.descripcion, datos.icono, datos.ciudad, datos.latitud, datos.longitud, creadorId],
      );
      const grupoId = rows[0].id;
      await c.query(
        `INSERT INTO miembro_grupo (grupo_id, usuario_id, rol) VALUES ($1, $2, 'administrador')`,
        [grupoId, creadorId],
      );
      for (const usuarioId of miembrosIds) {
        await c.query(
          `INSERT INTO miembro_grupo (grupo_id, usuario_id, rol) VALUES ($1, $2, 'miembro')
           ON CONFLICT (grupo_id, usuario_id) DO NOTHING`,
          [grupoId, usuarioId],
        );
      }
      return grupoId;
    });
  }

  async buscarPorId(id: number): Promise<GrupoRegistro | null> {
    const { rows } = await this.pool.query<GrupoRegistro>(`SELECT ${COLS_GRUPO} FROM grupo g WHERE g.id = $1`, [id]);
    return rows[0] ?? null;
  }

  async listarActivosDeUsuario(usuarioId: number): Promise<GrupoRegistro[]> {
    const { rows } = await this.pool.query<GrupoRegistro>(
      `SELECT ${COLS_GRUPO} FROM grupo g
       JOIN miembro_grupo m ON m.grupo_id = g.id
       WHERE m.usuario_id = $1 AND m.estado = 'activo' AND g.estado = 'activo'
       ORDER BY g.fecha_creacion`,
      [usuarioId],
    );
    return rows;
  }

  async listarMiembros(grupoIds: number[]): Promise<MiembroRegistro[]> {
    if (!grupoIds.length) return [];
    const { rows } = await this.pool.query<MiembroRegistro>(
      `SELECT m.grupo_id AS "grupoId", m.usuario_id AS "usuarioId", u.nombre, u.email, m.rol, m.estado
       FROM miembro_grupo m JOIN usuario u ON u.id = m.usuario_id
       WHERE m.grupo_id = ANY($1::bigint[])
       ORDER BY m.rol, m.fecha_union`,
      [grupoIds],
    );
    return rows;
  }

  async obtenerRol(grupoId: number, usuarioId: number): Promise<RolMiembro | null> {
    const { rows } = await this.pool.query<{ rol: RolMiembro }>(
      `SELECT rol FROM miembro_grupo WHERE grupo_id = $1 AND usuario_id = $2 AND estado = 'activo'`,
      [grupoId, usuarioId],
    );
    return rows[0]?.rol ?? null;
  }

  async agregarMiembro(grupoId: number, usuarioId: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO miembro_grupo (grupo_id, usuario_id, rol) VALUES ($1, $2, 'miembro')
       ON CONFLICT (grupo_id, usuario_id) DO UPDATE SET estado = 'activo', fecha_union = NOW()`,
      [grupoId, usuarioId],
    );
  }

  async archivar(id: number): Promise<void> {
    await this.pool.query(`UPDATE grupo SET estado = 'archivado' WHERE id = $1`, [id]);
  }
}

/* ------------------------------------------------------------------ */
/* GASTO / DIVISION_GASTO / RECIBO_ESCANEADO                           */
/* ------------------------------------------------------------------ */
const COLS_GASTO = `id, grupo_id AS "grupoId", pagador_id AS "pagadorId", descripcion, monto_total AS "montoTotal",
  fecha_gasto AS "fechaGasto", categoria, tipo_division AS "tipoDivision", origen_registro AS "origenRegistro",
  fecha_registro AS "fechaRegistro"`;

export class PostgresGastoRepository implements GastoRepository {
  constructor(private readonly pool: Pool) {}

  registrar(gasto: NuevoGasto, participaciones: Participacion[], recibo?: NuevoRecibo): Promise<number> {
    return enTransaccion(this.pool, async (c) => {
      const { rows } = await c.query<{ id: number }>(
        `INSERT INTO gasto (grupo_id, pagador_id, descripcion, monto_total, fecha_gasto, categoria, tipo_division,
                            origen_registro, comprobante_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [gasto.grupoId, gasto.pagadorId, gasto.descripcion, gasto.montoTotal, gasto.fechaGasto, gasto.categoria,
          gasto.tipoDivision, gasto.origenRegistro, recibo?.imagenUrl ?? null],
      );
      const gastoId = rows[0].id;
      for (const p of participaciones) {
        const pagada = p.usuarioId === gasto.pagadorId; // la parte de quien pagó queda saldada
        await c.query(
          `INSERT INTO division_gasto (gasto_id, usuario_id, monto_asignado, estado_pago, fecha_pago)
           VALUES ($1, $2, $3, $4, $5)`,
          [gastoId, p.usuarioId, p.montoAsignado, pagada ? 'pagado' : 'pendiente', pagada ? new Date() : null],
        );
      }
      if (recibo) {
        await c.query(
          `INSERT INTO recibo_escaneado (gasto_id, imagen_url, monto_extraido, fecha_extraida, comercio_extraido,
                                         categoria_sugerida, confianza_ocr, estado_validacion)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmado')`,
          [gastoId, recibo.imagenUrl, recibo.montoExtraido, recibo.fechaExtraida, recibo.comercioExtraido,
            recibo.categoriaSugerida, recibo.confianzaOcr],
        );
      }
      return gastoId;
    });
  }

  async buscarPorId(id: number): Promise<GastoRegistro | null> {
    const { rows } = await this.pool.query<GastoRegistro>(`SELECT ${COLS_GASTO} FROM gasto WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  async listarPorGrupos(grupoIds: number[]): Promise<GastoRegistro[]> {
    if (!grupoIds.length) return [];
    const { rows } = await this.pool.query<GastoRegistro>(
      `SELECT ${COLS_GASTO} FROM gasto WHERE grupo_id = ANY($1::bigint[]) ORDER BY fecha_gasto DESC, fecha_registro DESC`,
      [grupoIds],
    );
    return rows;
  }

  async listarDivisiones(gastoIds: number[]): Promise<DivisionRegistro[]> {
    if (!gastoIds.length) return [];
    const { rows } = await this.pool.query<DivisionRegistro>(
      `SELECT gasto_id AS "gastoId", usuario_id AS "usuarioId", monto_asignado AS "montoAsignado",
              estado_pago AS "estadoPago", fecha_pago AS "fechaPago"
       FROM division_gasto WHERE gasto_id = ANY($1::bigint[]) ORDER BY id`,
      [gastoIds],
    );
    return rows;
  }

  async eliminar(id: number): Promise<void> {
    await this.pool.query(`DELETE FROM gasto WHERE id = $1`, [id]);
  }

  async marcarDivisionPagada(gastoId: number, usuarioId: number): Promise<boolean> {
    const r = await this.pool.query(
      `UPDATE division_gasto SET estado_pago = 'pagado', fecha_pago = NOW()
       WHERE gasto_id = $1 AND usuario_id = $2 AND estado_pago = 'pendiente'`,
      [gastoId, usuarioId],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async marcarPagadasEntre(grupoId: number, deudorId: number, acreedorId: number): Promise<number> {
    const r = await this.pool.query(
      `UPDATE division_gasto d SET estado_pago = 'pagado', fecha_pago = NOW()
       FROM gasto g
       WHERE d.gasto_id = g.id AND g.grupo_id = $1 AND g.pagador_id = $3
         AND d.usuario_id = $2 AND d.estado_pago = 'pendiente'`,
      [grupoId, deudorId, acreedorId],
    );
    return r.rowCount ?? 0;
  }

  async deudasPendientes(grupoId: number): Promise<Deuda[]> {
    const { rows } = await this.pool.query<Deuda>(
      `SELECT d.usuario_id AS "deudorId", g.pagador_id AS "acreedorId", SUM(d.monto_asignado) AS monto
       FROM division_gasto d JOIN gasto g ON g.id = d.gasto_id
       WHERE g.grupo_id = $1 AND d.estado_pago = 'pendiente' AND d.usuario_id <> g.pagador_id
       GROUP BY d.usuario_id, g.pagador_id`,
      [grupoId],
    );
    return rows.map((r) => ({ ...r, monto: Number(r.monto) }));
  }
}

/* ------------------------------------------------------------------ */
/* BALANCE                                                             */
/* ------------------------------------------------------------------ */
export class PostgresBalanceRepository implements BalanceRepository {
  constructor(private readonly pool: Pool) {}

  reemplazar(grupoId: number, saldos: SaldoPar[]): Promise<void> {
    return enTransaccion(this.pool, async (c) => {
      await c.query(`DELETE FROM balance WHERE grupo_id = $1`, [grupoId]);
      for (const s of saldos) {
        await c.query(
          `INSERT INTO balance (grupo_id, deudor_id, acreedor_id, monto) VALUES ($1, $2, $3, $4)`,
          [grupoId, s.deudorId, s.acreedorId, s.monto],
        );
      }
    });
  }

  async listarPorGrupos(grupoIds: number[]): Promise<(SaldoPar & { grupoId: number })[]> {
    if (!grupoIds.length) return [];
    const { rows } = await this.pool.query<SaldoPar & { grupoId: number }>(
      `SELECT grupo_id AS "grupoId", deudor_id AS "deudorId", acreedor_id AS "acreedorId", monto
       FROM balance WHERE grupo_id = ANY($1::bigint[]) AND monto > 0 ORDER BY monto DESC`,
      [grupoIds],
    );
    return rows;
  }
}

/* ------------------------------------------------------------------ */
/* HISTORIAL_MOVIMIENTO                                                */
/* ------------------------------------------------------------------ */
export class PostgresHistorialRepository implements HistorialRepository {
  constructor(private readonly pool: Pool) {}

  async registrar(mov: { usuarioId: number; grupoId: number; gastoId?: number | null; tipo: TipoMovimiento; descripcion: string }): Promise<void> {
    await this.pool.query(
      `INSERT INTO historial_movimiento (usuario_id, grupo_id, gasto_id, tipo_movimiento, descripcion)
       VALUES ($1, $2, $3, $4, $5)`,
      [mov.usuarioId, mov.grupoId, mov.gastoId ?? null, mov.tipo, mov.descripcion],
    );
  }

  async listarPorGrupos(grupoIds: number[], limite: number): Promise<MovimientoRegistro[]> {
    const { rows } = await this.pool.query<MovimientoRegistro>(
      `SELECT h.id, h.usuario_id AS "usuarioId", u.nombre AS "usuarioNombre", h.grupo_id AS "grupoId",
              g.nombre AS "grupoNombre", h.gasto_id AS "gastoId", h.tipo_movimiento AS "tipoMovimiento",
              h.descripcion, h.fecha
       FROM historial_movimiento h
       JOIN usuario u ON u.id = h.usuario_id
       JOIN grupo g ON g.id = h.grupo_id
       WHERE h.grupo_id = ANY($1::bigint[])
       ORDER BY h.fecha DESC, h.id DESC LIMIT $2`,
      [grupoIds, limite],
    );
    return rows;
  }
}

/* ------------------------------------------------------------------ */
/* NOTIFICACION                                                        */
/* ------------------------------------------------------------------ */
export class PostgresNotificacionRepository implements NotificacionRepository {
  constructor(private readonly pool: Pool) {}

  async crear(usuarioIds: number[], tipo: TipoNotificacion, mensaje: string): Promise<void> {
    for (const id of new Set(usuarioIds)) {
      await this.pool.query(`INSERT INTO notificacion (usuario_id, tipo, mensaje) VALUES ($1, $2, $3)`, [id, tipo, mensaje]);
    }
  }
}
