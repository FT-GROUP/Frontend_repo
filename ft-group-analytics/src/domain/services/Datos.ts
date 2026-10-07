/** Registros de entrada que el dominio de analitica necesita (independientes de la BD). */
export interface GastoDato {
  id: number;
  grupoId: number;
  pagadorId: number;
  descripcion: string;
  monto: number;
  fecha: string; // AAAA-MM-DD
  categoria: string;
  origen: 'manual' | 'ocr';
}

export interface DivisionDato {
  gastoId: number;
  usuarioId: number;
  monto: number;
  estadoPago: 'pendiente' | 'pagado';
  fechaPago: string | null; // AAAA-MM-DD
}

export interface MiembroDato {
  usuarioId: number;
  nombre: string;
  grupoId: number;
}
