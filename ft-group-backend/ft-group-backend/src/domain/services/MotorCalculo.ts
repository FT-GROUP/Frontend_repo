import { ValidacionError } from '../errors/DomainErrors';

/**
 * Motor de calculo (dominio puro).
 *
 * Contiene las reglas de negocio para dividir un gasto entre los
 * integrantes de un grupo y para consolidar las deudas pendientes en el
 * BALANCE neto entre pares de usuarios (seccion 3.7 del esquema de BD).
 * No depende de la base de datos ni de HTTP, por lo que se prueba con
 * pruebas unitarias simples.
 */

export interface Participacion {
  usuarioId: number;
  montoAsignado: number;
}

export interface Deuda {
  deudorId: number;
  acreedorId: number;
  monto: number;
}

export interface SaldoPar {
  deudorId: number;
  acreedorId: number;
  monto: number;
}

export class MotorCalculo {
  /** Reparte el monto en partes iguales sin perder pesos por redondeo. */
  static dividirEquitativamente(montoTotal: number, usuarioIds: number[]): Participacion[] {
    if (usuarioIds.length === 0) throw new ValidacionError('Debe haber al menos un participante.');
    const total = Math.round(montoTotal)
    const base = Math.floor(total / usuarioIds.length);
    let resto = total - base * usuarioIds.length;
    return usuarioIds.map((usuarioId) => {
      const extra = resto > 0 ? 1 : 0;
      resto -= extra;
      return { usuarioId, montoAsignado: base + extra };
    });
  }

  /**
   * Regla de integridad: SUM(monto_asignado) = monto_total, sin montos
   * negativos, sin participantes repetidos y con al menos una parte > 0.
   */
  static validarDivision(montoTotal: number, participaciones: Participacion[]): void {
    if (!(montoTotal > 0)) throw new ValidacionError('El monto total debe ser mayor que cero.');
    if (participaciones.length === 0) throw new ValidacionError('Debe haber al menos un participante.');

    const ids = new Set<number>();
    let suma = 0;
    for (const p of participaciones) {
      if (p.montoAsignado < 0) throw new ValidacionError('Ningun monto asignado puede ser negativo.');
      if (ids.has(p.usuarioId)) throw new ValidacionError('Un participante aparece mas de una vez.');
      ids.add(p.usuarioId);
      suma += p.montoAsignado;
    }
    if (!participaciones.some((p) => p.montoAsignado > 0)) {
      throw new ValidacionError('Al menos un participante debe tener un monto mayor que cero.');
    }
    if (Math.abs(suma - montoTotal) > 0.009) {
      throw new ValidacionError(`La suma de las partes (${suma}) debe ser igual al monto total (${montoTotal}).`);
    }
  }

  /**
   * Consolida las deudas pendientes en un saldo neto por cada par de
   * usuarios: si A le debe 100 a B y B le debe 30 a A, queda A -> B: 70.
   */
  static balancePorPares(deudas: Deuda[]): SaldoPar[] {
    const acumulado = new Map<string, number>();
    for (const { deudorId, acreedorId, monto } of deudas) {
      if (deudorId === acreedorId) continue;
      const [a, b] = deudorId < acreedorId ? [deudorId, acreedorId] : [acreedorId, deudorId];
      const clave = `${a}|${b}`;
      const signo = deudorId === a ? 1 : -1; // positivo: a le debe a b
      acumulado.set(clave, (acumulado.get(clave) ?? 0) + signo * monto);
    }

    const saldos: SaldoPar[] = [];
    for (const [clave, valor] of acumulado) {
      const [a, b] = clave.split('|').map(Number);
      const monto = Math.round(Math.abs(valor) * 100) / 100;
      if (monto < 0.01) continue;
      saldos.push(valor > 0 ? { deudorId: a, acreedorId: b, monto } : { deudorId: b, acreedorId: a, monto });
    }
    return saldos.sort((x, y) => y.monto - x.monto);
  }
}
