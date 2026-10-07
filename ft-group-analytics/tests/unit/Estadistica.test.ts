import {
  desviacionEstandar, intervaloConfianzaMedia, media, mediana, percentil, regresionLineal,
} from '../../src/domain/services/Estadistica';
import { diasEntre, hoyEnZona, rangoMeses, sumarMeses } from '../../src/domain/services/Fechas';

describe('Estadistica', () => {
  it('calcula media, mediana y desviacion estandar muestral', () => {
    expect(media([2, 4, 6])).toBe(4);
    expect(mediana([1, 3, 2, 4])).toBe(2.5);
    expect(mediana([5, 1, 3])).toBe(3);
    expect(desviacionEstandar([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(desviacionEstandar([7])).toBe(0);
  });

  it('calcula percentiles con interpolacion lineal', () => {
    expect(percentil([1, 2, 3, 4, 5], 90)).toBeCloseTo(4.6, 5);
    expect(percentil([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentil([], 50)).toBe(0);
  });

  it('calcula el intervalo de confianza del 95 % con t de Student', () => {
    const ic = intervaloConfianzaMedia([10, 20, 30])!;
    expect(ic.inferior).toBeCloseTo(20 - 24.84, 1);
    expect(ic.superior).toBeCloseTo(20 + 24.84, 1);
    expect(intervaloConfianzaMedia([5])).toBeNull();
  });

  it('ajusta una regresion lineal exacta', () => {
    const r = regresionLineal([1, 3, 5, 7]);
    expect(r.pendiente).toBeCloseTo(2, 10);
    expect(r.intercepto).toBeCloseTo(1, 10);
    expect(r.r2).toBeCloseTo(1, 10);
  });
});

describe('Fechas', () => {
  it('suma meses cruzando de anio', () => {
    expect(sumarMeses('2026-11', 3)).toBe('2027-02');
    expect(sumarMeses('2026-01', -1)).toBe('2025-12');
  });
  it('genera rangos de meses y diferencias de dias', () => {
    expect(rangoMeses('2026-11', '2027-01')).toEqual(['2026-11', '2026-12', '2027-01']);
    expect(diasEntre('2026-09-30', '2026-10-07')).toBe(7);
  });
  it('usa la zona horaria de Bogota para "hoy"', () => {
    // 03:00 UTC del 7 de octubre = 22:00 del 6 de octubre en Bogota
    expect(hoyEnZona('America/Bogota', new Date('2026-10-07T03:00:00Z'))).toBe('2026-10-06');
  });
});
