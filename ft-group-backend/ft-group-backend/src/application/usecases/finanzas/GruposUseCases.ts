import { AccesoDenegadoError, ValidacionError } from '../../../domain/errors/DomainErrors';
import {
  AgregarMiembroUseCase, ArchivarGrupoUseCase, CrearGrupoComando, CrearGrupoUseCase, GrupoDetalle, ListarGruposUseCase,
} from '../../../domain/ports/in/FinanzasUseCases';
import {
  BalanceRepository, GastoRepository, GrupoRepository, HistorialRepository, NotificacionRepository,
} from '../../../domain/ports/out/FinanzasRepositories';
import { UsuarioRepository } from '../../../domain/ports/out/UsuarioRepository';
import { construirGruposDetalle, exigirMiembro } from './soporte';

/** Caso de uso "Crear grupo financiero". */
export class CrearGrupoUseCaseImpl implements CrearGrupoUseCase {
  constructor(
    private readonly grupos: GrupoRepository,
    private readonly usuarios: UsuarioRepository,
    private readonly gastos: GastoRepository,
    private readonly balances: BalanceRepository,
    private readonly historial: HistorialRepository,
    private readonly notificaciones: NotificacionRepository,
  ) {}

  async ejecutar(c: CrearGrupoComando): Promise<GrupoDetalle> {
    const creador = await this.usuarios.buscarPorId(c.usuarioId);
    if (!creador) throw new AccesoDenegadoError();

    // Los integrantes deben ser usuarios registrados y activos.
    const emails = [...new Set(c.emailsIntegrantes.map((e) => e.trim().toLowerCase()))]
      .filter((e) => e && e !== creador.email);
    const miembrosIds: number[] = [];
    const noEncontrados: string[] = [];
    for (const email of emails) {
      const u = await this.usuarios.buscarPorEmail(email);
      if (u && u.estado === 'activo') miembrosIds.push(u.id as number);
      else noEncontrados.push(email);
    }
    if (noEncontrados.length) {
      throw new ValidacionError(
        `Estos correos no pertenecen a usuarios registrados: ${noEncontrados.join(', ')}. Pídeles que creen su cuenta primero.`,
        noEncontrados,
      );
    }

    const grupoId = await this.grupos.crear({
      nombre: c.nombre.trim(),
      descripcion: c.descripcion?.trim() || null,
      icono: c.icono || 'users',
      ciudad: c.ciudad ?? null,
      latitud: c.latitud ?? null,
      longitud: c.longitud ?? null,
    }, c.usuarioId, miembrosIds);

    await this.historial.registrar({ usuarioId: c.usuarioId, grupoId, tipo: 'grupo_creado', descripcion: `Grupo "${c.nombre.trim()}" creado` });
    if (miembrosIds.length) {
      await this.notificaciones.crear(miembrosIds, 'invitacion_grupo', `${creador.nombre} te agregó al grupo "${c.nombre.trim()}".`);
    }

    const detalle = await construirGruposDetalle(c.usuarioId, this.grupos, this.gastos, this.balances);
    return detalle.find((g) => g.grupo.id === grupoId) as GrupoDetalle;
  }
}

/** Caso de uso "Consultar mis grupos". */
export class ListarGruposUseCaseImpl implements ListarGruposUseCase {
  constructor(
    private readonly grupos: GrupoRepository,
    private readonly gastos: GastoRepository,
    private readonly balances: BalanceRepository,
  ) {}

  ejecutar(usuarioId: number): Promise<GrupoDetalle[]> {
    return construirGruposDetalle(usuarioId, this.grupos, this.gastos, this.balances);
  }
}

/** Caso de uso "Agregar integrante" (solo administradores). */
export class AgregarMiembroUseCaseImpl implements AgregarMiembroUseCase {
  constructor(
    private readonly grupos: GrupoRepository,
    private readonly usuarios: UsuarioRepository,
    private readonly gastos: GastoRepository,
    private readonly balances: BalanceRepository,
    private readonly historial: HistorialRepository,
    private readonly notificaciones: NotificacionRepository,
  ) {}

  async ejecutar(c: { usuarioId: number; grupoId: number; email: string }): Promise<GrupoDetalle> {
    const { grupo, rol } = await exigirMiembro(this.grupos, c.grupoId, c.usuarioId);
    if (rol !== 'administrador') throw new AccesoDenegadoError('Solo el administrador puede agregar integrantes.');

    const nuevo = await this.usuarios.buscarPorEmail(c.email.trim().toLowerCase());
    if (!nuevo || nuevo.estado !== 'activo') {
      throw new ValidacionError(`El correo ${c.email} no pertenece a un usuario registrado.`);
    }
    if (await this.grupos.obtenerRol(c.grupoId, nuevo.id as number)) {
      throw new ValidacionError(`${nuevo.nombre} ya pertenece al grupo.`);
    }

    await this.grupos.agregarMiembro(c.grupoId, nuevo.id as number);
    await this.historial.registrar({ usuarioId: c.usuarioId, grupoId: c.grupoId, tipo: 'miembro_agregado', descripcion: `${nuevo.nombre} se unió al grupo` });
    await this.notificaciones.crear([nuevo.id as number], 'invitacion_grupo', `Te agregaron al grupo "${grupo.nombre}".`);

    const detalle = await construirGruposDetalle(c.usuarioId, this.grupos, this.gastos, this.balances);
    return detalle.find((g) => g.grupo.id === c.grupoId) as GrupoDetalle;
  }
}

/** Caso de uso "Archivar grupo" (solo administradores). */
export class ArchivarGrupoUseCaseImpl implements ArchivarGrupoUseCase {
  constructor(private readonly grupos: GrupoRepository) {}

  async ejecutar(c: { usuarioId: number; grupoId: number }): Promise<void> {
    const { rol } = await exigirMiembro(this.grupos, c.grupoId, c.usuarioId);
    if (rol !== 'administrador') throw new AccesoDenegadoError('Solo el administrador puede archivar el grupo.');
    await this.grupos.archivar(c.grupoId);
  }
}
