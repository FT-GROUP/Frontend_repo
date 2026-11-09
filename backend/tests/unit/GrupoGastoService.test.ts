import { describe, expect, it, jest } from '@jest/globals';
import { GrupoGastoService } from '../../src/application/services/GrupoGastoService';
import { GrupoGastoRepository } from '../../src/domain/ports/out/GrupoGastoRepository';
import { ValidacionError } from '../../src/domain/errors/DomainErrors';

describe('GrupoGastoService', () => {
  function crearRepository(): jest.Mocked<GrupoGastoRepository> {
    return {
      crearGrupo: jest.fn(),
      listarGrupos: jest.fn(),
      listarIntegrantes: jest.fn(),
      agregarMiembro: jest.fn(),
      quitarMiembro: jest.fn(),
      crearGasto: jest.fn(),
      listarGastos: jest.fn(),
      registrarPago: jest.fn(),
      listarBalances: jest.fn(),
      listarHistorial: jest.fn(),
      obtenerResumen: jest.fn(),
      listarNotificaciones: jest.fn(),
      marcarNotificacionLeida: jest.fn(),
    };
  }

  it('no persiste una división personalizada cuyo total no coincide', () => {
    const repository = crearRepository();
    const service = new GrupoGastoService(repository);

    expect(() => service.crearGasto(1, 4, {
      descripcion: 'Mercado',
      montoTotal: 20,
      fechaGasto: '2026-10-06',
      categoria: 'Comida',
      tipoDivision: 'personalizada',
      participaciones: [
        { usuarioId: 1, montoAsignado: 8 },
        { usuarioId: 2, montoAsignado: 10 },
      ],
    })).toThrow(ValidacionError);

    expect(repository.crearGasto).not.toHaveBeenCalled();
  });

  it('envía la división equitativa exacta al repositorio', async () => {
    const repository = crearRepository();
    const service = new GrupoGastoService(repository);

    await service.crearGasto(1, 4, {
      descripcion: 'Mercado',
      montoTotal: 10,
      fechaGasto: '2026-10-06',
      categoria: 'Comida',
      tipoDivision: 'equitativa',
      usuarioIds: [1, 2, 3],
    });

    expect(repository.crearGasto).toHaveBeenCalledWith(1, 4, expect.objectContaining({
      participaciones: [
        { usuarioId: 1, montoAsignado: 3.34 },
        { usuarioId: 2, montoAsignado: 3.33 },
        { usuarioId: 3, montoAsignado: 3.33 },
      ],
    }));
  });

  it('valida y registra aportes y metas en la alcancía del grupo', async () => {
    const repository = crearRepository();
    repository.configurarAlcancia = jest.fn(async (_uid, grupoId, nombre, meta) => ({
      grupoId,
      nombre,
      meta,
      ahorrado: 0,
    }));
    repository.aportarAlcancia = jest.fn(async (_uid, grupoId, monto, nota) => ({
      grupoId,
      ahorrado: monto,
      nota,
    }));
    const service = new GrupoGastoService(repository);

    expect(() => service.aportarAlcancia(1, 4, 0)).toThrow(ValidacionError);
    expect(() => service.configurarAlcancia(1, 4, 'Meta negativa', -100)).toThrow(ValidacionError);

    const metaRes = await service.configurarAlcancia(1, 4, '  Fondo viaje  ', 500000);
    expect(metaRes).toEqual({ grupoId: 4, nombre: 'Fondo viaje', meta: 500000, ahorrado: 0 });

    const aporteRes = await service.aportarAlcancia(1, 4, 80000, '  Cuota 1  ');
    expect(aporteRes).toEqual({ grupoId: 4, ahorrado: 80000, nota: 'Cuota 1' });
  });
});