import { GastoDetalle, GrupoDetalle, ResumenPanel } from '../../../../../domain/ports/in/FinanzasUseCases';
import { MovimientoRegistro } from '../../../../../domain/ports/out/FinanzasRepositories';

/**
 * Presentador: traduce los resultados de los casos de uso al JSON que
 * consume el frontend (snake_case e identificadores como texto).
 */
const s = (n: number | null | undefined) => (n == null ? null : String(n));

export function presentarGrupo(g: GrupoDetalle) {
  return {
    id: s(g.grupo.id),
    nombre: g.grupo.nombre,
    descripcion: g.grupo.descripcion,
    icono: g.grupo.icono,
    ciudad: g.grupo.ciudad,
    lat: g.grupo.latitud,
    lng: g.grupo.longitud,
    creado_por: s(g.grupo.creadoPor),
    fecha_creacion: g.grupo.fechaCreacion,
    estado: g.grupo.estado,
    rol: g.rol,
    miembros: g.miembros.map((m) => ({ id: s(m.usuarioId), nombre: m.nombre, email: m.email, rol: m.rol })),
    total_gastos: g.totalGastos,
    num_gastos: g.numGastos,
    mi_balance: g.miBalance,
    liquidaciones: g.saldos.map((x) => ({ de: s(x.deudorId), para: s(x.acreedorId), monto: x.monto })),
  };
}

export function presentarResumen(r: ResumenPanel) {
  return {
    grupos: r.grupos.map(presentarGrupo),
    teDeben: r.teDeben,
    debes: r.debes,
    balance: r.balance,
    liquidaciones: r.liquidaciones.map((l) => ({
      de: s(l.deudorId),
      para: s(l.acreedorId),
      monto: l.monto,
      grupo_id: s(l.grupoId),
      grupo: l.grupoNombre,
      deUsuario: { id: s(l.deudor.id), nombre: l.deudor.nombre },
      paraUsuario: { id: s(l.acreedor.id), nombre: l.acreedor.nombre },
    })),
    demo: false,
  };
}

export function presentarGasto(d: GastoDetalle) {
  const g = d.gasto;
  return {
    id: s(g.id),
    grupo_id: s(g.grupoId),
    pagador_id: s(g.pagadorId),
    descripcion: g.descripcion,
    monto_total: g.montoTotal,
    fecha_gasto: g.fechaGasto,
    categoria: g.categoria,
    tipo_division: g.tipoDivision,
    origen_registro: g.origenRegistro,
    fecha_registro: g.fechaRegistro,
    grupo: { id: s(d.grupo.id), nombre: d.grupo.nombre },
    pagador: { id: s(d.pagador.id), nombre: d.pagador.nombre },
    personas: d.divisiones.length,
    divisiones: d.divisiones.map((x) => ({
      gasto_id: s(x.gastoId),
      usuario_id: s(x.usuarioId),
      monto_asignado: x.montoAsignado,
      estado_pago: x.estadoPago,
      fecha_pago: x.fechaPago,
      usuario: { id: s(x.usuarioId), nombre: x.nombre },
    })),
    mi_parte: d.miParte,
    mi_estado: d.miEstado,
    me_deben: d.meDeben,
  };
}

export function presentarMovimiento(m: MovimientoRegistro) {
  return {
    id: s(m.id),
    usuario: { id: s(m.usuarioId), nombre: m.usuarioNombre },
    grupo: { id: s(m.grupoId), nombre: m.grupoNombre },
    gasto_id: s(m.gastoId),
    tipo_movimiento: m.tipoMovimiento,
    descripcion: m.descripcion,
    fecha: m.fecha,
  };
}
