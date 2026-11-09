import { AccesoDenegadoError, ConflictoEstadoError, GrupoNoEncontradoError, UsuarioNoEncontradoError } from '../../domain/errors/DomainErrors';
import { EstadoUsuario, RolUsuario } from '../../domain/entities/Usuario';
import {
  AdministracionRepository,
  AgrupacionAdministracion,
  GrupoAdministracion,
  UsuarioAdministracion,
} from '../../domain/ports/out/AdministracionRepository';

export class AdministracionService {
  constructor(private readonly repository: AdministracionRepository) {}

  listarUsuarios(): Promise<UsuarioAdministracion[]> {
    return this.repository.listarUsuarios();
  }

  async listarGruposYAgrupaciones(): Promise<{ grupos: GrupoAdministracion[]; agrupaciones: AgrupacionAdministracion[] }> {
    if (!this.repository.listarGruposYAgrupaciones) {
      return { grupos: [], agrupaciones: [] };
    }
    return this.repository.listarGruposYAgrupaciones();
  }

  async crearAgrupacion(
    actorId: number,
    nombre: string,
    descripcion?: string,
    color?: string,
    grupoIds?: number[],
  ): Promise<AgrupacionAdministracion> {
    if (!this.repository.crearAgrupacion) {
      return {
        id: Date.now(),
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        color: color || '#1f9d63',
        totalGrupos: grupoIds?.length ?? 0,
        fechaCreacion: new Date(),
      };
    }
    return this.repository.crearAgrupacion(actorId, nombre.trim(), descripcion?.trim(), color, grupoIds);
  }

  async actualizarGrupoAdministracion(
    grupoId: number,
    datos: { agrupacionId?: number | null; estado?: 'activo' | 'archivado' },
  ): Promise<GrupoAdministracion> {
    if (!this.repository.actualizarGrupoAdministracion) {
      throw new GrupoNoEncontradoError(grupoId);
    }
    const actualizado = await this.repository.actualizarGrupoAdministracion(grupoId, datos);
    if (!actualizado) throw new GrupoNoEncontradoError(grupoId);
    return actualizado;
  }

  async cambiarEstado(
    actorId: number,
    actorRol: RolUsuario,
    usuarioId: number,
    estado: EstadoUsuario,
  ): Promise<UsuarioAdministracion> {
    const objetivo = await this.buscarObjetivo(usuarioId);
    this.validarObjetivo(actorId, actorRol, objetivo);
    await this.validarUltimoSupervisor(objetivo, estado !== 'activo' || objetivo.rol !== 'supervisor');
    const actualizado = await this.repository.cambiarEstado(usuarioId, estado);
    if (!actualizado) throw new UsuarioNoEncontradoError(usuarioId);
    return actualizado;
  }

  async cambiarRol(
    actorId: number,
    actorRol: RolUsuario,
    usuarioId: number,
    rol: RolUsuario,
  ): Promise<UsuarioAdministracion> {
    if (actorRol !== 'supervisor') {
      throw new AccesoDenegadoError('Solo un supervisor puede cambiar roles.');
    }
    const objetivo = await this.buscarObjetivo(usuarioId);
    if (actorId === usuarioId) {
      throw new AccesoDenegadoError('No puedes cambiar tu propio rol.');
    }
    await this.validarUltimoSupervisor(objetivo, objetivo.rol === 'supervisor' && rol !== 'supervisor');
    const actualizado = await this.repository.cambiarRol(usuarioId, rol);
    if (!actualizado) throw new UsuarioNoEncontradoError(usuarioId);
    return actualizado;
  }

  private async buscarObjetivo(id: number): Promise<UsuarioAdministracion> {
    const usuario = await this.repository.buscarUsuario(id);
    if (!usuario) throw new UsuarioNoEncontradoError(id);
    return usuario;
  }

  private validarObjetivo(actorId: number, actorRol: RolUsuario, objetivo: UsuarioAdministracion): void {
    if (actorId === objetivo.id) {
      throw new AccesoDenegadoError('No puedes cambiar el estado de tu propia cuenta.');
    }
    if (actorRol === 'moderador' && objetivo.rol !== 'usuario') {
      throw new AccesoDenegadoError('El moderador solo puede gestionar cuentas de usuario.');
    }
  }

  private async validarUltimoSupervisor(objetivo: UsuarioAdministracion, cambiaAcceso: boolean): Promise<void> {
    if (!cambiaAcceso || objetivo.rol !== 'supervisor' || objetivo.estado !== 'activo') return;
    const usuarios = await this.repository.listarUsuarios();
    const supervisoresActivos = usuarios.filter((usuario) => usuario.rol === 'supervisor' && usuario.estado === 'activo');
    if (supervisoresActivos.length <= 1) {
      throw new ConflictoEstadoError('No se puede desactivar o degradar al último supervisor activo.');
    }
  }
}
