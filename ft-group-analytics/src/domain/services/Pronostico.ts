import { desviacionEstandar, media, redondear, regresionLineal } from './Estadistica';

/**
 * Predicciones simples sobre series historicas mensuales.
 *
 * Se evaluan tres modelos clasicos y se elige el de menor error
 * (MAE) mediante validacion "rolling-origin": para cada mes t se
 * predice con los meses anteriores y se compara con lo ocurrido.
 *   1. Promedio movil (k = 3)
 *   2. Suavizado exponencial simple (alfa optimizado)
 *   3. Tendencia lineal (regresion por minimos cuadrados)
 */

export type ModeloId = 'promedio_movil' | 'suavizado_exponencial' | 'tendencia_lineal';
export type Confianza = 'alta' | 'media' | 'baja';

export const ETIQUETAS: Record<ModeloId, string> = {
  promedio_movil: 'Promedio móvil (3 meses)',
  suavizado_exponencial: 'Suavizado exponencial',
  tendencia_lineal: 'Tendencia lineal',
};

type Modelo = (historia: number[], horizonte: number) => number[];

const noNegativo = (v: number): number => Math.max(0, v);

export const promedioMovil =
  (k = 3): Modelo =>
  (historia, horizonte) => {
    const serie = [...historia];
    const out: number[] = [];
    for (let i = 0; i < horizonte; i++) {
      const ventana = serie.slice(-Math.min(k, serie.length));
      const siguiente = media(ventana);
      out.push(siguiente);
      serie.push(siguiente);
    }
    return out.map(noNegativo);
  };

/** Nivel final del suavizado exponencial y su error cuadratico a un paso. */
function ajustarNivel(historia: number[], alfa: number): { nivel: number; sse: number } {
  let nivel = historia[0];
  let sse = 0;
  for (let t = 1; t < historia.length; t++) {
    sse += (historia[t] - nivel) ** 2;
    nivel = alfa * historia[t] + (1 - alfa) * nivel;
  }
  return { nivel, sse };
}

export function alfaOptimo(historia: number[]): number {
  let mejor = 0.5;
  let menor = Infinity;
  for (let a = 0.1; a <= 0.91; a += 0.1) {
    const { sse } = ajustarNivel(historia, a);
    if (sse < menor) {
      menor = sse;
      mejor = a;
    }
  }
  return redondear(mejor, 1);
}

export const suavizadoExponencial: Modelo = (historia, horizonte) => {
  if (historia.length === 0) return Array(horizonte).fill(0);
  const { nivel } = ajustarNivel(historia, alfaOptimo(historia));
  return Array(horizonte).fill(noNegativo(nivel));
};

export const tendenciaLineal: Modelo = (historia, horizonte) => {
  if (historia.length < 3) return Array(horizonte).fill(media(historia));
  const { pendiente, intercepto } = regresionLineal(historia);
  return Array.from({ length: horizonte }, (_, i) => noNegativo(intercepto + pendiente * (historia.length + i)));
};

const MODELOS: Record<ModeloId, Modelo> = {
  promedio_movil: promedioMovil(3),
  suavizado_exponencial: suavizadoExponencial,
  tendencia_lineal: tendenciaLineal,
};

export interface Evaluacion {
  modelo: ModeloId;
  etiqueta: string;
  mae: number;
  rmse: number;
  mape: number | null;
}

const MIN_ENTRENAMIENTO = 3;

/** Backtesting de un paso hacia adelante (rolling-origin). */
export function evaluarModelo(id: ModeloId, serie: number[]): Evaluacion | null {
  if (serie.length <= MIN_ENTRENAMIENTO) return null;
  const errores: number[] = [];
  const relativos: number[] = [];
  for (let t = MIN_ENTRENAMIENTO; t < serie.length; t++) {
    const pred = MODELOS[id](serie.slice(0, t), 1)[0];
    const e = serie[t] - pred;
    errores.push(e);
    if (serie[t] > 0) relativos.push(Math.abs(e) / serie[t]);
  }
  return {
    modelo: id,
    etiqueta: ETIQUETAS[id],
    mae: media(errores.map(Math.abs)),
    rmse: Math.sqrt(media(errores.map((e) => e * e))),
    mape: relativos.length ? media(relativos) * 100 : null,
  };
}

export interface PuntoPronostico {
  paso: number;
  valor: number;
  inferior: number;
  superior: number;
}

export interface ResultadoPronostico {
  modelo: ModeloId;
  etiquetaModelo: string;
  parametros: Record<string, number>;
  puntos: PuntoPronostico[];
  mae: number | null;
  mape: number | null;
  observaciones: number;
  confianza: Confianza;
  evaluacion: Evaluacion[];
}

const Z80 = 1.2816; // intervalo de prediccion del 80 %

/**
 * Pronostica `horizonte` periodos. Elige automaticamente el mejor
 * modelo por backtesting; con muy pocos datos usa promedio movil y
 * marca la confianza como "baja".
 */
export function pronosticar(serie: number[], horizonte: number): ResultadoPronostico {
  const evaluacion = (Object.keys(MODELOS) as ModeloId[])
    .map((id) => evaluarModelo(id, serie))
    .filter((e): e is Evaluacion => e !== null);

  // Empate de error -> se prefiere el modelo mas simple (orden de MODELOS).
  const mejor = evaluacion.length ? evaluacion.reduce((a, b) => (b.mae < a.mae - 1e-9 ? b : a)) : null;
  const modelo: ModeloId = mejor?.modelo ?? 'promedio_movil';
  const valores = MODELOS[modelo](serie, horizonte);

  const sigma = mejor ? mejor.rmse : desviacionEstandar(serie);
  const puntos = valores.map((v, i) => {
    const margen = Z80 * sigma * Math.sqrt(i + 1);
    return { paso: i + 1, valor: redondear(v), inferior: redondear(noNegativo(v - margen)), superior: redondear(v + margen) };
  });

  const mape = mejor?.mape ?? null;
  let confianza: Confianza = 'baja';
  if (serie.length >= 9 && mape !== null && mape <= 25) confianza = 'alta';
  else if (serie.length >= 5 && mape !== null && mape <= 45) confianza = 'media';

  const parametros: Record<string, number> = {};
  if (modelo === 'suavizado_exponencial') parametros.alfa = alfaOptimo(serie);
  if (modelo === 'promedio_movil') parametros.ventana = Math.min(3, Math.max(serie.length, 1));
  if (modelo === 'tendencia_lineal') {
    const { pendiente, r2 } = regresionLineal(serie);
    parametros.pendienteMensual = redondear(pendiente);
    parametros.r2 = redondear(r2, 3);
  }

  return {
    modelo,
    etiquetaModelo: ETIQUETAS[modelo],
    parametros,
    puntos,
    mae: mejor ? redondear(mejor.mae) : null,
    mape: mape === null ? null : redondear(mape, 1),
    observaciones: serie.length,
    confianza,
    evaluacion: evaluacion.map((e) => ({ ...e, mae: redondear(e.mae), rmse: redondear(e.rmse), mape: e.mape === null ? null : redondear(e.mape, 1) })),
  };
}
