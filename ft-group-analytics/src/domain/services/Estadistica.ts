/**
 * Estimadores estadisticos basicos (dominio puro, sin dependencias).
 * Todas las funciones son deterministas y se prueban sin base de datos.
 */

export const suma = (v: number[]): number => v.reduce((a, b) => a + b, 0);

export const media = (v: number[]): number => (v.length ? suma(v) / v.length : 0);

export function mediana(v: number[]): number {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Desviacion estandar muestral (n - 1). */
export function desviacionEstandar(v: number[]): number {
  if (v.length < 2) return 0;
  const m = media(v);
  return Math.sqrt(suma(v.map((x) => (x - m) ** 2)) / (v.length - 1));
}

/** Percentil por interpolacion lineal (p entre 0 y 100). */
export function percentil(v: number[], p: number): number {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const idx = (Math.min(Math.max(p, 0), 100) / 100) * (s.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

// Valores criticos t de Student (dos colas, 95 %) para 1..30 grados de libertad.
const T95 = [
  12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131,
  2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042,
];

/** Intervalo de confianza del 95 % para la media (t de Student). */
export function intervaloConfianzaMedia(v: number[]): { inferior: number; superior: number } | null {
  if (v.length < 2) return null;
  const gl = v.length - 1;
  const t = gl <= 30 ? T95[gl - 1] : 1.96;
  const margen = (t * desviacionEstandar(v)) / Math.sqrt(v.length);
  const m = media(v);
  return { inferior: m - margen, superior: m + margen };
}

/** Regresion lineal simple por minimos cuadrados con x = 0..n-1. */
export function regresionLineal(y: number[]): { pendiente: number; intercepto: number; r2: number } {
  const n = y.length;
  if (n < 2) return { pendiente: 0, intercepto: y[0] ?? 0, r2: 0 };
  const mx = (n - 1) / 2;
  const my = media(y);
  let sxy = 0;
  let sxx = 0;
  let sst = 0;
  for (let i = 0; i < n; i++) {
    sxy += (i - mx) * (y[i] - my);
    sxx += (i - mx) ** 2;
    sst += (y[i] - my) ** 2;
  }
  const pendiente = sxx === 0 ? 0 : sxy / sxx;
  const intercepto = my - pendiente * mx;
  const sse = suma(y.map((yi, i) => (yi - (intercepto + pendiente * i)) ** 2));
  return { pendiente, intercepto, r2: sst === 0 ? 0 : Math.max(0, 1 - sse / sst) };
}

export const redondear = (n: number, decimales = 0): number => {
  const f = 10 ** decimales;
  return Math.round((n + Number.EPSILON) * f) / f;
};
