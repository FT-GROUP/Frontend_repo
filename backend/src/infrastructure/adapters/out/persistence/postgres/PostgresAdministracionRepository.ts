import { Pool } from 'pg';
import { EstadoUsuario, RolUsuario } from '../../../../../domain/entities/Usuario';
import {
  AdministracionRepository,
  AgrupacionAdministracion,
  GrupoAdministracion,
  UsuarioAdministracion,
} from '../../../../../domain/ports/out/AdministracionRepository';

interface FilaUsuarioAdministracion {
  id: number;
  nombre: string;
  email: string;
  estado: EstadoUsuario;
  rol: RolUsuario;
  fecha_registro: Date;
}

export class PostgresAdministracionRepository implements AdministracionRepository {
  /**
   * Recibe dos pools de bases de datos:
   * 1. poolActivos: Contiene usuarios con estado 'activo'
   * 2. poolHistorico: Almacena en frío usuarios 'inactivos' o dados de baja
   */
  constructor(
    private readonly poolActivos: Pool,
    private readonly poolHistorico: Pool,
  ) {}

  async listarUsuarios(): Promise<UsuarioAdministracion[]> {
    // 1. Consultar base de datos activa
    const activosPromise = this.poolActivos.query<FilaUsuarioAdministracion>(
      `SELECT id, nombre, email, estado, rol, fecha_registro 
       FROM usuario 
       WHERE estado = 'activo'
       ORDER BY fecha_registro DESC, id DESC`,
    );

    // 2. Consultar base de datos / esquema de inactivos (cold storage)
    const inactivosPromise = this.poolHistorico.query<{
      id: number;
      nombre: string;
      email: string;
      rol: RolUsuario;
      fecha_registro: Date;
    }>(
      `SELECT id, nombre, email, 'inactivo'::text AS estado, rol, fecha_registro
       FROM historico.usuario_inactivo
       ORDER BY fecha_registro DESC, id DESC`,
    ).catch(() => ({ rows: [] }));

    const [resActivos, resInactivos] = await Promise.all([activosPromise, inactivosPromise]);

    const usuariosActivos = resActivos.rows.map((fila) => this.aUsuario(fila));
    const usuariosInactivos = resInactivos.rows.map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      email: fila.email,
      estado: 'inactivo' as EstadoUsuario,
      rol: fila.rol,
      fechaRegistro: new Date(fila.fecha_registro),
    }));

    return [...usuariosActivos, ...usuariosInactivos];
  }

  async buscarUsuario(id: number): Promise<UsuarioAdministracion | null> {
    // Buscar primero en la base de datos de activos
    const resultadoActivo = await this.poolActivos.query<FilaUsuarioAdministracion>(
      `SELECT id, nombre, email, estado, rol, fecha_registro FROM usuario WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (resultadoActivo.rows[0]) {
      return this.aUsuario(resultadoActivo.rows[0]);
    }

    // Si no está activo, buscar en la base de datos de inactivos
    try {
      const resultadoInactivo = await this.poolHistorico.query<{
        id: number;
        nombre: string;
        email: string;
        rol: RolUsuario;
        fecha_registro: Date;
      }>(
        `SELECT id, nombre, email, rol, fecha_registro FROM historico.usuario_inactivo WHERE id = $1 LIMIT 1`,
        [id],
      );
      if (resultadoInactivo.rows[0]) {
        const fila = resultadoInactivo.rows[0];
        return {
          id: fila.id,
          nombre: fila.nombre,
          email: fila.email,
          estado: 'inactivo',
          rol: fila.rol,
          fechaRegistro: new Date(fila.fecha_registro),
        };
      }
    } catch {
      // Si la tabla no está creada aún o falla, devuelve null
    }

    return null;
  }

  async cambiarEstado(id: number, estado: EstadoUsuario): Promise<UsuarioAdministracion | null> {
    if (estado === 'inactivo') {
      // ARCHIVADO: Mover de la base activa a la base inactiva
      const usuarioActivo = await this.buscarUsuario(id);
      if (!usuarioActivo) return null;

      try {
        await this.poolHistorico.query(
          `INSERT INTO historico.usuario_inactivo (id, nombre, email, rol, fecha_registro)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET fecha_desactivacion = NOW()`,
          [usuarioActivo.id, usuarioActivo.nombre, usuarioActivo.email, usuarioActivo.rol, usuarioActivo.fechaRegistro],
        );
      } catch (err) {
        console.error('Error al archivar en BD inactivos:', err);
      }

      const res = await this.poolActivos.query<FilaUsuarioAdministracion>(
        `UPDATE usuario SET estado = 'inactivo' WHERE id = $1 RETURNING id, nombre, email, estado, rol, fecha_registro`,
        [id],
      );
      return res.rows[0] ? this.aUsuario(res.rows[0]) : null;
    } else {
      // REACTIVACIÓN: Retirar de base inactiva y habilitar en base activa
      try {
        await this.poolHistorico.query(`DELETE FROM historico.usuario_inactivo WHERE id = $1`, [id]);
      } catch {}

      const res = await this.poolActivos.query<FilaUsuarioAdministracion>(
        `UPDATE usuario SET estado = 'activo' WHERE id = $1 RETURNING id, nombre, email, estado, rol, fecha_registro`,
        [id],
      );
      return res.rows[0] ? this.aUsuario(res.rows[0]) : null;
    }
  }

  async cambiarRol(id: number, rol: RolUsuario): Promise<UsuarioAdministracion | null> {
    const resultado = await this.poolActivos.query<FilaUsuarioAdministracion>(
      `UPDATE usuario SET rol = $1 WHERE id = $2 RETURNING id, nombre, email, estado, rol, fecha_registro`,
      [rol, id],
    );
    return resultado.rows[0] ? this.aUsuario(resultado.rows[0]) : null;
  }

  async listarGruposYAgrupaciones(): Promise<{ grupos: GrupoAdministracion[]; agrupaciones: AgrupacionAdministracion[] }> {
    const agrupacionesRes = await this.poolActivos.query(
      `SELECT ag.id, ag.nombre, ag.descripcion, ag.color, ag.fecha_creacion,
              COUNT(g.id)::int AS total_grupos
       FROM agrupacion_grupo ag
       LEFT JOIN grupo g ON g.agrupacion_id = ag.id
       GROUP BY ag.id
       ORDER BY ag.fecha_creacion DESC, ag.id DESC`,
    ).catch(() => ({ rows: [] }));

    const gruposRes = await this.poolActivos.query(
      `SELECT g.id, g.nombre, g.descripcion, g.estado, g.agrupacion_id,
              ag.nombre AS agrupacion_nombre,
              COALESCE(u.nombre, 'Sistema') AS creador_nombre,
              COUNT(DISTINCT m.id) FILTER (WHERE m.estado = 'activo')::int AS miembros_activos,
              COALESCE(SUM(DISTINCT ga.monto_total), 0)::float AS total_gastos,
              COALESCE(al.ahorrado, 0)::float AS ahorrado_alcancia,
              COALESCE(al.meta, 0)::float AS meta_alcancia,
              g.fecha_creacion
       FROM grupo g
       LEFT JOIN agrupacion_grupo ag ON ag.id = g.agrupacion_id
       LEFT JOIN usuario u ON u.id = g.creado_por
       LEFT JOIN miembro_grupo m ON m.grupo_id = g.id
       LEFT JOIN gasto ga ON ga.grupo_id = g.id
       LEFT JOIN alcancia_grupo al ON al.grupo_id = g.id
       GROUP BY g.id, ag.nombre, u.nombre, al.ahorrado, al.meta
       ORDER BY g.fecha_creacion DESC, g.id DESC`,
    ).catch(() => ({ rows: [] }));

    return {
      agrupaciones: agrupacionesRes.rows.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion,
        color: r.color || '#1f9d63',
        totalGrupos: r.total_grupos,
        fechaCreacion: new Date(r.fecha_creacion),
      })),
      grupos: gruposRes.rows.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion,
        estado: r.estado,
        agrupacionId: r.agrupacion_id ?? null,
        agrupacionNombre: r.agrupacion_nombre ?? null,
        creadorNombre: r.creador_nombre,
        miembrosActivos: r.miembros_activos,
        totalGastos: Number(r.total_gastos || 0),
        ahorradoAlcancia: Number(r.ahorrado_alcancia || 0),
        metaAlcancia: Number(r.meta_alcancia || 0),
        fechaCreacion: new Date(r.fecha_creacion),
      })),
    };
  }

  async crearAgrupacion(
    actorId: number,
    nombre: string,
    descripcion?: string,
    color = '#1f9d63',
    grupoIds: number[] = [],
  ): Promise<AgrupacionAdministracion> {
    const res = await this.poolActivos.query(
      `INSERT INTO agrupacion_grupo (nombre, descripcion, color, creado_por)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, descripcion, color, fecha_creacion`,
      [nombre, descripcion || null, color, actorId],
    );
    const ag = res.rows[0];
    if (grupoIds.length > 0) {
      await this.poolActivos.query(
        `UPDATE grupo SET agrupacion_id = $1 WHERE id = ANY($2::bigint[])`,
        [ag.id, grupoIds],
      );
    }
    return {
      id: ag.id,
      nombre: ag.nombre,
      descripcion: ag.descripcion,
      color: ag.color,
      totalGrupos: grupoIds.length,
      fechaCreacion: new Date(ag.fecha_creacion),
    };
  }

  async actualizarGrupoAdministracion(
    grupoId: number,
    datos: { agrupacionId?: number | null; estado?: 'activo' | 'archivado' },
  ): Promise<GrupoAdministracion | null> {
    if (datos.agrupacionId !== undefined) {
      await this.poolActivos.query(
        `UPDATE grupo SET agrupacion_id = $1 WHERE id = $2`,
        [datos.agrupacionId, grupoId],
      );
    }
    if (datos.estado !== undefined) {
      await this.poolActivos.query(
        `UPDATE grupo SET estado = $1 WHERE id = $2`,
        [datos.estado, grupoId],
      );
    }
    const { grupos } = await this.listarGruposYAgrupaciones();
    return grupos.find((g) => Number(g.id) === Number(grupoId)) ?? null;
  }

  private aUsuario(fila: FilaUsuarioAdministracion): UsuarioAdministracion {
    return {
      id: fila.id,
      nombre: fila.nombre,
      email: fila.email,
      estado: fila.estado,
      rol: fila.rol,
      fechaRegistro: new Date(fila.fecha_registro),
    };
  }
}
