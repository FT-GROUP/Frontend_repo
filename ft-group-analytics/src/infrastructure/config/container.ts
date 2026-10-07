import { ObtenerKpisUseCaseImpl, ObtenerPrediccionesUseCaseImpl } from '../../application/usecases/AnaliticaUseCases';
import { Reloj } from '../../domain/ports/out/DatosFinancierosRepository';
import { hoyEnZona } from '../../domain/services/Fechas';
import { pool } from '../adapters/out/postgres/db';
import { PostgresDatosFinancierosRepository } from '../adapters/out/postgres/PostgresDatosFinancierosRepository';
import { env } from './env';

/** Composition root: conecta puertos con adaptadores. */
const reloj: Reloj = { hoy: () => hoyEnZona(env.zonaHoraria) };
const repositorio = new PostgresDatosFinancierosRepository(pool);

export const obtenerKpisUseCase = new ObtenerKpisUseCaseImpl(repositorio, reloj);
export const obtenerPrediccionesUseCase = new ObtenerPrediccionesUseCaseImpl(repositorio, reloj);
