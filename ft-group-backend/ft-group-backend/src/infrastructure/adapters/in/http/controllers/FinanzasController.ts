import { NextFunction, Response } from 'express';
import {
  agregarMiembroUseCase, archivarGrupoUseCase, crearGrupoUseCase, eliminarGastoUseCase, liquidarDeudaUseCase,
  listarGastosUseCase, listarGruposUseCase, listarHistorialUseCase, obtenerResumenUseCase, registrarGastoUseCase,
  registrarPagoUseCase,
} from '../../../../config/container';
import { RequestAutenticado } from '../middlewares/authMiddleware';
import { CrearGrupoInput, RegistrarGastoInput } from '../validators/finanzasValidators';
import { presentarGasto, presentarGrupo, presentarMovimiento, presentarResumen } from '../presenters/finanzasPresenter';

type Handler = (req: RequestAutenticado, res: Response) => Promise<void>;

/** Envuelve cada accion para enviar los errores al errorHandler centralizado. */
const accion = (fn: Handler) => (req: RequestAutenticado, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};

const yo = (req: RequestAutenticado) => req.usuario!.id;
const idParam = (req: RequestAutenticado) => Number(req.params.id);

/**
 * Adaptador de entrada (API REST) de los modulos financieros. Solo
 * traduce HTTP <-> casos de uso; no contiene reglas de negocio.
 */
export const FinanzasController = {
  resumen: accion(async (req, res) => {
    res.json(presentarResumen(await obtenerResumenUseCase.ejecutar(yo(req))));
  }),

  listarGrupos: accion(async (req, res) => {
    res.json((await listarGruposUseCase.ejecutar(yo(req))).map(presentarGrupo));
  }),

  crearGrupo: accion(async (req, res) => {
    const b = req.body as CrearGrupoInput;
    const grupo = await crearGrupoUseCase.ejecutar({
      usuarioId: yo(req),
      nombre: b.nombre,
      descripcion: b.descripcion,
      icono: b.icono,
      ciudad: b.ciudad,
      latitud: b.lat,
      longitud: b.lng,
      emailsIntegrantes: b.integrantes.map((i) => i.email),
    });
    res.status(201).json(presentarGrupo(grupo));
  }),

  agregarMiembro: accion(async (req, res) => {
    const grupo = await agregarMiembroUseCase.ejecutar({ usuarioId: yo(req), grupoId: idParam(req), email: req.body.email });
    res.status(201).json(presentarGrupo(grupo));
  }),

  archivarGrupo: accion(async (req, res) => {
    await archivarGrupoUseCase.ejecutar({ usuarioId: yo(req), grupoId: idParam(req) });
    res.status(204).send();
  }),

  listarGastos: accion(async (req, res) => {
    res.json((await listarGastosUseCase.ejecutar(yo(req))).map(presentarGasto));
  }),

  registrarGasto: accion(async (req, res) => {
    const b = req.body as RegistrarGastoInput;
    const id = await registrarGastoUseCase.ejecutar({
      usuarioId: yo(req),
      grupoId: b.grupo_id,
      pagadorId: b.pagador_id,
      descripcion: b.descripcion,
      montoTotal: b.monto_total,
      fechaGasto: b.fecha_gasto,
      categoria: b.categoria,
      tipoDivision: b.tipo_division,
      divisiones: b.divisiones.map((d) => ({ usuarioId: d.usuario_id, montoAsignado: d.monto_asignado })),
      origenRegistro: b.origen_registro,
      recibo: b.recibo && {
        imagenUrl: b.recibo.imagen_url,
        montoExtraido: b.recibo.monto_extraido ?? null,
        fechaExtraida: b.recibo.fecha_extraida ?? null,
        comercioExtraido: b.recibo.comercio_extraido ?? null,
        categoriaSugerida: b.recibo.categoria_sugerida ?? null,
        confianzaOcr: b.recibo.confianza_ocr ?? null,
      },
    });
    res.status(201).json({ mensaje: 'Gasto registrado exitosamente.', id: String(id) });
  }),

  eliminarGasto: accion(async (req, res) => {
    await eliminarGastoUseCase.ejecutar({ usuarioId: yo(req), gastoId: idParam(req) });
    res.status(204).send();
  }),

  registrarPago: accion(async (req, res) => {
    await registrarPagoUseCase.ejecutar({ usuarioId: yo(req), gastoId: idParam(req), deudorId: req.body.usuario_id ?? yo(req) });
    res.json({ mensaje: 'Pago registrado.' });
  }),

  liquidar: accion(async (req, res) => {
    await liquidarDeudaUseCase.ejecutar({ usuarioId: yo(req), grupoId: req.body.grupo_id, deudorId: req.body.de, acreedorId: req.body.para });
    res.json({ mensaje: 'Liquidación registrada.' });
  }),

  historial: accion(async (req, res) => {
    const limite = Number(req.query.limite) || 100;
    res.json((await listarHistorialUseCase.ejecutar(yo(req), limite)).map(presentarMovimiento));
  }),
};
