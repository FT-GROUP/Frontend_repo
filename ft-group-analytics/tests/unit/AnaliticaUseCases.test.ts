import { ObtenerKpisUseCaseImpl, ObtenerPrediccionesUseCaseImpl } from '../../src/application/usecases/AnaliticaUseCases';
import { AccesoDenegadoError } from '../../src/domain/errors';
import { DatosFinancierosRepository } from '../../src/domain/ports/out/DatosFinancierosRepository';

function repoMock(grupos: { id: number; nombre: string }[]): jest.Mocked<DatosFinancierosRepository> {
  return {
    gruposDeUsuario: jest.fn().mockResolvedValue(grupos),
    gastosDesde: jest.fn().mockResolvedValue([]),
    divisionesDeGastos: jest.fn().mockResolvedValue([]),
    miembrosDeGrupos: jest.fn().mockResolvedValue([]),
  };
}
const reloj = { hoy: () => '2026-10-15' };

describe('casos de uso de analitica', () => {
  it('rechaza consultar un grupo al que el usuario no pertenece', async () => {
    const repo = repoMock([{ id: 1, nombre: 'A' }]);
    await expect(new ObtenerKpisUseCaseImpl(repo, reloj).ejecutar({ usuarioId: 7, grupoId: 99, meses: 6 })).rejects.toBeInstanceOf(AccesoDenegadoError);
    await expect(new ObtenerPrediccionesUseCaseImpl(repo, reloj).ejecutar({ usuarioId: 7, grupoId: 99, horizonte: 3 })).rejects.toBeInstanceOf(AccesoDenegadoError);
    expect(repo.gastosDesde).not.toHaveBeenCalled();
  });

  it('consulta solo los grupos del usuario y la ventana de meses pedida', async () => {
    const repo = repoMock([{ id: 1, nombre: 'A' }, { id: 2, nombre: 'B' }]);
    const r = await new ObtenerKpisUseCaseImpl(repo, reloj).ejecutar({ usuarioId: 7, meses: 3 });
    expect(repo.gastosDesde).toHaveBeenCalledWith([1, 2], '2026-08-01');
    expect(r.alcance.grupos).toHaveLength(2);
    const r2 = await new ObtenerKpisUseCaseImpl(repo, reloj).ejecutar({ usuarioId: 7, grupoId: 2, meses: 3 });
    expect(r2.alcance.grupoId).toBe(2);
    expect(repo.gastosDesde).toHaveBeenLastCalledWith([2], '2026-08-01');
  });

  it('sin grupos devuelve resultados vacios sin consultar gastos', async () => {
    const repo = repoMock([]);
    const k = await new ObtenerKpisUseCaseImpl(repo, reloj).ejecutar({ usuarioId: 7, meses: 6 });
    const p = await new ObtenerPrediccionesUseCaseImpl(repo, reloj).ejecutar({ usuarioId: 7, horizonte: 3 });
    expect(k.resumen.totalGastado).toBe(0);
    expect(p.gastoTotal.pronostico.every((x) => x.valor === 0)).toBe(true);
    expect(repo.gastosDesde).not.toHaveBeenCalled();
  });
});
