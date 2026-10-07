import { calcularKpis } from '../../src/domain/services/Kpis';
import { calcularPredicciones } from '../../src/domain/services/Predicciones';
import { DivisionDato, GastoDato, MiembroDato } from '../../src/domain/services/Datos';

const g = (id: number, pagadorId: number, descripcion: string, monto: number, fecha: string, categoria: string, origen: 'manual' | 'ocr' = 'manual'): GastoDato =>
  ({ id, grupoId: 1, pagadorId, descripcion, monto, fecha, categoria, origen });
const d = (gastoId: number, usuarioId: number, monto: number, estadoPago: 'pendiente' | 'pagado', fechaPago: string | null = null): DivisionDato =>
  ({ gastoId, usuarioId, monto, estadoPago, fechaPago });
const miembros: MiembroDato[] = [{ usuarioId: 1, nombre: 'Ana', grupoId: 1 }, { usuarioId: 2, nombre: 'Beto', grupoId: 1 }];

describe('calcularKpis', () => {
  const gastos = [
    g(1, 1, 'Arriendo', 1_000_000, '2026-08-05', 'vivienda'),
    g(2, 2, 'Mercado', 300_000, '2026-09-10', 'alimentacion', 'ocr'),
    g(3, 1, 'Servicios', 200_000, '2026-10-02', 'servicios'),
    g(4, 1, 'Antiguo (fuera de ventana)', 500_000, '2026-06-01', 'otro'),
  ];
  const divisiones = [
    d(1, 1, 500_000, 'pagado'), d(1, 2, 500_000, 'pendiente'),
    d(2, 1, 150_000, 'pagado', '2026-09-20'), d(2, 2, 150_000, 'pagado'),
    d(3, 1, 100_000, 'pagado'), d(3, 2, 100_000, 'pendiente'),
    d(4, 1, 250_000, 'pagado'), d(4, 2, 250_000, 'pendiente'),
  ];
  const k = calcularKpis({ gastos, divisiones, miembros, usuarioId: 1, hoy: '2026-10-15', meses: 3 });

  it('resume el periodo ignorando gastos fuera de la ventana', () => {
    expect(k.periodo.desde).toBe('2026-08-01');
    expect(k.resumen.totalGastado).toBe(1_500_000);
    expect(k.resumen.numGastos).toBe(3);
    expect(k.resumen.gastoPromedioMensual).toBe(650_000); // ago y sep (meses cerrados)
    expect(k.resumen.gastoPromedioPorGasto).toBe(500_000);
    expect(k.resumen.gastoMedianoPorGasto).toBe(300_000);
    expect(k.resumen.gastoPorPersona).toBe(750_000);
    expect(k.resumen.mayorGasto?.descripcion).toBe('Arriendo');
  });

  it('calcula estimadores', () => {
    expect(k.estimadores.n).toBe(3);
    expect(k.estimadores.media).toBe(500_000);
    expect(k.estimadores.desviacionEstandar).toBe(435_890);
    expect(k.estimadores.coeficienteVariacion).toBe(0.87);
    expect(k.estimadores.intervaloConfianza95?.inferior).toBe(0);
  });

  it('calcula serie mensual, tendencia y categorias', () => {
    expect(k.mensual.map((m) => m.total)).toEqual([1_000_000, 300_000, 200_000]);
    expect(k.tendencia.variacionUltimoMesPct).toBe(-70);
    expect(k.tendencia.mesEnCurso).toEqual({ mes: '2026-10', acumulado: 200_000 });
    expect(k.categorias[0]).toMatchObject({ categoria: 'vivienda', total: 1_000_000, porcentaje: 66.7 });
    expect(k.indicadores.indiceConcentracion).toBe(0.502);
  });

  it('calcula indicadores de pago y cartera', () => {
    expect(k.indicadores.tasaPago).toBe(0.2);
    expect(k.indicadores.morosidad).toBe(0.8);
    expect(k.indicadores.deudaPendiente).toBe(600_000);
    expect(k.indicadores.divisionesPendientes).toBe(2);
    expect(k.indicadores.diasPromedioPago).toBe(10);
    expect(k.indicadores.antiguedadPromedioDeudaDias).toBe(42);
    expect(k.indicadores.porcentajeGastosOcr).toBe(33.3);
    expect(k.indicadores.indiceEquidad).toBe(0.7);
  });

  it('calcula las cifras por integrante y del usuario', () => {
    const ana = k.miembros.find((m) => m.usuarioId === 1)!;
    const beto = k.miembros.find((m) => m.usuarioId === 2)!;
    expect(ana).toMatchObject({ aportado: 1_200_000, consumo: 750_000, posicionNeta: 450_000, deudaPendiente: 0, tasaPago: 1 });
    expect(beto).toMatchObject({ aportado: 300_000, consumo: 750_000, posicionNeta: -450_000, deudaPendiente: 600_000, tasaPago: 0 });
    expect(k.usuario).toMatchObject({ aportado: 1_200_000, meDeben: 600_000, debes: 0 });
  });

  it('no falla sin datos', () => {
    const v = calcularKpis({ gastos: [], divisiones: [], miembros: [], usuarioId: 1, hoy: '2026-10-15', meses: 6 });
    expect(v.resumen.totalGastado).toBe(0);
    expect(v.indicadores.tasaPago).toBeNull();
    expect(v.indicadores.categoriaPrincipal).toBeNull();
    expect(v.mensual).toHaveLength(6);
  });
});

