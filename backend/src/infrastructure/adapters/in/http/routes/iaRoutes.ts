import express, { NextFunction, Response, Router } from 'express';
import '../../../../config/env'; // asegura que dotenv cargue el .env antes de leer las variables de IA
import { autenticar, RequestAutenticado } from '../middlewares/authMiddleware';
import { ClaudeFacturaExtractor, IaNoDisponibleError } from '../../../out/ia/ClaudeFacturaExtractor';
import { FacturaExtractor, TipoArchivoFactura } from '../../../../../domain/ports/out/FacturaExtractor';

/**
 * Adaptador de entrada: escaneo de facturas con IA.
 *
 * POST /api/ia/facturas
 *   Header Authorization: Bearer <access token>
 *   Content-Type: image/jpeg | image/png | image/webp | application/pdf
 *   Cuerpo: el archivo en binario (no JSON, para no chocar con el limite
 *   global de 100kb de express.json).
 *
 * Variables de entorno:
 *   ANTHROPIC_API_KEY  clave de la API de Claude (si falta, responde 503
 *                      y el frontend usa el OCR local como respaldo).
 *   IA_MODELO          modelo a usar (por defecto claude-haiku-5-5).
 *   IA_MAX_MB          tamaño maximo del archivo (por defecto 8).
 *   IA_LIMITE_POR_HORA solicitudes por usuario por hora (por defecto 30).
 */

const TIPOS_PERMITIDOS: TipoArchivoFactura[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const maxMb = Number(process.env.IA_MAX_MB ?? 8);
const limitePorHora = Number(process.env.IA_LIMITE_POR_HORA ?? 30);

let extractor: FacturaExtractor | null = process.env.ANTHROPIC_API_KEY
  ? new ClaudeFacturaExtractor({
    apiKey: process.env.ANTHROPIC_API_KEY,
    modelo: process.env.IA_MODELO || 'claude-haiku-5-5',
  })
  : null;

/** Permite inyectar un extractor falso en pruebas. */
export function configurarExtractorFacturas(nuevo: FacturaExtractor | null): void {
  extractor = nuevo;
}

// Limite simple en memoria por usuario (protege el costo de la API).
const usos = new Map<number, number[]>();
function limitarFrecuencia(req: RequestAutenticado, res: Response, next: NextFunction): void {
  const usuarioId = req.usuario?.id;
  if (usuarioId === undefined) {
    next();
    return;
  }
  const ahora = Date.now();
  const recientes = (usos.get(usuarioId) ?? []).filter((t) => ahora - t < 60 * 60 * 1000);
  if (recientes.length >= limitePorHora) {
    res.status(429).json({ error: 'DemasiadasSolicitudes', mensaje: 'Alcanzaste el límite de escaneos con IA. Intenta más tarde.' });
    return;
  }
  recientes.push(ahora);
  usos.set(usuarioId, recientes);
  next();
}

/** Verifica la firma del archivo para no confiar solo en el Content-Type. */
export function firmaCoincide(archivo: Buffer, tipo: TipoArchivoFactura): boolean {
  const inicio = (bytes: number[]) => bytes.every((b, i) => archivo[i] === b);
  switch (tipo) {
    case 'image/jpeg': return inicio([0xff, 0xd8, 0xff]);
    case 'image/png': return inicio([0x89, 0x50, 0x4e, 0x47]);
    case 'image/webp': return inicio([0x52, 0x49, 0x46, 0x46]) && archivo.subarray(8, 12).toString('ascii') === 'WEBP';
    case 'application/pdf': return archivo.subarray(0, 5).toString('ascii') === '%PDF-';
    default: return false;
  }
}

const router = Router();

router.get('/estado', autenticar, (_req, res) => {
  res.json({ disponible: extractor !== null });
});

router.post(
  '/facturas',
  autenticar,
  (req, res, next) => {
    if (!extractor) {
      res.status(503).json({ error: 'IaNoConfigurada', mensaje: 'El escaneo con IA no está configurado en el servidor.' });
      return;
    }
    next();
  },
  limitarFrecuencia,
  express.raw({ type: TIPOS_PERMITIDOS, limit: `${maxMb}mb` }),
  async (req: RequestAutenticado, res: Response, next: NextFunction) => {
    const tipo = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase() as TipoArchivoFactura;
    if (!TIPOS_PERMITIDOS.includes(tipo) || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(415).json({ error: 'FormatoNoSoportado', mensaje: 'Envía una imagen JPG, PNG, WEBP o un PDF.' });
      return;
    }
    if (!firmaCoincide(req.body, tipo)) {
      res.status(415).json({ error: 'FormatoNoSoportado', mensaje: 'El contenido del archivo no coincide con su formato.' });
      return;
    }
    try {
      const datos = await extractor!.extraer(req.body, tipo);
      res.status(200).json({ datos });
    } catch (error) {
      if (error instanceof IaNoDisponibleError) {
        res.status(502).json({ error: 'IaNoDisponible', mensaje: error.message });
        return;
      }
      next(error);
    }
  },
);

// Archivo demasiado grande u otro error del parser binario.
router.use((err: Error & { type?: string }, _req: RequestAutenticado, res: Response, next: NextFunction) => {
  if (err.type === 'entity.too.large') {
    res.status(413).json({ error: 'ArchivoMuyGrande', mensaje: `El archivo supera ${maxMb} MB.` });
    return;
  }
  next(err);
});

export default router;
