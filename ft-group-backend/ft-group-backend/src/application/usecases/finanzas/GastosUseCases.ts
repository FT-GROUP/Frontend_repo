import { AccesoDenegadoError, RecursoNoEncontradoError, ValidacionError } from '../../../domain/errors/DomainErrors';
import {
  EliminarGastoUseCase, GastoDetalle, LiquidarDeudaUseCase, ListarGastosUseCase, RegistrarGastoComando,
  RegistrarGastoUseCase, RegistrarPagoUseCase,
} from '../../../domain/ports/in/FinanzasUseCases';
import {
  GastoRepository, GrupoRepository, HistorialRepository, NotificacionRepository,
} from '../../../domain/ports/out/FinanzasRepositories';
import { MotorCalculo, Participacion } from '../../../domain/services/MotorCalculo';
import { RecalcularBalances, exigirMiembro } from './soporte';

const CATEGORIAS = ['vivienda', 'servicios', 'alimentacion', 'transporte', 'alojamiento', 'oficina', 'entretenimiento', 'otro'];

/** Caso de uso "Registrar gasto" (manual o desde un recibo escaneado). */
export class RegistrarGastoUseCaseImpl implements RegistrarGastoUseCase {
  constructor(
    private readonly grupos: GrupoRepository,
    private readonly gastos: GastoRepository,
    private readonly recalcular: RecalcularBalances,
    private readonly historial: HistorialRepository,
    private readonly notificaciones: NotificacionRepository,
  ) {}

  async ejecutar(c: RegistrarGastoComando): Promise<number> {
    const { grupo } = await exigirMiembro(this.grupos, c.grupoId, c.usuarioId);
    const miembros = (await this.grupos.listarMiembros([c.grupoId])).filter((m) => m.estado === 'activo');
    const idsMiembros = new Set(miembros.map((m) => m.usuarioId));

    if (!idsMiembros.has(c.pagadorId)) throw new ValidacionError('Quien pagó debe ser miembro del grupo.');
    for (const d of c.divisiones) {
      if (!idsMiembros.has(d.usuarioId)) throw new ValidacionError('Todos los participantes deben ser miembros del grupo.');
    }
    if (!CATEGORIAS.includes(c.categoria)) throw new ValidacionError('Categoría no válida.');

    const montoTotal = Math.round(c.montoTotal * 100) / 100;
    const participaciones: Participacion[] = c.tipoDivision === 'equitativa'
      ? MotorCalculo.dividirEquitativamente(montoTotal, c.divisiones.map((d) => d.usuarioId))
      : c.divisiones
        .map((d) => ({ usuarioId: d.usuarioId, montoAsignado: Math.round((d.montoAsignado ?? 0) * 100) / 100 }))
        .filter((d) => d.montoAsignado > 0);

    MotorCalculo.validarDivision(montoTotal, participaciones);

    const gastoId = await this.gastos.registrar({
      grupoId: c.grupoId,
      pagadorId: c.pagadorId,
      descripcion: c.descripcion.trim(),
      montoTotal,
      fechaGasto: c.fechaGasto,
      categoria: c.categoria,
      tipoDivision: c.tipoDivision,
      origenRegistro: c.origenRegistro,
    }, participaciones, c.recibo);

    await this.recalcular.ejecutar(c.grupoId);
    await this.historial.registrar({
      usuarioId: c.usuarioId, grupoId: c.grupoId, gastoId, tipo: 'gasto_creado',
      descripcion: `${c.descripcion.trim()} por $${montoTotal.toLocaleString('es-CO')}`,
    });
    const avisar = participaciones.map((p) => p.usuarioId).filter((id) => id !== c.usuarioId);
    if (avisar.length) {
      await this.notificaciones.crear(avisar, 'nuevo_gasto', `Nuevo gasto en "${grupo.nombre}": ${c.descripcion.trim()}.`);
    }
    return gastoId;
  }
}

/** Caso de uso "Consultar gastos" de todos los grupos activos del usuario. */
export class ListarGastosUseCaseImpl implements ListarGastosUseCase {
  constructor(private readonly grupos: GrupoRepository, private readonly gastos: GastoRepository) {}

  async ejecutar(usuarioId: number): Promise<GastoDetalle[]> {
    const lista = await this.grupos.listarActivosDeUsuario(usuarioId);
    if (lista.length === 0) return [];
    const ids = lista.map((g) => g.id);
    const [miembros, gastos] = await Promise.all([this.grupos.listarMiembros(ids), this.gastos.listarPorGrupos(ids)]);
    const divisiones = await this.gastos.listarDivisiones(gastos.map((g) => g.id));
    const nombre = (id: number) => miembros.find((m) => m.usuarioId === id)?.nombre ?? 'Usuario';
    const grupoNombre = new Map(lista.map((g) => [g.id, g.nombre]));

    return gastos.map((gasto) => {
      const divs = divisiones.filter((d) => d.gastoId === gasto.id);
      const mia = divs.find((d) => d.usuarioId === usuarioId);
      const meDeben = gasto.pagadorId === usuarioId
        ? divs.filter((d) => d.usuarioId !== usuarioId && d.estadoPago === 'pendiente').reduce((a, d) => a + d.montoAsignado, 0)
        : 0;
      let miEstado: GastoDetalle['miEstado'] = 'no_participa';
      if (gasto.pagadorId === usuarioId) miEstado = 'pagador';
      else if (mia) miEstado = mia.estadoPago;
      return {
        gasto,
        grupo: { id: gasto.grupoId, nombre: grupoNombre.get(gasto.grupoId) ?? '' },
        pagador: { id: gasto.pagadorId, nombre: nombre(gasto.pagadorId) },
        divisiones: divs.map((d) => ({ ...d, nombre: nombre(d.usuarioId) })),
        miParte: mia?.montoAsignado ?? 0,
        miEstado,
        meDeben,
      };
    });
  }
}

