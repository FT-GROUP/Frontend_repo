import { SaldoPar } from '../../services/MotorCalculo';
import {
  DivisionRegistro, GastoRegistro, GrupoRegistro, MiembroRegistro, MovimientoRegistro, NuevoRecibo, RolMiembro,
} from '../out/FinanzasRepositories';

/**
 * Puertos de entrada de los modulos: Gestion de grupos, Registro de
 * gastos, Motor de calculo, Historial financiero y Panel de usuario.
 */

/* ---------------------------- Grupos ---------------------------- */
export interface CrearGrupoComando {
  usuarioId: number;
  nombre: string;
  descripcion?: string | null;
  icono?: string;
  ciudad?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  /** Correos de usuarios YA registrados que se agregan como miembros. */
  emailsIntegrantes: string[];
}

export interface GrupoDetalle {
  grupo: GrupoRegistro;
  miembros: MiembroRegistro[]; // solo activos
  rol: RolMiembro;
  totalGastos: number;
  numGastos: number;
  miBalance: number; // positivo: le deben; negativo: debe
  saldos: SaldoPar[];
}

export interface CrearGrupoUseCase { ejecutar(c: CrearGrupoComando): Promise<GrupoDetalle>; }
export interface ListarGruposUseCase { ejecutar(usuarioId: number): Promise<GrupoDetalle[]>; }
export interface AgregarMiembroUseCase { ejecutar(c: { usuarioId: number; grupoId: number; email: string }): Promise<GrupoDetalle>; }
export interface ArchivarGrupoUseCase { ejecutar(c: { usuarioId: number; grupoId: number }): Promise<void>; }

/* ---------------------------- Gastos ---------------------------- */
export interface RegistrarGastoComando {
  usuarioId: number;
  grupoId: number;
  pagadorId: number;
  descripcion: string;
  montoTotal: number;
  fechaGasto: string;
  categoria: string;
  tipoDivision: 'equitativa' | 'personalizada';
  /** Para 'equitativa' basta con los usuario_id; el servidor calcula los montos. */
  divisiones: { usuarioId: number; montoAsignado?: number }[];
  origenRegistro: 'manual' | 'ocr';
  recibo?: NuevoRecibo;
}

export interface UsuarioRef { id: number; nombre: string }

export interface GastoDetalle {
  gasto: GastoRegistro;
  grupo: { id: number; nombre: string };
  pagador: UsuarioRef;
  divisiones: (DivisionRegistro & { nombre: string })[];
  miParte: number;
  miEstado: 'pagador' | 'pendiente' | 'pagado' | 'no_participa';
  meDeben: number;
}

export interface RegistrarGastoUseCase { ejecutar(c: RegistrarGastoComando): Promise<number>; }
export interface ListarGastosUseCase { ejecutar(usuarioId: number): Promise<GastoDetalle[]>; }
export interface EliminarGastoUseCase { ejecutar(c: { usuarioId: number; gastoId: number }): Promise<void>; }
export interface RegistrarPagoUseCase { ejecutar(c: { usuarioId: number; gastoId: number; deudorId: number }): Promise<void>; }
export interface LiquidarDeudaUseCase { ejecutar(c: { usuarioId: number; grupoId: number; deudorId: number; acreedorId: number }): Promise<void>; }

/* ------------------------ Panel / historial ---------------------- */
export interface LiquidacionDetalle extends SaldoPar {
  grupoId: number;
  grupoNombre: string;
  deudor: UsuarioRef;
  acreedor: UsuarioRef;
}

export interface ResumenPanel {
  grupos: GrupoDetalle[];
  teDeben: number;
  debes: number;
  balance: number;
  liquidaciones: LiquidacionDetalle[];
}

export interface ObtenerResumenUseCase { ejecutar(usuarioId: number): Promise<ResumenPanel>; }
export interface ListarHistorialUseCase { ejecutar(usuarioId: number, limite?: number): Promise<MovimientoRegistro[]>; }
