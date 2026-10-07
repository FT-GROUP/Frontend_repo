import { evaluarModelo, promedioMovil, pronosticar, tendenciaLineal } from '../../src/domain/services/Pronostico';

describe('Pronostico', () => {
  it('promedio movil y tendencia lineal producen los valores esperados', () => {
    expect(promedioMovil(3)([10, 20, 30], 1)).toEqual([20]);
    expect(tendenciaLineal([100, 200, 300, 400], 2)).toEqual([500, 600]);
  });

  it('elige la tendencia lineal en una serie creciente y marca confianza alta', () => {
    const serie = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    const r = pronosticar(serie, 2);
    expect(r.modelo).toBe('tendencia_lineal');
    expect(r.puntos.map((p) => p.valor)).toEqual([1000, 1100]);
    expect(r.mae).toBe(0);
    expect(r.confianza).toBe('alta');
    expect(evaluarModelo('promedio_movil', serie)!.mae).toBeGreaterThan(100);
  });

  it('en una serie constante prefiere el modelo mas simple', () => {
    const r = pronosticar([500, 500, 500, 500, 500, 500], 1);
    expect(r.modelo).toBe('promedio_movil');
    expect(r.puntos[0].valor).toBe(500);
    expect(r.confianza).toBe('media');
  });

  it('con poco historial usa promedio movil y confianza baja', () => {
    const r = pronosticar([100, 200], 1);
    expect(r.modelo).toBe('promedio_movil');
    expect(r.puntos[0].valor).toBe(150);
    expect(r.confianza).toBe('baja');
    expect(r.mae).toBeNull();
  });

  it('con serie vacia devuelve ceros y nunca valores negativos', () => {
    const r = pronosticar([], 3);
    expect(r.puntos.map((p) => p.valor)).toEqual([0, 0, 0]);
    const caida = pronosticar([900, 700, 500, 300, 100, 50], 6);
    expect(Math.min(...caida.puntos.map((p) => p.valor), ...caida.puntos.map((p) => p.inferior))).toBeGreaterThanOrEqual(0);
  });

  it('el intervalo se ensancha con el horizonte', () => {
    const r = pronosticar([100, 300, 150, 400, 200, 500, 250], 3);
    const anchos = r.puntos.map((p) => p.superior - p.inferior);
    expect(anchos[1]).toBeGreaterThanOrEqual(anchos[0]);
    expect(anchos[2]).toBeGreaterThanOrEqual(anchos[1]);
  });
});
