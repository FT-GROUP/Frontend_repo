import { ValidacionError } from '../../domain/errors/DomainErrors';
import {
  dividirEquitativamente,
  ParticipacionCalculada,
  validarDistribucionPersonalizada,
} from '../../domain/services/distribucionGasto';
import { CrearGastoDatos, GrupoGastoRepository } from '../../domain/ports/out/GrupoGastoRepository';

export interface RegistrarGastoComando {
  descripcion: string;
  montoTotal: number;
  fechaGasto: string;
  categoria: string;
  tipoDivision: 'equitativa' | 'personalizada';
  usuarioIds?: number[];
  participaciones?: ParticipacionCalculada[];
}

export class GrupoGastoService {
  constructor(private readonly repository: GrupoGastoRepository) {}

  crearGrupo(usuarioId: number, nombre: string, descripcion?: string) {
    return this.repository.crearGrupo(usuarioId, nombre.trim(), descripcion?.trim());
  }

  listarGrupos(usuarioId: number) {
    return this.repository.listarGrupos(usuarioId);
  }

  listarIntegrantes(usuarioId: number, grupoId: number) {
    return this.repository.listarIntegrantes(usuarioId, grupoId);
  }

  agregarMiembro(actorId: number, grupoId: number, usuarioId: number) {
    return this.repository.agregarMiembro(actorId, grupoId, usuarioId);
  }

  quitarMiembro(actorId: number, grupoId: number, usuarioId: number) {
    return this.repository.quitarMiembro(actorId, grupoId, usuarioId);
  }

  crearGasto(actorId: number, grupoId: number, comando: RegistrarGastoComando) {
    let participaciones: ParticipacionCalculada[];
    if (comando.tipoDivision === 'equitativa') {
      if (!comando.usuarioIds?.length) {
        throw new ValidacionError('Indica al menos un participante para la división equitativa.');
      }
      participaciones = dividirEquitativamente(comando.montoTotal, comando.usuarioIds);
    } else {
      if (!comando.participaciones?.length) {
        throw new ValidacionError('Indica los montos asignados a cada participante.');
      }
      participaciones = validarDistribucionPersonalizada(comando.montoTotal, comando.participaciones);
    }

    const datos: CrearGastoDatos = {
      descripcion: comando.descripcion.trim(),
      montoTotal: comando.montoTotal,
      fechaGasto: comando.fechaGasto,
      categoria: comando.categoria.trim(),
      tipoDivision: comando.tipoDivision,
      participaciones,
    };
    return this.repository.crearGasto(actorId, grupoId, datos);
  }

  listarGastos(usuarioId: number, grupoId: number) {
    return this.repository.listarGastos(usuarioId, grupoId);
  }

  registrarPago(usuarioId: number, gastoId: number) {
    return this.repository.registrarPago(usuarioId, gastoId);
  }

  listarBalances(usuarioId: number, grupoId: number) {
    return this.repository.listarBalances(usuarioId, grupoId);
  }

  listarHistorial(usuarioId: number, grupoId: number, limite = 50) {
    return this.repository.listarHistorial(usuarioId, grupoId, limite);
  }

  obtenerResumen(usuarioId: number) {
    return this.repository.obtenerResumen(usuarioId);
  }

  listarNotificaciones(usuarioId: number, limite = 50) {
    return this.repository.listarNotificaciones(usuarioId, limite);
  }

  marcarNotificacionLeida(usuarioId: number, notificacionId: number) {
    return this.repository.marcarNotificacionLeida(usuarioId, notificacionId);
  }

  obtenerAlcancia(usuarioId: number, grupoId: number) {
    if (!this.repository.obtenerAlcancia) {
      return Promise.resolve({ grupoId, nombre: 'Alcancía del grupo', meta: 0, ahorrado: 0, aportes: [] });
    }
    return this.repository.obtenerAlcancia(usuarioId, grupoId);
  }

  configurarAlcancia(usuarioId: number, grupoId: number, nombre: string, meta: number) {
    if (meta < 0) throw new ValidacionError('La meta de ahorro no puede ser negativa.');
    if (!this.repository.configurarAlcancia) {
      return Promise.resolve({ grupoId, nombre: nombre.trim(), meta, ahorrado: 0 });
    }
    return this.repository.configurarAlcancia(usuarioId, grupoId, nombre.trim(), meta);
  }

  aportarAlcancia(usuarioId: number, grupoId: number, monto: number, nota?: string) {
    if (monto <= 0) throw new ValidacionError('El aporte a la alcancía debe ser mayor a cero.');
    if (!this.repository.aportarAlcancia) {
      return Promise.resolve({ grupoId, monto, nota: nota?.trim() || null });
    }
    return this.repository.aportarAlcancia(usuarioId, grupoId, monto, nota?.trim());
  }
}