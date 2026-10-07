import { pool } from '../adapters/out/persistence/postgres/db';
import { PostgresUsuarioRepository } from '../adapters/out/persistence/postgres/PostgresUsuarioRepository';
import { PostgresRefreshTokenRepository } from '../adapters/out/persistence/postgres/PostgresRefreshTokenRepository';
import { BcryptPasswordHasher } from '../adapters/out/security/BcryptPasswordHasher';
import { JwtTokenService } from '../adapters/out/security/JwtTokenService';
import { RegistrarUsuarioUseCaseImpl } from '../../application/usecases/RegistrarUsuarioUseCaseImpl';
import { IniciarSesionUseCaseImpl } from '../../application/usecases/IniciarSesionUseCaseImpl';
import { RefrescarTokenUseCaseImpl } from '../../application/usecases/RefrescarTokenUseCaseImpl';
import { CerrarSesionUseCaseImpl } from '../../application/usecases/CerrarSesionUseCaseImpl';
import { ObtenerPerfilUseCaseImpl } from '../../application/usecases/ObtenerPerfilUseCaseImpl';
import { env } from './env';
import {
  PostgresBalanceRepository, PostgresGastoRepository, PostgresGrupoRepository, PostgresHistorialRepository,
  PostgresNotificacionRepository,
} from '../adapters/out/persistence/postgres/PostgresFinanzasRepositories';
import { RecalcularBalances } from '../../application/usecases/finanzas/soporte';
import {
  AgregarMiembroUseCaseImpl, ArchivarGrupoUseCaseImpl, CrearGrupoUseCaseImpl, ListarGruposUseCaseImpl,
} from '../../application/usecases/finanzas/GruposUseCases';
import {
  EliminarGastoUseCaseImpl, LiquidarDeudaUseCaseImpl, ListarGastosUseCaseImpl, RegistrarGastoUseCaseImpl,
  RegistrarPagoUseCaseImpl,
} from '../../application/usecases/finanzas/GastosUseCases';
import { ListarHistorialUseCaseImpl, ObtenerResumenUseCaseImpl } from '../../application/usecases/finanzas/PanelUseCases';
import { ActualizarPerfilUseCaseImpl } from '../../application/usecases/ActualizarPerfilUseCaseImpl';
import { DesactivarCuentaUseCaseImpl } from '../../application/usecases/DesactivarCuentaUseCaseImpl';
import { ActivarCuentaUseCaseImpl } from '../../application/usecases/ActivarCuentaUseCaseImpl';

/**
 * "Composition root" / contenedor de dependencias manual.
 *
 * Aqui, y SOLO aqui, se conectan los puertos con sus adaptadores
 * concretos (Postgres, Bcrypt, JWT). Si mañana se quisiera cambiar
 * Postgres por MongoDB, o Bcrypt por Argon2, este es el unico archivo
 * que tendria que cambiar la forma en que se "conectan los cables";
 * el dominio y la capa de aplicacion no se tocan.
 */

// --- Adaptadores de salida (infraestructura) ---
const usuarioRepository = new PostgresUsuarioRepository(pool);
const refreshTokenRepository = new PostgresRefreshTokenRepository(pool);
const passwordHasher = new BcryptPasswordHasher();
const tokenService = new JwtTokenService(env.jwtSecret, env.jwtExpiracion);

// --- Casos de uso (capa de aplicacion) ---
export const registrarUsuarioUseCase = new RegistrarUsuarioUseCaseImpl(usuarioRepository, passwordHasher);

export const iniciarSesionUseCase = new IniciarSesionUseCaseImpl(
  usuarioRepository,
  refreshTokenRepository,
  passwordHasher,
  tokenService
);

export const refrescarTokenUseCase = new RefrescarTokenUseCaseImpl(
  usuarioRepository,
  refreshTokenRepository,
  tokenService
);

export const cerrarSesionUseCase = new CerrarSesionUseCaseImpl(refreshTokenRepository);

export const obtenerPerfilUseCase = new ObtenerPerfilUseCaseImpl(usuarioRepository);
export const actualizarPerfilUseCase = new ActualizarPerfilUseCaseImpl(usuarioRepository);
export const desactivarCuentaUseCase = new DesactivarCuentaUseCaseImpl(usuarioRepository, refreshTokenRepository);
export const activarCuentaUseCase = new ActivarCuentaUseCaseImpl(usuarioRepository);

// --- Modulos financieros: grupos, gastos, motor de calculo, historial, panel ---
const grupoRepository = new PostgresGrupoRepository(pool);
const gastoRepository = new PostgresGastoRepository(pool);
const balanceRepository = new PostgresBalanceRepository(pool);
const historialRepository = new PostgresHistorialRepository(pool);
const notificacionRepository = new PostgresNotificacionRepository(pool);
const recalcularBalances = new RecalcularBalances(gastoRepository, balanceRepository);

export const crearGrupoUseCase = new CrearGrupoUseCaseImpl(
  grupoRepository, usuarioRepository, gastoRepository, balanceRepository, historialRepository, notificacionRepository);
export const listarGruposUseCase = new ListarGruposUseCaseImpl(grupoRepository, gastoRepository, balanceRepository);
export const agregarMiembroUseCase = new AgregarMiembroUseCaseImpl(
  grupoRepository, usuarioRepository, gastoRepository, balanceRepository, historialRepository, notificacionRepository);
export const archivarGrupoUseCase = new ArchivarGrupoUseCaseImpl(grupoRepository);

export const registrarGastoUseCase = new RegistrarGastoUseCaseImpl(
  grupoRepository, gastoRepository, recalcularBalances, historialRepository, notificacionRepository);
export const listarGastosUseCase = new ListarGastosUseCaseImpl(grupoRepository, gastoRepository);
export const eliminarGastoUseCase = new EliminarGastoUseCaseImpl(grupoRepository, gastoRepository, recalcularBalances, historialRepository);
export const registrarPagoUseCase = new RegistrarPagoUseCaseImpl(
  grupoRepository, gastoRepository, recalcularBalances, historialRepository, notificacionRepository);
export const liquidarDeudaUseCase = new LiquidarDeudaUseCaseImpl(
  grupoRepository, gastoRepository, recalcularBalances, historialRepository, notificacionRepository);

export const obtenerResumenUseCase = new ObtenerResumenUseCaseImpl(grupoRepository, gastoRepository, balanceRepository);
export const listarHistorialUseCase = new ListarHistorialUseCaseImpl(grupoRepository, historialRepository);

// Exportado para que el middleware de autenticacion pueda verificar
// access tokens sin duplicar la logica de JWT.
export const tokenServiceInstancia = tokenService;
