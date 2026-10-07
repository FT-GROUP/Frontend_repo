import { useEffect, useMemo, useRef, useState } from 'react'
import { analyticsApi } from '../services/analyticsApi'
import { financeApi } from '../services/financeApi'
import { useData } from '../utils/useData'
import { categoria, money, moneyShort } from '../utils/format'
import { Alert, Chips, Empty, Loader, PageHeader } from '../components/ui'
import Icon from '../components/Icon'

const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const mesCorto = ym => MES_CORTO[Number(ym.slice(5, 7)) - 1]
const pct = (v, d = 0) => `${(v * 100).toFixed(d).replace('.', ',')} %`
const num = v => (v === null || v === undefined ? '—' : String(v).replace('.', ','))

const CONFIANZA = {
  alta: { label: 'Confianza alta', cls: 'conf-alta' },
  media: { label: 'Confianza media', cls: 'conf-media' },
  baja: { label: 'Confianza baja', cls: 'conf-baja' },
}

/** Mide el ancho disponible para dibujar el gráfico en píxeles reales (nítido en móvil y portátil). */
function useWidth() {
  const ref = useRef(null)
  const [w, setW] = useState(640)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.floor(e.contentRect.width))))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

function ForecastChart({ historico, pronostico, mesEnCurso }) {
  const [ref, width] = useWidth()
  const compact = width < 480
  const hist = historico.slice(-(compact ? 6 : 12))
  const bars = [
    ...hist.map(h => ({ mes: h.mes, valor: h.total, tipo: 'real' })),
    ...pronostico.map(p => ({ mes: p.mes, valor: p.valor, inferior: p.inferior, superior: p.superior, tipo: p.paso === 1 ? 'curso' : 'pron' })),
  ]
  const H = compact ? 220 : 260
  const m = { t: 14, r: 8, b: 26, l: compact ? 40 : 52 }
  const max = Math.max(1, ...bars.map(b => b.superior ?? b.valor)) * 1.08
  const iw = width - m.l - m.r
  const ih = H - m.t - m.b
  const slot = iw / bars.length
  const bw = Math.min(40, slot * 0.62)
  const y = v => m.t + ih - (v / max) * ih
  const ticks = [0, 0.5, 1].map(f => f * max)

  return (
    <div ref={ref} className="chart-wrap">
      <svg width={width} height={H} role="img"
        aria-label="Gasto mensual histórico y pronóstico de los próximos meses con intervalo de confianza">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="rgba(249,115,22,.14)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#f97316" strokeWidth="2" />
          </pattern>
        </defs>
        {ticks.map(t => (
          <g key={t}>
            <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} className="grid-line" />
            <text x={m.l - 6} y={y(t) + 4} textAnchor="end" className="axis-text">{moneyShort(t)}</text>
          </g>
        ))}
        {bars.map((b, i) => {
          const cx = m.l + slot * i + slot / 2
          const x = cx - bw / 2
          const top = y(b.valor)
          return (
            <g key={b.mes}>
              <title>{`${mesCorto(b.mes)} ${b.mes.slice(0, 4)}: ${money(b.valor)}${b.superior != null ? ` (rango ${money(b.inferior)} – ${money(b.superior)})` : ''}`}</title>
              {b.tipo === 'real' && <rect x={x} y={top} width={bw} height={Math.max(1, m.t + ih - top)} rx="4" className="bar-real" />}
              {b.tipo !== 'real' && <rect x={x} y={top} width={bw} height={Math.max(1, m.t + ih - top)} rx="4" fill="url(#hatch)" className="bar-pron" />}
              {b.tipo === 'curso' && mesEnCurso && (
                <rect x={x} y={y(Math.min(mesEnCurso.acumulado, max))} width={bw}
                  height={Math.max(1, m.t + ih - y(Math.min(mesEnCurso.acumulado, max)))} rx="4" className="bar-acum" />
              )}
              {b.superior != null && (
                <g className="whisker">
                  <line x1={cx} x2={cx} y1={y(b.superior)} y2={y(b.inferior)} />
                  <line x1={cx - 5} x2={cx + 5} y1={y(b.superior)} y2={y(b.superior)} />
                  <line x1={cx - 5} x2={cx + 5} y1={y(b.inferior)} y2={y(b.inferior)} />
                </g>
              )}
              <text x={cx} y={H - 8} textAnchor="middle" className={`axis-text${b.tipo !== 'real' ? ' axis-strong' : ''}`}>{mesCorto(b.mes)}</text>
            </g>
          )
        })}
      </svg>
      <ul className="legend">
        <li><i className="sw sw-real" />Gasto real</li>
        <li><i className="sw sw-acum" />Acumulado del mes en curso</li>
        <li><i className="sw sw-pron" />Pronóstico</li>
        <li><i className="sw sw-int" />Intervalo 80 %</li>
      </ul>
    </div>
  )
}

function Tile({ label, value, hint, tone }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <strong className={`stat-value ${tone || ''}`}>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  )
}

