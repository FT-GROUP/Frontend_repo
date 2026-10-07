import { media, redondear, suma } from './Estadistica';
import { diasEntre, mesDe, rangoMeses, sumarMeses } from './Fechas';
import { DivisionDato, GastoDato, MiembroDato } from './Datos';
import { Confianza, ModeloId, PuntoPronostico, pronosticar } from './Pronostico';

/**
 * Predicciones sobre datos historicos (dominio puro):
 *  - gasto total de los proximos meses (mejor modelo por backtesting),
 *  - gasto por categoria,
 *  - aporte esperado por integrante,
 *  - cobro esperado de deudas pendientes segun el historial de pagos.
 */

export interface EntradaPredicciones {
  gastos: GastoDato[];
  divisiones: DivisionDato[];
  miembros: MiembroDato[];
  hoy: string;
  horizonte: number;
}

export interface PrediccionesResultado {
  generadoEn: string;
  horizonte: number;
  historico: { mes: string; total: number }[];
  gastoTotal: {
    modelo: ModeloId;
    etiquetaModelo: string;
    parametros: Record<string, number>;
    confianza: Confianza;
    errorMedioAbsoluto: number | null;
    errorPorcentual: number | null;
    mesesDeHistorial: number;
    pronostico: (PuntoPronostico & { mes: string })[];
    evaluacionModelos: { modelo: ModeloId; etiqueta: string; mae: number; mape: number | null }[];
  };
  mesEnCurso: { mes: string; acumulado: number; esperado: number; avancePct: number | null; rangoEsperado: { inferior: number; superior: number } };
  porCategoria: { categoria: string; promedioUltimos3Meses: number; pronosticoMesEnCurso: number; modelo: ModeloId }[];
  porMiembro: { usuarioId: number; nombre: string; participacionPct: number; montoEsperadoMesEnCurso: number }[];
  pagos: {
    disponible: boolean;
    motivo?: string;
    pagosObservados: number;
    diasMediana: number | null;
    dias90: number | null;
    probabilidadPago7d: number | null;
    probabilidadPago30d: number | null;
    deudaPendiente: number;
    cobroEsperado30d: number | null;
    porDeudor: { usuarioId: number; nombre: string; pendiente: number; cobroEsperado30d: number }[];
  };
  alertas: { tipo: 'info' | 'aviso'; mensaje: string }[];
}

const MAX_HISTORIAL_MESES = 24;
const MIN_PAGOS_PARA_PREDECIR = 5;

/** Serie mensual de meses CERRADOS (excluye el mes en curso), con ceros intermedios. */
export function serieMensualCerrada(gastos: GastoDato[], hoy: string, filtro: (g: GastoDato) => boolean = () => true): { mes: string; total: number }[] {
  const mesActual = mesDe(hoy);
  const datos = gastos.filter((g) => filtro(g) && mesDe(g.fecha) < mesActual);
  if (!datos.length) return [];
  const primero = datos.reduce((m, g) => (mesDe(g.fecha) < m ? mesDe(g.fecha) : m), mesDe(datos[0].fecha));
  const desde = primero < sumarMeses(mesActual, -MAX_HISTORIAL_MESES) ? sumarMeses(mesActual, -MAX_HISTORIAL_MESES) : primero;
  const totales = new Map<string, number>();
  for (const g of datos) totales.set(mesDe(g.fecha), (totales.get(mesDe(g.fecha)) ?? 0) + g.monto);
  return rangoMeses(desde, sumarMeses(mesActual, -1)).map((mes) => ({ mes, total: redondear(totales.get(mes) ?? 0) }));
}

