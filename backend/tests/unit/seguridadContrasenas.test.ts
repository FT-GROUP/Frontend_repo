import { CambiarContrasenaUseCaseImpl } from '../../src/application/usecases/CambiarContrasenaUseCaseImpl';
import { IniciarSesionUseCaseImpl } from '../../src/application/usecases/IniciarSesionUseCaseImpl';
import { Usuario } from '../../src/domain/entities/Usuario';
import { ContrasenaActualIncorrectaError, ContrasenaNoValidaError } from '../../src/domain/errors/DomainErrors';
import { PasswordHasher } from '../../src/domain/ports/out/PasswordHasher';
import { RefreshTokenRepository } from '../../src/domain/ports/out/RefreshTokenRepository';
import { TokenService } from '../../src/domain/ports/out/TokenService';
import { UsuarioRepository } from '../../src/domain/ports/out/UsuarioRepository';
import { cumplePoliticaContrasena, incumplimientosContrasena } from '../../src/domain/services/politicaContrasena';
import {
  actualizarPerfilSchema,
  cambiarContrasenaSchema,
  registrarUsuarioSchema,
} from '../../src/infrastructure/adapters/in/http/validators/authValidators';

function mocks() {
  const usuarioRepository: jest.Mocked<UsuarioRepository> = {
    guardar: jest.fn(),
    actualizarPasswordHash: jest.fn(),
    cambiarContrasena: jest.fn(),
    marcarCambioContrasena: jest.fn(),
    buscarPorEmail: jest.fn(),
    buscarPorId: jest.fn(),
    existeEmail: jest.fn(),
  };
  const refreshTokenRepository: jest.Mocked<RefreshTokenRepository> = {
    guardar: jest.fn(),
    buscarPorToken: jest.fn(),
    revocar: jest.fn(),
    revocarTodosDeUsuario: jest.fn(),
  };
  const passwordHasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn().mockResolvedValue('hash-nuevo'),
    comparar: jest.fn(),
    necesitaRehash: jest.fn().mockReturnValue(false),
  };
  const tokenService: jest.Mocked<TokenService> = {
    generarAccessToken: jest.fn().mockReturnValue('access'),
    verificarAccessToken: jest.fn(),
    generarRefreshTokenString: jest.fn().mockReturnValue('refresh'),
  };
  return { usuarioRepository, refreshTokenRepository, passwordHasher, tokenService };
}

const usuario = (debeCambiarContrasena = false) => Usuario.reconstruir({
  id: 7, nombre: 'Juan', email: 'juan@example.com', passwordHash: 'hash', debeCambiarContrasena,
});

describe('politica de contrasenas', () => {
  it.each([
    ['         ', false],
    ['', false],
    ['abcdefgh', false],
    ['12345678', false],
    ['abc 12345', false],
    ['abc123', false],
    ['clave2026', true],
    ['Ñandú2026', true],
  ])('"%s" cumple: %s', (password, esperado) => {
    expect(cumplePoliticaContrasena(password)).toBe(esperado);
  });

  it('explica cada incumplimiento', () => {
    expect(incumplimientosContrasena('         ')).toEqual(expect.arrayContaining([
      expect.stringContaining('espacios'),
      expect.stringContaining('letra'),
      expect.stringContaining('numero'),
    ]));
  });

  it('el registro rechaza contrasenas debiles', () => {
    const base = { nombre: 'Juan Pérez', email: 'j@example.com', telefono: '+57 300 123 4567' };
    expect(registrarUsuarioSchema.safeParse({ ...base, password: '         ' }).success).toBe(false);
    expect(registrarUsuarioSchema.safeParse({ ...base, password: 'solo-letras' }).success).toBe(false);
    expect(registrarUsuarioSchema.safeParse({ ...base, password: 'Segura2026' }).success).toBe(true);
  });

  it('el cambio de contrasena exige la politica en la nueva', () => {
    expect(cambiarContrasenaSchema.safeParse({ passwordActual: '         ', passwordNueva: '         ' }).success).toBe(false);
    expect(cambiarContrasenaSchema.safeParse({ passwordActual: '         ', passwordNueva: 'Segura2026' }).success).toBe(true);
  });
});