function Meter({ label, value, tone = 'accent', text }) {
  return (
    <div className="meter">
      <div className="meter-head"><span>{label}</span><b>{text}</b></div>
      <div className="meter-track"><div className={`meter-fill meter-${tone}`} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} /></div>
    </div>
  )
}

export default function Analytics({ user }) {
  const [grupo, setGrupo] = useState('todos')
  const [meses, setMeses] = useState(12)
  const grupos = useData(() => financeApi.groups(user), [user.id])
  const { data, error, loading } = useData(async () => {
    const [kpis, pred] = await Promise.all([
      analyticsApi.kpis({ grupoId: grupo, meses }),
      analyticsApi.predicciones({ grupoId: grupo, horizonte: 3 }),
    ])
    return { kpis, pred }
  }, [grupo, meses])

  const listaGrupos = grupos.data || []
  const header = (
    <PageHeader title="Análisis y predicciones"
      subtitle="KPIs, estimadores y proyección de gastos calculados con tu historial" />
  )
  const filtros = (
    <div className="filters">
      <label className="select-chip">
        <Icon name="layers" size={15} />
        <select value={grupo} onChange={e => setGrupo(e.target.value)} aria-label="Grupo a analizar">
          <option value="todos">Todos mis grupos</option>
          {listaGrupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
      </label>
      <Chips label="Periodo" value={meses} onChange={setMeses}
        options={[{ id: 3, label: '3 meses' }, { id: 6, label: '6 meses' }, { id: 12, label: '12 meses' }]} />
    </div>
  )

  if (error) return <>{header}{filtros}<Alert>{error}</Alert></>
  if (loading || !data) return <>{header}{filtros}<Loader label="Calculando indicadores…" /></>

  const { kpis, pred } = data
  if (!kpis.resumen.numGastos && !pred.historico.length) {
    return <>{header}{filtros}<Empty icon="chart" title="Aún no hay datos para analizar"
      text="Registra gastos en tus grupos. Con 3 o más meses de historial aparecen las predicciones." /></>
  }

  const { resumen: r, estimadores: e, indicadores: ind, tendencia: t } = kpis
  const p = pred.gastoTotal
  const conf = CONFIANZA[p.confianza] || CONFIANZA.baja
  const mc = pred.mesEnCurso
  const maxCat = Math.max(1, ...kpis.categorias.map(c => c.total))
  const pg = pred.pagos

  return (
    <>
      {header}
      {filtros}

      {pred.alertas.map((a, i) => <Alert key={i} type={a.tipo === 'aviso' ? 'warning' : 'success'}>{a.mensaje}</Alert>)}

      <div className="stats">
        <Tile label="Total gastado" value={money(r.totalGastado)} hint={`${r.numGastos} gastos · ${money(r.gastoPromedioMensual)} / mes`} />
        <Tile label="Esperado este mes" value={money(mc.esperado)}
          hint={`Llevas ${money(mc.acumulado)} (${num(mc.avancePct)} %)`} tone={mc.acumulado > mc.rangoEsperado.superior ? 'neg' : ''} />
        <Tile label="Variación vs mes anterior"
          value={t.variacionUltimoMesPct == null ? '—' : `${t.variacionUltimoMesPct > 0 ? '+' : ''}${num(t.variacionUltimoMesPct)} %`}
          hint={t.mesMayorGasto ? `Mes más alto: ${mesCorto(t.mesMayorGasto.mes)} (${moneyShort(t.mesMayorGasto.total)})` : ''} />
      </div>

      <section className="card an-block">
        <div className="an-head">
          <h2 className="card-title">Gasto mensual y pronóstico</h2>
          <span className={`conf ${conf.cls}`}>{conf.label}</span>
        </div>
        {pred.historico.length ? (
          <ForecastChart historico={pred.historico} pronostico={p.pronostico} mesEnCurso={mc} />
        ) : <Empty icon="chart" title="Sin meses cerrados" text="El pronóstico necesita al menos un mes completo de historial." />}
        <p className="an-note">
          Modelo elegido: <b>{p.etiquetaModelo}</b> · error medio ±{money(p.errorMedioAbsoluto)}
          {p.errorPorcentual != null && <> ({num(p.errorPorcentual)} %)</>} · {p.mesesDeHistorial} meses de historial.
          Se escoge automáticamente el modelo con menor error al «predecir el pasado» (backtesting).
        </p>
        <details className="an-details">
          <summary>Comparación de modelos</summary>
          <table className="table mini">
            <thead><tr><th>Modelo</th><th className="num">Error medio (MAE)</th><th className="num">Error % (MAPE)</th></tr></thead>
            <tbody>
              {p.evaluacionModelos.map(m => (
                <tr key={m.modelo} className={m.modelo === p.modelo ? 'row-best' : ''}>
                  <td>{m.etiqueta}{m.modelo === p.modelo && ' ✓'}</td>
                  <td className="num">{money(m.mae)}</td><td className="num">{num(m.mape)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <div className="an-grid">
        <section className="card an-block">
          <h2 className="card-title">Indicadores clave</h2>
          <Meter label="Tasa de pago" value={ind.tasaPago} tone="pos" text={pct(ind.tasaPago, 1)} />
          <Meter label="Morosidad" value={ind.morosidad} tone="neg" text={pct(ind.morosidad, 1)} />
          <Meter label="Índice de equidad" value={ind.indiceEquidad} tone="accent" text={num(ind.indiceEquidad)} />
          <Meter label="Concentración por categoría (HHI)" value={ind.indiceConcentracion} tone="accent" text={num(ind.indiceConcentracion)} />
          <dl className="kv">
            <div><dt>Deuda pendiente</dt><dd>{money(ind.deudaPendiente)}</dd></div>
            <div><dt>Divisiones pendientes</dt><dd>{ind.divisionesPendientes}</dd></div>
            <div><dt>Días promedio de pago</dt><dd>{num(ind.diasPromedioPago)}</dd></div>
            <div><dt>Antigüedad de la deuda</dt><dd>{num(ind.antiguedadPromedioDeudaDias)} días</dd></div>
            <div><dt>Gastos por OCR</dt><dd>{num(ind.porcentajeGastosOcr)} %</dd></div>
          </dl>
        </section>

        <section className="card an-block">
          <h2 className="card-title">Estimadores estadísticos</h2>
          <dl className="kv">
            <div><dt>Media por gasto</dt><dd>{money(e.media)}</dd></div>
            <div><dt>Mediana</dt><dd>{money(e.mediana)}</dd></div>
            <div><dt>Desviación estándar</dt><dd>{money(e.desviacionEstandar)}</dd></div>
            <div><dt>Coef. de variación</dt><dd>{num(e.coeficienteVariacion)}</dd></div>
            <div><dt>Percentil 90</dt><dd>{money(e.percentil90)}</dd></div>
            <div><dt>IC 95 % de la media</dt><dd>{money(e.intervaloConfianza95.inferior)} – {money(e.intervaloConfianza95.superior)}</dd></div>
            <div><dt>Observaciones (n)</dt><dd>{e.n}</dd></div>
          </dl>
        </section>
      </div>

      <div className="an-grid">
        <section className="card an-block">
          <h2 className="card-title">Gasto por categoría</h2>
          <ul className="cat-list">
            {kpis.categorias.map(c => {
              const cat = categoria(c.categoria)
              const f = pred.porCategoria.find(x => x.categoria === c.categoria)
              return (
                <li key={c.categoria}>
                  <div className="cat-row">
                    <span className="cat-name"><Icon name={cat.icon} size={15} />{cat.label}</span>
                    <b>{money(c.total)}</b>
                  </div>
                  <div className="meter-track"><div className="meter-fill meter-accent" style={{ width: `${(c.total / maxCat) * 100}%` }} /></div>
                  <small>{num(c.porcentaje)} % del total{f ? ` · este mes se esperan ${money(f.pronosticoMesEnCurso)}` : ''}</small>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="card an-block">
          <h2 className="card-title">Cobros esperados</h2>
          {pg.disponible ? (
            <>
              <div className="pay-hero">
                <span>Deuda pendiente</span><strong>{money(pg.deudaPendiente)}</strong>
                <span>Se cobraría en 30 días (esperado)</span><strong className="pos">{money(pg.cobroEsperado30d)}</strong>
              </div>
              <dl className="kv">
                <div><dt>Plazo típico de pago (mediana)</dt><dd>{pg.diasMediana} días</dd></div>
                <div><dt>9 de cada 10 pagan antes de</dt><dd>{pg.dias90} días</dd></div>
                <div><dt>Prob. de pago en 7 días</dt><dd>{pct(pg.probabilidadPago7d)}</dd></div>
                <div><dt>Prob. de pago en 30 días</dt><dd>{pct(pg.probabilidadPago30d)}</dd></div>
                <div><dt>Pagos observados</dt><dd>{pg.pagosObservados}</dd></div>
              </dl>
              {pg.porDeudor.length > 0 && (
                <table className="table mini">
                  <thead><tr><th>Quién debe</th><th className="num">Pendiente</th></tr></thead>
                  <tbody>{pg.porDeudor.map(d => <tr key={d.usuarioId}><td>{d.nombre}</td><td className="num">{money(d.pendiente)}</td></tr>)}</tbody>
                </table>
              )}
            </>
          ) : <p className="an-note">{pg.mensaje || 'Aún no hay suficientes pagos registrados para estimar plazos de cobro.'}</p>}
        </section>
      </div>

      <section className="card an-block">
        <h2 className="card-title">Aportes y consumo por integrante</h2>
        <div className="table-scroll">
          <table className="table">
            <thead><tr><th>Integrante</th><th className="num">Aportó</th><th className="num">Consumió</th><th className="num">Posición neta</th><th className="num">Tasa de pago</th></tr></thead>
            <tbody>
              {kpis.miembros.map(m => (
                <tr key={m.usuarioId}>
                  <td>{m.nombre}</td><td className="num">{money(m.aportado)}</td><td className="num">{money(m.consumo)}</td>
                  <td className={`num ${m.posicionNeta < 0 ? 'neg' : 'pos'}`}>{money(m.posicionNeta, { sign: true })}</td>
                  <td className="num">{pct(m.tasaPago)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
