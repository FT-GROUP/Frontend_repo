import {
  LiquidacionDetalle, ListarHistorialUseCase, ObtenerResumenUseCase, ResumenPanel,
} from '../../../domain/ports/in/FinanzasUseCases';
import {
  BalanceRepository, GastoRepository, GrupoRepository, HistorialRepository, MovimientoRegistro,
} from '../../../domain/ports/out/FinanzasRepositories';
import { construirGruposDetalle } from './soporte';

/** Caso de uso "Panel de usuario": balance neto, te deben/debes y liquidaciones. */
export class ObtenerResumenUseCaseImpl implements ObtenerResumenUseCase {
  constructor(
    private readonly grupos: GrupoRepository,
    private readonly gastos: GastoRepository,
    private readonly balances: BalanceRepository,
  ) {}

  async ejecutar(usuarioId: number): Promise<ResumenPanel> {
    const grupos = await construirGruposDetalle(usuarioId, this.grupos, this.gastos, this.balances);
    let teDeben = 0;
    let debes = 0;
    const liquidaciones: LiquidacionDetalle[] = [];

    for (const g of grupos) {
      const nombre = (id: number) => g.miembros.find((m) => m.usuarioId === id)?.nombre ?? 'Usuario';
      for (const s of g.saldos) {
        if (s.acreedorId === usuarioId) teDeben += s.monto;
        if (s.deudorId === usuarioId) debes += s.monto;
        liquidaciones.push({
          ...s,
          grupoId: g.grupo.id,
          grupoNombre: g.grupo.nombre,
          deudor: { id: s.deudorId, nombre: nombre(s.deudorId) },
          acreedor: { id: s.acreedorId, nombre: nombre(s.acreedorId) },
        });
      }
    }
    // Primero las que involucran al usuario, luego por monto.
    const mia = (l: LiquidacionDetalle) => Number(l.deudorId === usuarioId || l.acreedorId === usuarioId);
    liquidaciones.sort((a, b) => mia(b) - mia(a) || b.monto - a.monto);

    return { grupos, teDeben, debes, balance: teDeben - debes, liquidaciones };
  }
}

/** Caso de uso "Historial financiero": log de movimientos de los grupos del usuario. */
export class ListarHistorialUseCaseImpl implements ListarHistorialUseCase {
  constructor(private readonly grupos: GrupoRepository, private readonly historial: HistorialRepository) {}

  async ejecutar(usuarioId: number, limite = 100): Promise<MovimientoRegistro[]> {
    const lista = await this.grupos.listarActivosDeUsuario(usuarioId);
    if (lista.length === 0) return [];
    return this.historial.listarPorGrupos(lista.map((g) => g.id), Math.min(Math.max(limite, 1), 500));
  }
}