describe('calcularPredicciones', () => {
  const crecientes: GastoDato[] = Array.from({ length: 9 }, (_, i) =>
    g(i + 1, 1, `Mes ${i + 1}`, 100_000 * (i + 1), `2026-${String(i + 1).padStart(2, '0')}-10`, i % 2 ? 'servicios' : 'vivienda'));

  it('pronostica el mes en curso y los siguientes a partir del historial', () => {
    const gastos = [...crecientes, g(20, 1, 'Octubre', 500_000, '2026-10-02', 'vivienda')];
    const p = calcularPredicciones({ gastos, divisiones: [], miembros, hoy: '2026-10-15', horizonte: 3 });
    expect(p.historico).toHaveLength(9);
    expect(p.gastoTotal.modelo).toBe('tendencia_lineal');
    expect(p.gastoTotal.confianza).toBe('alta');
    expect(p.gastoTotal.pronostico.map((x) => x.mes)).toEqual(['2026-10', '2026-11', '2026-12']);
    expect(p.gastoTotal.pronostico.map((x) => x.valor)).toEqual([1_000_000, 1_100_000, 1_200_000]);
    expect(p.mesEnCurso).toMatchObject({ acumulado: 500_000, esperado: 1_000_000, avancePct: 50 });
    expect(p.porCategoria.length).toBeGreaterThan(0);
    expect(p.pagos.disponible).toBe(false);
  });

  it('estima probabilidades de pago y cobro esperado con historial suficiente', () => {
    const gastos = Array.from({ length: 7 }, (_, i) => g(i + 1, 1, `G${i + 1}`, 100_000, '2026-09-01', 'otro'));
    const dias = [3, 5, 8, 10, 20, 40];
    const fechas = ['2026-09-04', '2026-09-06', '2026-09-09', '2026-09-11', '2026-09-21', '2026-10-11'];
    const divisiones = [
      ...dias.map((_, i) => d(i + 1, 2, 50_000, 'pagado', fechas[i])),
      d(7, 2, 80_000, 'pendiente'),
    ];
    const p = calcularPredicciones({ gastos, divisiones, miembros, hoy: '2026-10-13', horizonte: 1 });
    expect(p.pagos.disponible).toBe(true);
    expect(p.pagos.pagosObservados).toBe(6);
    expect(p.pagos.diasMediana).toBe(10);
    expect(p.pagos.dias90).toBe(40);
    expect(p.pagos.probabilidadPago30d).toBe(0.833);
    // la deuda lleva 42 dias; ningun pago historico tardo mas -> se usa la probabilidad general
    expect(p.pagos.cobroEsperado30d).toBeCloseTo(80_000 * 0.833, -2);
    expect(p.pagos.porDeudor[0]).toMatchObject({ usuarioId: 2, pendiente: 80_000 });
  });
});
