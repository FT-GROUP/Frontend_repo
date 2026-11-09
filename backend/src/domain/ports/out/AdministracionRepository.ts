import { EstadoUsuario, RolUsuario } from '../../entities/Usuario';

export interface UsuarioAdministracion {
  id: number;
  nombre: string;
  email: string;
  estado: EstadoUsuario;
  rol: RolUsuario;
  fechaRegistro: Date;
}

export interface AgrupacionAdministracion {
  id: number;
  nombre: string;
  descripcion: string | null;
  color: string;
  totalGrupos: number;
  fechaCreacion: Date;
}

export interface GrupoAdministracion {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: 'activo' | 'archivado';
  agrupacionId: number | null;
  agrupacionNombre: string | null;
  creadorNombre: string;
  miembrosActivos: number;
  totalGastos: number;
  ahorradoAlcancia: number;
  metaAlcancia: number;
  fechaCreacion: Date;
}

export interface AdministracionRepository {
  listarUsuarios(): Promise<UsuarioAdministracion[]>;
  buscarUsuario(id: number): Promise<UsuarioAdministracion | null>;
  cambiarEstado(id: number, estado: EstadoUsuario): Promise<UsuarioAdministracion | null>;
  cambiarRol(id: number, rol: RolUsuario): Promise<UsuarioAdministracion | null>;
  listarGruposYAgrupaciones?(): Promise<{ grupos: GrupoAdministracion[]; agrupaciones: AgrupacionAdministracion[] }>;
  crearAgrupacion?(
    actorId: number,
    nombre: string,
    descripcion?: string,
    color?: string,
    grupoIds?: number[],
  ): Promise<AgrupacionAdministracion>;
  actualizarGrupoAdministracion?(
    grupoId: number,
    datos: { agrupacionId?: number | null; estado?: 'activo' | 'archivado' },
  ): Promise<GrupoAdministracion | null>;
}
