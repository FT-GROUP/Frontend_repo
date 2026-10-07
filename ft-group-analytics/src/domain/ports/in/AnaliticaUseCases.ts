import { KpisResultado } from '../../services/Kpis';
import { PrediccionesResultado } from '../../services/Predicciones';

export interface ConsultaKpis { usuarioId: number; grupoId?: number; meses: number }
export interface ConsultaPredicciones { usuarioId: number; grupoId?: number; horizonte: number }

export interface ObtenerKpisUseCase {
  ejecutar(c: ConsultaKpis): Promise<KpisResultado & { alcance: Alcance }>;
}
export interface ObtenerPrediccionesUseCase {
  ejecutar(c: ConsultaPredicciones): Promise<PrediccionesResultado & { alcance: Alcance }>;
}

/** A que grupos corresponde el calculo. */
export interface Alcance {
  grupoId: number | null;
  grupos: { id: number; nombre: string }[];
}
