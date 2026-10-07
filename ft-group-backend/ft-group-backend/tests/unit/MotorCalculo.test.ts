import { MotorCalculo } from '../../src/domain/services/MotorCalculo';
import { ValidacionError } from '../../src/domain/errors/DomainErrors';

describe('MotorCalculo', () => {
  it('divide en partes iguales sin perder pesos', () => {
    const partes = MotorCalculo.dividirEquitativamente(100000, [1, 2, 3]);
    expect(partes.map((p) => p.montoAsignado)).toEqual([33334, 33333, 33333]);
    expect(partes.reduce((a, p) => a + p.montoAsignado, 0)).toBe(100000);
  });

  it('rechaza divisiones cuya suma no coincide con el total', () => {
    expect(() => MotorCalculo.validarDivision(1000, [{ usuarioId: 1, montoAsignado: 300 }])).toThrow(ValidacionError);
  });

  it('rechaza participantes repetidos y montos negativos', () => {
    expect(() => MotorCalculo.validarDivision(100, [
      { usuarioId: 1, montoAsignado: 50 }, { usuarioId: 1, montoAsignado: 50 },
    ])).toThrow('mas de una vez');
    expect(() => MotorCalculo.validarDivision(100, [
      { usuarioId: 1, montoAsignado: 150 }, { usuarioId: 2, montoAsignado: -50 },
    ])).toThrow('negativo');
  });

  it('compensa deudas cruzadas entre el mismo par de usuarios', () => {
    const saldos = MotorCalculo.balancePorPares([
      { deudorId: 1, acreedorId: 2, monto: 100 },
      { deudorId: 2, acreedorId: 1, monto: 30 },
      { deudorId: 3, acreedorId: 1, monto: 50 },
    ]);
    expect(saldos).toEqual([
      { deudorId: 1, acreedorId: 2, monto: 70 },
      { deudorId: 3, acreedorId: 1, monto: 50 },
    ]);
  });

  it('omite pares que quedan en cero', () => {
    expect(MotorCalculo.balancePorPares([
      { deudorId: 1, acreedorId: 2, monto: 40 },
      { deudorId: 2, acreedorId: 1, monto: 40 },
    ])).toEqual([]);
  });
});
