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
  constructor(private readonly pool: Pool) {}

  async listarUsuarios(): Promise<UsuarioAdministracion[]> {
    const resultado = await this.pool.query<FilaUsuarioAdministracion>(
      `SELECT id, nombre, email, estado, rol, fecha_registro FROM usuario ORDER BY fecha_registro DESC, id DESC`,
    );
    return resultado.rows.map((fila) => this.aUsuario(fila));
  }

  async buscarUsuario(id: number): Promise<UsuarioAdministracion | null> {
    const resultado = await this.pool.query<FilaUsuarioAdministracion>(
      `SELECT id, nombre, email, estado, rol, fecha_registro FROM usuario WHERE id = $1 LIMIT 1`,
      [id],
    );
    return resultado.rows[0] ? this.aUsuario(resultado.rows[0]) : null;
  }

  async cambiarEstado(id: number, estado: EstadoUsuario): Promise<UsuarioAdministracion | null> {
    const resultado = await this.pool.query<FilaUsuarioAdministracion>(
      `UPDATE usuario SET estado = $1 WHERE id = $2 RETURNING id, nombre, email, estado, rol, fecha_registro`,
      [estado, id],
    );
    return resultado.rows[0] ? this.aUsuario(resultado.rows[0]) : null;
  }

  async cambiarRol(id: number, rol: RolUsuario): Promise<UsuarioAdministracion | null> {
    const resultado = await this.pool.query<FilaUsuarioAdministracion>(
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
