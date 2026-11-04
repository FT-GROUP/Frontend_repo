import { Pool } from 'pg';
import { EstadoUsuario, RolUsuario } from '../../../../../domain/entities/Usuario';
import { AdministracionRepository, UsuarioAdministracion } from '../../../../../domain/ports/out/AdministracionRepository';

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
