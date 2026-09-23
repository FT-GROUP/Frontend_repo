import { useMemo, useState } from 'react'
import { financeApi } from '../services/financeApi'
import { useData } from '../utils/useData'
import { CATEGORIAS, categoria, money, monthLabel } from '../utils/format'
import { Alert, Chips, Empty, Loader } from '../components/ui'
import Icon from '../components/Icon'

function Estado({ g }) {
  if (g.mi_estado === 'pendiente') return <small className="neg">Debes {money(g.mi_parte)}</small>
  if (g.mi_estado === 'pagador' && g.me_deben > 0) return <small className="pos">Te deben {money(g.me_deben)}</small>
  return <small className="pos">Saldado</small>
}

export default function History({ user }) {
  const { data, error, loading } = useData(
    async () => ({ gastos: await financeApi.expenses(user), grupos: await financeApi.groups(user) }), [user.id])
  const [grupo, setGrupo] = useState('todos')
  const [cat, setCat] = useState('todos')

  const filtrados = useMemo(() => (data?.gastos || []).filter(g =>
    (grupo === 'todos' || g.grupo_id === grupo) && (cat === 'todos' || g.categoria === cat)), [data, grupo, cat])

  const porMes = useMemo(() => {
    const map = new Map()
    for (const g of filtrados) {
      const k = g.fecha_gasto.slice(0, 7)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(g)
    }
    return [...map.entries()]
  }, [filtrados])

  if (loading) return <Loader />
  if (error) return <Alert>{error}</Alert>

  const total = filtrados.reduce((s, g) => s + g.monto_total, 0)

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Historial financiero</h1>
          <p className="page-subtitle">Total filtrado <strong className="accent total-big">{money(total)}</strong></p>
        </div>
      </header>

      <div className="filters">
        <label className="select-chip">
          <Icon name="layers" size={15} />
          <select value={grupo} onChange={e => setGrupo(e.target.value)} aria-label="Filtrar por grupo">
            <option value="todos">Todos los grupos</option>
            {data.grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        </label>
        <Chips label="Filtrar por categoría" value={cat} onChange={setCat}
          options={[{ id: 'todos', label: 'Todos' }, ...CATEGORIAS.map(c => ({ id: c.id, label: c.label }))]} />
      </div>

      {porMes.length === 0 ? (
        <Empty icon="chart" title="No hay movimientos" text="Prueba con otros filtros." />
      ) : porMes.map(([mes, items]) => (
        <section key={mes} className="month">
          <div className="month-head">
            <span>{monthLabel(mes)}</span>
            <span>{money(items.reduce((s, g) => s + g.monto_total, 0))}</span>
          </div>
          <ul className="card list-card">
            {items.map(g => (
              <li key={g.id} className="list-row">
                <span className="tile-icon sm cat"><Icon name={categoria(g.categoria).icon} size={18} /></span>
                <div className="list-main">
                  <span className="list-title">{g.descripcion}</span>
                  <small className="muted">{g.grupo?.nombre} · {g.fecha_gasto} · {g.personas} {g.personas === 1 ? 'persona' : 'personas'}</small>
                </div>
                <div className="list-end stacked">
                  <strong>{money(g.monto_total)}</strong>
                  <Estado g={g} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
