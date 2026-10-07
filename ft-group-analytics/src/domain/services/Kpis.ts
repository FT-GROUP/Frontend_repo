import {
  desviacionEstandar, intervaloConfianzaMedia, media, mediana, percentil, redondear, suma,
} from './Estadistica';
import { diasEntre, mesDe, rangoMeses, sumarMeses } from './Fechas';
import { DivisionDato, GastoDato, MiembroDato } from './Datos';

/**
 * KPIs, estimadores e indicadores financieros (dominio puro).
 * Recibe datos ya cargados y devuelve numeros listos para mostrar.
 */

export interface EntradaKpis {
  gastos: GastoDato[];
  divisiones: DivisionDato[];
  miembros: MiembroDato[];
  usuarioId: number;
  hoy: string; // AAAA-MM-DD
  meses: number;
}

export interface KpisResultado {
  periodo: { desde: string; hasta: string; meses: number };
  resumen: {
    totalGastado: number;
    numGastos: number;
    gastoPromedioMensual: number;
    gastoPromedioPorGasto: number;
    gastoMedianoPorGasto: number;
    gastoPorPersona: number;
    mayorGasto: { descripcion: string; monto: number; fecha: string } | null;
  };
  estimadores: {
    n: number;
    media: number;
    mediana: number;
    desviacionEstandar: number;
    coeficienteVariacion: number | null;
    percentil90: number;
    intervaloConfianza95: { inferior: number; superior: number } | null;
  };
  mensual: { mes: string; total: number; numGastos: number }[];
  tendencia: {
    variacionUltimoMesPct: number | null;
    mesMayorGasto: { mes: string; total: number } | null;
    mesEnCurso: { mes: string; acumulado: number };
  };
  categorias: { categoria: string; total: number; porcentaje: number; numGastos: number }[];
  indicadores: {
    categoriaPrincipal: string | null;
    indiceConcentracion: number | null;
    tasaPago: number | null;
    morosidad: number | null;
    deudaPendiente: number;
    divisionesPendientes: number;
    diasPromedioPago: number | null;
    antiguedadPromedioDeudaDias: number | null;
    porcentajeGastosOcr: number | null;
    indiceEquidad: number | null;
  };
  miembros: {
    usuarioId: number;
    nombre: string;
    aportado: number;
    consumo: number;
    posicionNeta: number;
    deudaPendiente: number;
    tasaPago: number | null;
  }[];
  usuario: { aportado: number; consumo: number; posicionNeta: number; meDeben: number; debes: number };
}

const r0 = (n: number) => redondear(n, 0);

