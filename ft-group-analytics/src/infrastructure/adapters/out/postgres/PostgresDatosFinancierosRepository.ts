import { Pool } from 'pg';
import { DatosFinancierosRepository } from '../../../../domain/ports/out/DatosFinancierosRepository';
import { DivisionDato, GastoDato, MiembroDato } from '../../../../domain/services/Datos';

/**
 * Adaptador de salida: lee las tablas del backend principal
 * (grupo, miembro_grupo, gasto, division_gasto, usuario).
 * Consultas parametrizadas y montos convertidos a numero (float8).
 */
export class PostgresDatosFinancierosRepository implements DatosFinancierosRepository {
  constructor(private readonly pool: Pool) {}

  async gruposDeUsuario(usuarioId: number) {
    const { rows } = await this.pool.query<{ id: number; nombre: string }>(
      `SELECT g.id, g.nombre
         FROM grupo g JOIN miembro_grupo m ON m.grupo_id = g.id
        WHERE m.usuario_id = $1 AND m.estado = 'activo' AND g.estado = 'activo'
        ORDER BY g.nombre`,
      [usuarioId],
    );
    return rows;
  }

  async gastosDesde(grupoIds: number[], desde: string): Promise<GastoDato[]> {
    const { rows } = await this.pool.query<GastoDato>(
      `SELECT id, grupo_id AS "grupoId", pagador_id AS "pagadorId", descripcion,
              monto_total::float8 AS monto, to_char(fecha_gasto, 'YYYY-MM-DD') AS fecha,
              categoria, origen_registro AS origen
         FROM gasto
        WHERE grupo_id = ANY($1::bigint[]) AND fecha_gasto >= $2::date
        ORDER BY fecha_gasto, id`,
      [grupoIds, desde],
    );
    return rows;
  }

  async divisionesDeGastos(gastoIds: number[]): Promise<DivisionDato[]> {
    if (!gastoIds.length) return [];
    const { rows } = await this.pool.query<DivisionDato>(
      `SELECT gasto_id AS "gastoId", usuario_id AS "usuarioId", monto_asignado::float8 AS monto,
              estado_pago AS "estadoPago", to_char(fecha_pago, 'YYYY-MM-DD') AS "fechaPago"
         FROM division_gasto WHERE gasto_id = ANY($1::bigint[])`,
      [gastoIds],
    );
    return rows;
  }

  async miembrosDeGrupos(grupoIds: number[]): Promise<MiembroDato[]> {
    const { rows } = await this.pool.query<MiembroDato>(
      `SELECT m.grupo_id AS "grupoId", m.usuario_id AS "usuarioId", u.nombre
         FROM miembro_grupo m JOIN usuario u ON u.id = m.usuario_id
        WHERE m.grupo_id = ANY($1::bigint[]) AND m.estado = 'activo'`,
      [grupoIds],
    );
    return rows;
  }
}