/** Caso de uso "Eliminar gasto": lo puede hacer quien lo pagó o el administrador. */
export class EliminarGastoUseCaseImpl implements EliminarGastoUseCase {
  constructor(
    private readonly grupos: GrupoRepository,
    private readonly gastos: GastoRepository,
    private readonly recalcular: RecalcularBalances,
    private readonly historial: HistorialRepository,
  ) {}

  async ejecutar(c: { usuarioId: number; gastoId: number }): Promise<void> {
    const gasto = await this.gastos.buscarPorId(c.gastoId);
    if (!gasto) throw new RecursoNoEncontradoError('el gasto', c.gastoId);
    const { rol } = await exigirMiembro(this.grupos, gasto.grupoId, c.usuarioId);
    if (gasto.pagadorId !== c.usuarioId && rol !== 'administrador') {
      throw new AccesoDenegadoError('Solo quien pagó el gasto o el administrador pueden eliminarlo.');
    }
    await this.gastos.eliminar(c.gastoId);
    await this.recalcular.ejecutar(gasto.grupoId);
    await this.historial.registrar({ usuarioId: c.usuarioId, grupoId: gasto.grupoId, tipo: 'gasto_eliminado', descripcion: `Gasto "${gasto.descripcion}" eliminado` });
  }
}

/** Caso de uso "Registrar pago" de una parte (DIVISION_GASTO -> pagado). */
export class RegistrarPagoUseCaseImpl implements RegistrarPagoUseCase {
  constructor(
    private readonly grupos: GrupoRepository,
    private readonly gastos: GastoRepository,
    private readonly recalcular: RecalcularBalances,
    private readonly historial: HistorialRepository,
    private readonly notificaciones: NotificacionRepository,
  ) {}

  async ejecutar(c: { usuarioId: number; gastoId: number; deudorId: number }): Promise<void> {
    const gasto = await this.gastos.buscarPorId(c.gastoId);
    if (!gasto) throw new RecursoNoEncontradoError('el gasto', c.gastoId);
    await exigirMiembro(this.grupos, gasto.grupoId, c.usuarioId);
    // Puede marcarlo el propio deudor ("pagué") o quien pagó el gasto ("recibí").
    if (c.usuarioId !== c.deudorId && c.usuarioId !== gasto.pagadorId) {
      throw new AccesoDenegadoError('Solo el deudor o quien pagó el gasto pueden registrar este pago.');
    }
    if (c.deudorId === gasto.pagadorId) throw new ValidacionError('Quien pagó el gasto no tiene deuda en él.');

    const actualizado = await this.gastos.marcarDivisionPagada(c.gastoId, c.deudorId);
    if (!actualizado) throw new ValidacionError('Esa parte no existe o ya estaba pagada.');

    await this.recalcular.ejecutar(gasto.grupoId);
    await this.historial.registrar({ usuarioId: c.usuarioId, grupoId: gasto.grupoId, gastoId: gasto.id, tipo: 'pago_registrado', descripcion: `Pago de la parte de "${gasto.descripcion}"` });
    if (c.usuarioId === c.deudorId) {
      await this.notificaciones.crear([gasto.pagadorId], 'pago_recibido', `Te registraron un pago de "${gasto.descripcion}".`);
    }
  }
}

/**
 * Caso de uso "Liquidar deuda": salda el balance neto entre dos personas
 * de un grupo (cierra las partes pendientes en ambos sentidos).
 */
export class LiquidarDeudaUseCaseImpl implements LiquidarDeudaUseCase {
  constructor(
    private readonly grupos: GrupoRepository,
    private readonly gastos: GastoRepository,
    private readonly recalcular: RecalcularBalances,
    private readonly historial: HistorialRepository,
    private readonly notificaciones: NotificacionRepository,
  ) {}

  async ejecutar(c: { usuarioId: number; grupoId: number; deudorId: number; acreedorId: number }): Promise<void> {
    await exigirMiembro(this.grupos, c.grupoId, c.usuarioId);
    if (c.usuarioId !== c.deudorId && c.usuarioId !== c.acreedorId) {
      throw new AccesoDenegadoError('Solo las personas involucradas pueden registrar esta liquidación.');
    }
    const n = (await this.gastos.marcarPagadasEntre(c.grupoId, c.deudorId, c.acreedorId))
      + (await this.gastos.marcarPagadasEntre(c.grupoId, c.acreedorId, c.deudorId));
    if (n === 0) throw new ValidacionError('No hay deudas pendientes entre estas personas.');

    await this.recalcular.ejecutar(c.grupoId);
    await this.historial.registrar({ usuarioId: c.usuarioId, grupoId: c.grupoId, tipo: 'pago_registrado', descripcion: `Liquidación registrada (${n} partes saldadas)` });
    const otro = c.usuarioId === c.deudorId ? c.acreedorId : c.deudorId;
    await this.notificaciones.crear([otro], 'pago_recibido', 'Se registró una liquidación de deudas contigo.');
  }
}