export function calcularKpis(e: EntradaKpis): KpisResultado {
  const mesActual = mesDe(e.hoy);
  const mesInicial = sumarMeses(mesActual, -(e.meses - 1));
  const desde = `${mesInicial}-01`;
  const gastos = e.gastos.filter((g) => g.fecha >= desde);
  const idsGasto = new Set(gastos.map((g) => g.id));
  const porId = new Map(gastos.map((g) => [g.id, g]));
  const divisiones = e.divisiones.filter((d) => idsGasto.has(d.gastoId));

  // ---- Serie mensual (con ceros en meses sin gastos) ----
  const totalesMes = new Map<string, { total: number; n: number }>();
  for (const g of gastos) {
    const t = totalesMes.get(mesDe(g.fecha)) ?? { total: 0, n: 0 };
    t.total += g.monto;
    t.n += 1;
    totalesMes.set(mesDe(g.fecha), t);
  }
  const mensual = rangoMeses(mesInicial, mesActual).map((mes) => ({
    mes,
    total: r0(totalesMes.get(mes)?.total ?? 0),
    numGastos: totalesMes.get(mes)?.n ?? 0,
  }));

  // ---- Resumen y estimadores ----
  const montos = gastos.map((g) => g.monto);
  const total = suma(montos);
  const primerMesConDatos = mensual.find((m) => m.numGastos > 0)?.mes ?? mesActual;
  const cerrados = mensual.filter((m) => m.mes >= primerMesConDatos && m.mes < mesActual);
  const baseMensual = cerrados.length ? cerrados : mensual.filter((m) => m.mes === mesActual);
  const personas = new Set(e.miembros.map((m) => m.usuarioId)).size;
  const mayor = gastos.reduce<GastoDato | null>((a, g) => (!a || g.monto > a.monto ? g : a), null);
  const sd = desviacionEstandar(montos);
  const mu = media(montos);
  const ic = intervaloConfianzaMedia(montos);

  // ---- Tendencia ----
  const ultimosCerrados = mensual.filter((m) => m.mes < mesActual && m.mes >= primerMesConDatos);
  let variacion: number | null = null;
  if (ultimosCerrados.length >= 2) {
    const [ant, ult] = ultimosCerrados.slice(-2);
    variacion = ant.total > 0 ? redondear(((ult.total - ant.total) / ant.total) * 100, 1) : null;
  }
  const mesMayor = mensual.reduce<{ mes: string; total: number } | null>(
    (a, m) => (m.total > 0 && (!a || m.total > a.total) ? { mes: m.mes, total: m.total } : a), null);

  // ---- Categorias e indice de concentracion (Herfindahl) ----
  const porCat = new Map<string, { total: number; n: number }>();
  for (const g of gastos) {
    const c = porCat.get(g.categoria) ?? { total: 0, n: 0 };
    c.total += g.monto;
    c.n += 1;
    porCat.set(g.categoria, c);
  }
  const categorias = [...porCat.entries()]
    .map(([categoria, c]) => ({ categoria, total: r0(c.total), porcentaje: total ? redondear((c.total / total) * 100, 1) : 0, numGastos: c.n }))
    .sort((a, b) => b.total - a.total);
  const hhi = total ? suma([...porCat.values()].map((c) => (c.total / total) ** 2)) : null;

  // ---- Pagos y cartera ----
  const deudas = divisiones.filter((d) => d.usuarioId !== porId.get(d.gastoId)?.pagadorId);
  const pendientes = deudas.filter((d) => d.estadoPago === 'pendiente');
  const montoDeudas = suma(deudas.map((d) => d.monto));
  const montoPagado = suma(deudas.filter((d) => d.estadoPago === 'pagado').map((d) => d.monto));
  const tasaPago = montoDeudas > 0 ? montoPagado / montoDeudas : null;
  const diasPago = deudas
    .filter((d) => d.estadoPago === 'pagado' && d.fechaPago)
    .map((d) => Math.max(0, diasEntre(porId.get(d.gastoId)!.fecha, d.fechaPago as string)));
  const edades = pendientes.map((d) => Math.max(0, diasEntre(porId.get(d.gastoId)!.fecha, e.hoy)));

  // ---- Por miembro ----
  const nombres = new Map(e.miembros.map((m) => [m.usuarioId, m.nombre]));
  const ids = new Set<number>([...nombres.keys(), ...gastos.map((g) => g.pagadorId), ...divisiones.map((d) => d.usuarioId)]);
  const miembros = [...ids].map((id) => {
    const aportado = suma(gastos.filter((g) => g.pagadorId === id).map((g) => g.monto));
    const consumo = suma(divisiones.filter((d) => d.usuarioId === id).map((d) => d.monto));
    const suyas = deudas.filter((d) => d.usuarioId === id);
    const suyasPend = suyas.filter((d) => d.estadoPago === 'pendiente');
    const base = suma(suyas.map((d) => d.monto));
    return {
      usuarioId: id,
      nombre: nombres.get(id) ?? 'Usuario',
      aportado: r0(aportado),
      consumo: r0(consumo),
      posicionNeta: r0(aportado - consumo),
      deudaPendiente: r0(suma(suyasPend.map((d) => d.monto))),
      tasaPago: base > 0 ? redondear(1 - suma(suyasPend.map((d) => d.monto)) / base, 3) : null,
    };
  }).sort((a, b) => b.aportado - a.aportado);

  // Equidad: 1 - distancia entre la participacion en lo pagado y en lo consumido (1 = perfecta).
  const totAport = suma(miembros.map((m) => m.aportado));
  const totCons = suma(miembros.map((m) => m.consumo));
  const equidad = totAport > 0 && totCons > 0
    ? 1 - 0.5 * suma(miembros.map((m) => Math.abs(m.aportado / totAport - m.consumo / totCons)))
    : null;

  const yo = miembros.find((m) => m.usuarioId === e.usuarioId);
  const meDeben = suma(pendientes.filter((d) => porId.get(d.gastoId)?.pagadorId === e.usuarioId).map((d) => d.monto));
  const debes = suma(pendientes.filter((d) => d.usuarioId === e.usuarioId).map((d) => d.monto));

  return {
    periodo: { desde, hasta: e.hoy, meses: e.meses },
    resumen: {
      totalGastado: r0(total),
      numGastos: gastos.length,
      gastoPromedioMensual: r0(media(baseMensual.map((m) => m.total))),
      gastoPromedioPorGasto: r0(mu),
      gastoMedianoPorGasto: r0(mediana(montos)),
      gastoPorPersona: personas ? r0(total / personas) : 0,
      mayorGasto: mayor ? { descripcion: mayor.descripcion, monto: r0(mayor.monto), fecha: mayor.fecha } : null,
    },
    estimadores: {
      n: montos.length,
      media: r0(mu),
      mediana: r0(mediana(montos)),
      desviacionEstandar: r0(sd),
      coeficienteVariacion: mu > 0 && montos.length > 1 ? redondear(sd / mu, 2) : null,
      percentil90: r0(percentil(montos, 90)),
      intervaloConfianza95: ic ? { inferior: r0(Math.max(0, ic.inferior)), superior: r0(ic.superior) } : null,
    },
    mensual,
    tendencia: {
      variacionUltimoMesPct: variacion,
      mesMayorGasto: mesMayor,
      mesEnCurso: { mes: mesActual, acumulado: mensual[mensual.length - 1]?.total ?? 0 },
    },
    categorias,
    indicadores: {
      categoriaPrincipal: categorias[0]?.categoria ?? null,
      indiceConcentracion: hhi === null ? null : redondear(hhi, 3),
      tasaPago: tasaPago === null ? null : redondear(tasaPago, 3),
      morosidad: tasaPago === null ? null : redondear(1 - tasaPago, 3),
      deudaPendiente: r0(suma(pendientes.map((d) => d.monto))),
      divisionesPendientes: pendientes.length,
      diasPromedioPago: diasPago.length ? redondear(media(diasPago), 1) : null,
      antiguedadPromedioDeudaDias: edades.length ? redondear(media(edades), 1) : null,
      porcentajeGastosOcr: gastos.length ? redondear((gastos.filter((g) => g.origen === 'ocr').length / gastos.length) * 100, 1) : null,
      indiceEquidad: equidad === null ? null : redondear(equidad, 3),
    },
    miembros,
    usuario: {
      aportado: yo?.aportado ?? 0,
      consumo: yo?.consumo ?? 0,
      posicionNeta: yo?.posicionNeta ?? 0,
      meDeben: r0(meDeben),
      debes: r0(debes),
    },
  };
}
