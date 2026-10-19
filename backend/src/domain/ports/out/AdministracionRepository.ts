import { EstadoUsuario, RolUsuario } from '../../entities/Usuario';

export interface UsuarioAdministracion {
  id: number;
  nombre: string;
  email: string;
  estado: EstadoUsuario;
  rol: RolUsuario;
  fechaRegistro: Date;
}

export interface AdministracionRepository {
  listarUsuarios(): Promise<UsuarioAdministracion[]>;
  buscarUsuario(id: number): Promise<UsuarioAdministracion | null>;
  cambiarEstado(id: number, estado: EstadoUsuario): Promise<UsuarioAdministracion | null>;
  cambiarRol(id: number, rol: RolUsuario): Promise<UsuarioAdministracion | null>;
}
