import { AccesoDenegadoError } from '../../domain/errors';
import { Alcance, ConsultaKpis, ConsultaPredicciones, ObtenerKpisUseCase, ObtenerPrediccionesUseCase } from '../../domain/ports/in/AnaliticaUseCases';
import { DatosFinancierosRepository, Reloj } from '../../domain/ports/out/DatosFinancierosRepository';
import { sumarMeses, mesDe } from '../../domain/services/Fechas';
import { calcularKpis } from '../../domain/services/Kpis';
import { calcularPredicciones } from '../../domain/services/Predicciones';

const MESES_HISTORIAL_PREDICCION = 24;

/**
 * Resuelve a que grupos tiene derecho el usuario: solo grupos activos
 * de los que es miembro activo. Si pide un grupo ajeno -> 403.
 */
async function resolverAlcance(repo: DatosFinancierosRepository, usuarioId: number, grupoId?: number): Promise<Alcance> {
  const propios = await repo.gruposDeUsuario(usuarioId);
  if (grupoId !== undefined && !propios.some((g) => g.id === grupoId)) {
    throw new AccesoDenegadoError('No perteneces a ese grupo.');
  }
  const grupos = grupoId !== undefined ? propios.filter((g) => g.id === grupoId) : propios;
  return { grupoId: grupoId ?? null, grupos };
}

async function cargar(repo: DatosFinancierosRepository, grupoIds: number[], desde: string) {
  if (!grupoIds.length) return { gastos: [], divisiones: [], miembros: [] };
  const [gastos, miembros] = await Promise.all([repo.gastosDesde(grupoIds, desde), repo.miembrosDeGrupos(grupoIds)]);
  const divisiones = await repo.divisionesDeGastos(gastos.map((g) => g.id));
  return { gastos, divisiones, miembros };
}

/** Caso de uso: indicadores y estimadores del periodo solicitado. */
export class ObtenerKpisUseCaseImpl implements ObtenerKpisUseCase {
  constructor(private readonly repo: DatosFinancierosRepository, private readonly reloj: Reloj) {}

  async ejecutar(c: ConsultaKpis) {
    const alcance = await resolverAlcance(this.repo, c.usuarioId, c.grupoId);
    const hoy = this.reloj.hoy();
    const desde = `${sumarMeses(mesDe(hoy), -(c.meses - 1))}-01`;
    const datos = await cargar(this.repo, alcance.grupos.map((g) => g.id), desde);
    return { ...calcularKpis({ ...datos, usuarioId: c.usuarioId, hoy, meses: c.meses }), alcance };
  }
}

/** Caso de uso: predicciones simples a partir del historial. */
export class ObtenerPrediccionesUseCaseImpl implements ObtenerPrediccionesUseCase {
  constructor(private readonly repo: DatosFinancierosRepository, private readonly reloj: Reloj) {}

  async ejecutar(c: ConsultaPredicciones) {
    const alcance = await resolverAlcance(this.repo, c.usuarioId, c.grupoId);
    const hoy = this.reloj.hoy();
    const desde = `${sumarMeses(mesDe(hoy), -MESES_HISTORIAL_PREDICCION)}-01`;
    const datos = await cargar(this.repo, alcance.grupos.map((g) => g.id), desde);
    return { ...calcularPredicciones({ ...datos, hoy, horizonte: c.horizonte }), alcance };
  }
}