describe('nombre y telefono', () => {
  const base = { email: 'j@example.com', password: 'Segura2026' };
  it.each([
    ["María José O'Neil-Pérez", true],
    ['Jr. Gómez', true],
    ['<img src=x onerror=alert(1)>', false],
    ["' OR '1'='1", false],
    ['admin\'--', false],
    ['<script>', false],
  ])('nombre "%s" valido: %s', (nombre, esperado) => {
    expect(registrarUsuarioSchema.safeParse({ ...base, nombre }).success).toBe(esperado);
  });

  it.each([
    ['+57 300 123 4567', true],
    ['(604) 444-5566', true],
    ['<script>', false],
    ["'; DROP TABLE", false],
    ['123', false],
  ])('telefono "%s" valido: %s', (telefono, esperado) => {
    expect(registrarUsuarioSchema.safeParse({ ...base, nombre: 'Juan', telefono }).success).toBe(esperado);
  });

  it('el perfil permite borrar el telefono con cadena vacia', () => {
    const r = actualizarPerfilSchema.safeParse({ telefono: '' });
    expect(r.success && r.data.telefono).toBeNull();
  });
});

describe('IniciarSesion marca las cuentas con contrasena debil', () => {
  it('marca la cuenta y lo informa en la respuesta', async () => {
    const m = mocks();
    m.usuarioRepository.buscarPorEmail.mockResolvedValue(usuario(false));
    m.passwordHasher.comparar.mockResolvedValue(true);
    const caso = new IniciarSesionUseCaseImpl(m.usuarioRepository, m.refreshTokenRepository, m.passwordHasher, m.tokenService);
    const r = await caso.ejecutar({ email: 'juan@example.com', password: '         ' });
    expect(r.debeCambiarContrasena).toBe(true);
    expect(m.usuarioRepository.marcarCambioContrasena).toHaveBeenCalledWith(7, true);
  });

  it('no marca nada si la contrasena cumple', async () => {
    const m = mocks();
    m.usuarioRepository.buscarPorEmail.mockResolvedValue(usuario(false));
    m.passwordHasher.comparar.mockResolvedValue(true);
    const caso = new IniciarSesionUseCaseImpl(m.usuarioRepository, m.refreshTokenRepository, m.passwordHasher, m.tokenService);
    const r = await caso.ejecutar({ email: 'juan@example.com', password: 'Segura2026' });
    expect(r.debeCambiarContrasena).toBe(false);
    expect(m.usuarioRepository.marcarCambioContrasena).not.toHaveBeenCalled();
  });
});

describe('CambiarContrasena', () => {
  it('exige la contrasena actual', async () => {
    const m = mocks();
    m.usuarioRepository.buscarPorId.mockResolvedValue(usuario(true));
    m.passwordHasher.comparar.mockResolvedValue(false);
    const caso = new CambiarContrasenaUseCaseImpl(m.usuarioRepository, m.refreshTokenRepository, m.passwordHasher);
    await expect(caso.ejecutar({ usuarioId: 7, passwordActual: 'x', passwordNueva: 'Segura2026' }))
      .rejects.toBeInstanceOf(ContrasenaActualIncorrectaError);
    expect(m.usuarioRepository.cambiarContrasena).not.toHaveBeenCalled();
  });

  it('rechaza una nueva contrasena debil o igual a la actual', async () => {
    const m = mocks();
    m.usuarioRepository.buscarPorId.mockResolvedValue(usuario(true));
    m.passwordHasher.comparar.mockResolvedValue(true);
    const caso = new CambiarContrasenaUseCaseImpl(m.usuarioRepository, m.refreshTokenRepository, m.passwordHasher);
    await expect(caso.ejecutar({ usuarioId: 7, passwordActual: '         ', passwordNueva: 'debil' }))
      .rejects.toBeInstanceOf(ContrasenaNoValidaError);
    await expect(caso.ejecutar({ usuarioId: 7, passwordActual: 'Segura2026', passwordNueva: 'Segura2026' }))
      .rejects.toBeInstanceOf(ContrasenaNoValidaError);
  });

  it('guarda el nuevo hash y cierra las sesiones abiertas', async () => {
    const m = mocks();
    m.usuarioRepository.buscarPorId.mockResolvedValue(usuario(true));
    m.passwordHasher.comparar.mockResolvedValue(true);
    const caso = new CambiarContrasenaUseCaseImpl(m.usuarioRepository, m.refreshTokenRepository, m.passwordHasher);
    await caso.ejecutar({ usuarioId: 7, passwordActual: '         ', passwordNueva: 'Segura2026' });
    expect(m.usuarioRepository.cambiarContrasena).toHaveBeenCalledWith(7, 'hash-nuevo');
    expect(m.refreshTokenRepository.revocarTodosDeUsuario).toHaveBeenCalledWith(7);
  });
});
