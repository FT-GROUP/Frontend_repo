import { Deuda, Participacion, SaldoPar } from '../../services/MotorCalculo';

/**
 * Puertos de salida de los modulos financieros. El nucleo define QUE
 * necesita guardar/consultar; el adaptador de Postgres decide COMO.
 */

export type RolMiembro = 'administrador' | 'miembro';

export interface GrupoRegistro {
  id: number;
  nombre: string;
  descripcion: string | null;
  icono: string;
  ciudad: string | null;
  latitud: number | null;
  longitud: number | null;
  creadoPor: number;
  fechaCreacion: Date;
  estado: 'activo' | 'archivado';
}

export interface NuevoGrupo {
  nombre: string;
  descripcion: string | null;
  icono: string;
  ciudad: string | null;
  latitud: number | null;
  longitud: number | null;
}

export interface MiembroRegistro {
  grupoId: number;
  usuarioId: number;
  nombre: string;
  email: string;
  rol: RolMiembro;
  estado: 'activo' | 'expulsado' | 'salido';
}

export interface GrupoRepository {
  /** Crea el grupo, al creador como administrador y a los demas como miembros (una transaccion). */
  crear(datos: NuevoGrupo, creadorId: number, miembrosIds: number[]): Promise<number>;
  buscarPorId(id: number): Promise<GrupoRegistro | null>;
  listarActivosDeUsuario(usuarioId: number): Promise<GrupoRegistro[]>;
  /** Todos los miembros (cualquier estado) de los grupos indicados. */
  listarMiembros(grupoIds: number[]): Promise<MiembroRegistro[]>;
  /** Rol del usuario si es miembro ACTIVO del grupo; null en otro caso. */
  obtenerRol(grupoId: number, usuarioId: number): Promise<RolMiembro | null>;
  agregarMiembro(grupoId: number, usuarioId: number): Promise<void>;
  archivar(id: number): Promise<void>;
}

export interface GastoRegistro {
  id: number;
  grupoId: number;
  pagadorId: number;
  descripcion: string;
  montoTotal: number;
  fechaGasto: string;
  categoria: string;
  tipoDivision: 'equitativa' | 'personalizada';
  origenRegistro: 'manual' | 'ocr';
  fechaRegistro: Date;
}

export type NuevoGasto = Omit<GastoRegistro, 'id' | 'fechaRegistro'>;

export interface DivisionRegistro {
  gastoId: number;
  usuarioId: number;
  montoAsignado: number;
  estadoPago: 'pendiente' | 'pagado';
  fechaPago: Date | null;
}

export interface NuevoRecibo {
  imagenUrl: string;
  montoExtraido: number | null;
  fechaExtraida: string | null;
  comercioExtraido: string | null;
  categoriaSugerida: string | null;
  confianzaOcr: number | null;
}

export interface GastoRepository {
  /** Inserta GASTO + DIVISION_GASTO (+ RECIBO_ESCANEADO) en una sola transaccion ACID. */
  registrar(gasto: NuevoGasto, participaciones: Participacion[], recibo?: NuevoRecibo): Promise<number>;
  buscarPorId(id: number): Promise<GastoRegistro | null>;
  listarPorGrupos(grupoIds: number[]): Promise<GastoRegistro[]>;
  listarDivisiones(gastoIds: number[]): Promise<DivisionRegistro[]>;
  eliminar(id: number): Promise<void>;
  marcarDivisionPagada(gastoId: number, usuarioId: number): Promise<boolean>;
  /** Marca pagadas las partes pendientes de `deudorId` en gastos pagados por `acreedorId` dentro del grupo. */
  marcarPagadasEntre(grupoId: number, deudorId: number, acreedorId: number): Promise<number>;
  deudasPendientes(grupoId: number): Promise<Deuda[]>;
}

export interface BalanceRepository {
  reemplazar(grupoId: number, saldos: SaldoPar[]): Promise<void>;
  listarPorGrupos(grupoIds: number[]): Promise<(SaldoPar & { grupoId: number })[]>;
}

export type TipoMovimiento =
  | 'grupo_creado' | 'gasto_creado' | 'gasto_editado' | 'gasto_eliminado'
  | 'pago_registrado' | 'miembro_agregado' | 'miembro_expulsado';

export interface MovimientoRegistro {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  grupoId: number;
  grupoNombre: string;
  gastoId: number | null;
  tipoMovimiento: TipoMovimiento;
  descripcion: string | null;
  fecha: Date;
}

export interface HistorialRepository {
  registrar(mov: { usuarioId: number; grupoId: number; gastoId?: number | null; tipo: TipoMovimiento; descripcion: string }): Promise<void>;
  listarPorGrupos(grupoIds: number[], limite: number): Promise<MovimientoRegistro[]>;
}

export type TipoNotificacion = 'nuevo_gasto' | 'pago_recibido' | 'recordatorio' | 'invitacion_grupo';

export interface NotificacionRepository {
  crear(usuarioIds: number[], tipo: TipoNotificacion, mensaje: string): Promise<void>;
}