export function calcularPredicciones(e: EntradaPredicciones): PrediccionesResultado {
  const mesActual = mesDe(e.hoy);
  const serie = serieMensualCerrada(e.gastos, e.hoy);
  const valores = serie.map((s) => s.total);
  const total = pronosticar(valores, e.horizonte);
  const pronostico = total.puntos.map((p) => ({ ...p, mes: sumarMeses(mesActual, p.paso - 1) }));

  const acumulado = redondear(suma(e.gastos.filter((g) => mesDe(g.fecha) === mesActual).map((g) => g.monto)));
  const esperado = pronostico[0]?.valor ?? 0;

  // ---- Por categoria (top 5 por gasto historico) ----
  const totalCat = new Map<string, number>();
  for (const g of e.gastos) totalCat.set(g.categoria, (totalCat.get(g.categoria) ?? 0) + g.monto);
  const porCategoria = [...totalCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([categoria]) => {
    const s = serieMensualCerrada(e.gastos, e.hoy, (g) => g.categoria === categoria);
    // Se alinea con la serie global para que los meses sin gasto cuenten como cero.
    const alineada = serie.map((m) => s.find((x) => x.mes === m.mes)?.total ?? 0);
    const p = pronosticar(alineada, 1);
    return {
      categoria,
      promedioUltimos3Meses: redondear(media(alineada.slice(-3))),
      pronosticoMesEnCurso: p.puntos[0]?.valor ?? 0,
      modelo: p.modelo,
    };
  });

  // ---- Aporte esperado por integrante (consumo de los ultimos 6 meses cerrados) ----
  const ventanaDesde = `${sumarMeses(mesActual, -6)}-01`;
  const recientes = new Set(e.gastos.filter((g) => g.fecha >= ventanaDesde && mesDe(g.fecha) < mesActual).map((g) => g.id));
  const consumo = new Map<number, number>();
  for (const d of e.divisiones) if (recientes.has(d.gastoId)) consumo.set(d.usuarioId, (consumo.get(d.usuarioId) ?? 0) + d.monto);
  const totalConsumo = suma([...consumo.values()]);
  const nombres = new Map(e.miembros.map((m) => [m.usuarioId, m.nombre]));
  const porMiembro = [...consumo.entries()]
    .map(([usuarioId, c]) => ({
      usuarioId,
      nombre: nombres.get(usuarioId) ?? 'Usuario',
      participacionPct: redondear((c / totalConsumo) * 100, 1),
      montoEsperadoMesEnCurso: redondear((c / totalConsumo) * esperado),
    }))
    .sort((a, b) => b.participacionPct - a.participacionPct);

  // ---- Comportamiento de pago historico y cobro esperado ----
  const gastoPorId = new Map(e.gastos.map((g) => [g.id, g]));
  const deudas = e.divisiones.filter((d) => gastoPorId.has(d.gastoId) && d.usuarioId !== gastoPorId.get(d.gastoId)!.pagadorId);
  const muestras = deudas
    .filter((d) => d.estadoPago === 'pagado' && d.fechaPago)
    .map((d) => Math.max(0, diasEntre(gastoPorId.get(d.gastoId)!.fecha, d.fechaPago as string)))
    .sort((a, b) => a - b);
  const pendientes = deudas.filter((d) => d.estadoPago === 'pendiente');
  const deudaPendiente = redondear(suma(pendientes.map((d) => d.monto)));
  const ecdf = (dias: number) => muestras.filter((x) => x <= dias).length / muestras.length;
  const cuantil = (p: number) => muestras[Math.min(muestras.length - 1, Math.floor(p * muestras.length))];

  let pagos: PrediccionesResultado['pagos'];
  if (muestras.length < MIN_PAGOS_PARA_PREDECIR) {
    pagos = {
      disponible: false,
      motivo: `Se necesitan al menos ${MIN_PAGOS_PARA_PREDECIR} pagos registrados para estimar (hay ${muestras.length}).`,
      pagosObservados: muestras.length, diasMediana: null, dias90: null, probabilidadPago7d: null, probabilidadPago30d: null,
      deudaPendiente, cobroEsperado30d: null, porDeudor: [],
    };
  } else {
    // P(se paga dentro de 30 dias mas | ya lleva `edad` dias sin pagarse), con el historial real.
    const probCondicional = (edad: number): number => {
      const sobrevivientes = muestras.filter((x) => x > edad);
      if (!sobrevivientes.length) return ecdf(30); // sin referencias: probabilidad general
      return sobrevivientes.filter((x) => x <= edad + 30).length / sobrevivientes.length;
    };
    const acumuladoDeudor = new Map<number, { pendiente: number; esperado: number }>();
    for (const d of pendientes) {
      const edad = Math.max(0, diasEntre(gastoPorId.get(d.gastoId)!.fecha, e.hoy));
      const a = acumuladoDeudor.get(d.usuarioId) ?? { pendiente: 0, esperado: 0 };
      a.pendiente += d.monto;
      a.esperado += d.monto * probCondicional(edad);
      acumuladoDeudor.set(d.usuarioId, a);
    }
    const porDeudor = [...acumuladoDeudor.entries()]
      .map(([usuarioId, a]) => ({ usuarioId, nombre: nombres.get(usuarioId) ?? 'Usuario', pendiente: redondear(a.pendiente), cobroEsperado30d: redondear(a.esperado) }))
      .sort((a, b) => b.pendiente - a.pendiente);
    pagos = {
      disponible: true,
      pagosObservados: muestras.length,
      diasMediana: cuantil(0.5), dias90: cuantil(0.9),
      probabilidadPago7d: redondear(ecdf(7), 3), probabilidadPago30d: redondear(ecdf(30), 3),
      deudaPendiente, cobroEsperado30d: redondear(suma(porDeudor.map((d) => d.cobroEsperado30d))), porDeudor,
    };
  }

  // ---- Alertas ----
  const alertas: PrediccionesResultado['alertas'] = [];
  if (total.confianza === 'baja') {
    alertas.push({ tipo: 'info', mensaje: `Historial corto (${valores.length} ${valores.length === 1 ? 'mes' : 'meses'}): las predicciones son orientativas y mejoran al registrar más meses.` });
  }
  const rango = { inferior: pronostico[0]?.inferior ?? 0, superior: pronostico[0]?.superior ?? 0 };
  if (valores.length >= 3 && acumulado > rango.superior) {
    alertas.push({ tipo: 'aviso', mensaje: 'El gasto acumulado de este mes ya superó el rango esperado.' });
  }
  const base3 = media(valores.slice(-3));
  if (valores.length >= 3 && base3 > 0 && esperado > base3 * 1.2) {
    alertas.push({ tipo: 'aviso', mensaje: `Se espera un gasto ${redondear((esperado / base3 - 1) * 100)} % mayor que el promedio de los últimos 3 meses.` });
  }
  if (pagos.disponible && deudaPendiente > 0 && pagos.cobroEsperado30d !== null && pagos.cobroEsperado30d < deudaPendiente * 0.5) {
    alertas.push({ tipo: 'aviso', mensaje: 'Menos de la mitad de la deuda pendiente se cobraría en 30 días según el historial de pagos.' });
  }

  return {
    generadoEn: e.hoy,
    horizonte: e.horizonte,
    historico: serie,
    gastoTotal: {
      modelo: total.modelo,
      etiquetaModelo: total.etiquetaModelo,
      parametros: total.parametros,
      confianza: total.confianza,
      errorMedioAbsoluto: total.mae,
      errorPorcentual: total.mape,
      mesesDeHistorial: total.observaciones,
      pronostico,
      evaluacionModelos: total.evaluacion.map(({ modelo, etiqueta, mae, mape }) => ({ modelo, etiqueta, mae, mape })),
    },
    mesEnCurso: {
      mes: mesActual,
      acumulado,
      esperado,
      avancePct: esperado > 0 ? redondear((acumulado / esperado) * 100, 1) : null,
      rangoEsperado: rango,
    },
    porCategoria,
    porMiembro,
    pagos,
    alertas,
  };
}
