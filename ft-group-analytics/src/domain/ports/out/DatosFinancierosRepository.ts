import { DivisionDato, GastoDato, MiembroDato } from '../../services/Datos';

/**
 * Puerto de salida: lo unico que el nucleo necesita saber de la
 * persistencia. El microservicio SOLO LEE; nunca modifica datos.
 */
export interface DatosFinancierosRepository {
  gruposDeUsuario(usuarioId: number): Promise<{ id: number; nombre: string }[]>;
  gastosDesde(grupoIds: number[], desde: string): Promise<GastoDato[]>;
  divisionesDeGastos(gastoIds: number[]): Promise<DivisionDato[]>;
  miembrosDeGrupos(grupoIds: number[]): Promise<MiembroDato[]>;
}

/** Puerto de salida: fecha actual (inyectable para pruebas deterministas). */
export interface Reloj {
  hoy(): string; // AAAA-MM-DD
}
