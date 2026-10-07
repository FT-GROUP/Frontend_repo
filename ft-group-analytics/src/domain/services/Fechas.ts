/** Utilidades de fechas en formato texto (AAAA-MM-DD / AAAA-MM), sin husos horarios. */

export const mesDe = (fecha: string): string => fecha.slice(0, 7);

export function sumarMeses(mes: string, n: number): string {
  const [y, m] = mes.split('-').map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

/** Lista de meses consecutivos desde `desde` hasta `hasta` (ambos incluidos). */
export function rangoMeses(desde: string, hasta: string): string[] {
  const out: string[] = [];
  for (let m = desde; m <= hasta; m = sumarMeses(m, 1)) out.push(m);
  return out;
}

const utc = (s: string): number => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));

/** Dias transcurridos entre dos fechas AAAA-MM-DD. */
export const diasEntre = (a: string, b: string): number => Math.round((utc(b) - utc(a)) / 86_400_000);

/** Fecha de hoy (AAAA-MM-DD) en la zona horaria indicada. */
export function hoyEnZona(zona: string, ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
}
