import { AccesoDenegadoError, RecursoNoEncontradoError } from '../../../domain/errors/DomainErrors';
import { GrupoDetalle } from '../../../domain/ports/in/FinanzasUseCases';
import {
  BalanceRepository, GastoRepository, GrupoRegistro, GrupoRepository, RolMiembro,
} from '../../../domain/ports/out/FinanzasRepositories';
import { MotorCalculo } from '../../../domain/services/MotorCalculo';

/**
 * Servicios de aplicacion compartidos por los casos de uso financieros.
 */

/** Verifica que el grupo exista, este activo y que el usuario sea miembro activo. */
export async function exigirMiembro(
  grupos: GrupoRepository, grupoId: number, usuarioId: number,
): Promise<{ grupo: GrupoRegistro; rol: RolMiembro }> {
  const grupo = await grupos.buscarPorId(grupoId);
  if (!grupo || grupo.estado !== 'activo') throw new RecursoNoEncontradoError('el grupo', grupoId);
  const rol = await grupos.obtenerRol(grupoId, usuarioId);
  if (!rol) throw new AccesoDenegadoError('No perteneces a este grupo.');
  return { grupo, rol };
}

/**
 * Motor de calculo: vuelve a consolidar la tabla BALANCE del grupo a
 * partir de las divisiones pendientes. Se ejecuta despues de cualquier
 * cambio en gastos o pagos.
 */
export class RecalcularBalances {
  constructor(private readonly gastos: GastoRepository, private readonly balances: BalanceRepository) {}

  async ejecutar(grupoId: number): Promise<void> {
    const deudas = await this.gastos.deudasPendientes(grupoId);
    await this.balances.reemplazar(grupoId, MotorCalculo.balancePorPares(deudas));
  }
}

/** Arma la vista detallada de los grupos activos del usuario. */
export async function construirGruposDetalle(
  usuarioId: number,
  grupos: GrupoRepository,
  gastos: GastoRepository,
  balances: BalanceRepository,
): Promise<GrupoDetalle[]> {
  const lista = await grupos.listarActivosDeUsuario(usuarioId);
  if (lista.length === 0) return [];
  const ids = lista.map((g) => g.id);
  const [miembros, gastosGrupos, saldos] = await Promise.all([
    grupos.listarMiembros(ids),
    gastos.listarPorGrupos(ids),
    balances.listarPorGrupos(ids),
  ]);

  return lista.map((grupo) => {
    const activos = miembros.filter((m) => m.grupoId === grupo.id && m.estado === 'activo');
    const delGrupo = gastosGrupos.filter((g) => g.grupoId === grupo.id);
    const saldosGrupo = saldos.filter((s) => s.grupoId === grupo.id)
      .map(({ deudorId, acreedorId, monto }) => ({ deudorId, acreedorId, monto }));
    const miBalance = saldosGrupo.reduce(
      (acc, s) => acc + (s.acreedorId === usuarioId ? s.monto : 0) - (s.deudorId === usuarioId ? s.monto : 0), 0);
    return {
      grupo,
      miembros: activos,
      rol: activos.find((m) => m.usuarioId === usuarioId)?.rol ?? 'miembro',
      totalGastos: delGrupo.reduce((acc, g) => acc + g.montoTotal, 0),
      numGastos: delGrupo.length,
      miBalance,
      saldos: saldosGrupo,
    };
  });
}
