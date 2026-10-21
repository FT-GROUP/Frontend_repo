import { useCallback, useEffect, useState } from 'react'
import { Alert, Loader, PageHeader } from '../components/ui'
import Icon from '../components/Icon'
import { estadoSistemaApi } from '../services/estadoSistemaApi'

function EstadoItem({ title, status, detail }) {
  const disponible = status === 'operativo' || status === 'operativa'
  return (
    <article className="stat">
      <span className="stat-label">{title}</span>
      <strong className="stat-value">{status || 'Sin datos'}</strong>
      <small>{detail || (disponible ? 'Servicio disponible' : 'Sin información reciente')}</small>
    </article>
  )
}

export default function EstadoSistema() {
  const [estado, setEstado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setEstado(await estadoSistemaApi.consultar())
    } catch (err) {
      setEstado(err.details?.estado ? err.details : null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  return (
    <>
      <PageHeader
        title="Estado del sistema"
        subtitle="Disponibilidad de la API y su conexión con la base de datos."
        action={
          <button className="btn btn-ghost btn-sm" type="button" onClick={cargar} disabled={loading}>
            <Icon name="shield" size={16} />Actualizar
          </button>
        }
      />
      <Alert>{error}</Alert>
      {loading && !estado ? <Loader label="Consultando estado…" /> : (
        <>
          <div className="stats">
            <EstadoItem title="Estado general" status={estado?.estado} />
            <EstadoItem title="API" status={estado?.servicios?.api?.estado} />
            <EstadoItem
              title="Base de datos"
              status={estado?.servicios?.baseDatos?.estado}
              detail={estado?.servicios?.baseDatos?.latenciaMs != null
                ? `Respuesta en ${estado.servicios.baseDatos.latenciaMs} ms`
                : undefined}
            />
          </div>
          {estado && (
            <>
              <section className="section card">
                <h2 className="card-title">Información operativa</h2>
                <p>Tiempo activo: {estado.uptimeSegundos} segundos</p>
                <p className="muted small">
                  Última comprobación: {estado.actualizadoEn && !isNaN(new Date(estado.actualizadoEn).getTime())
                    ? new Date(estado.actualizadoEn).toLocaleString()
                    : new Date().toLocaleString()}
                </p>
              </section>

              <section className="section card" style={{ marginTop: '20px' }}>
                <h2 className="card-title">Relación Backend ↔ Frontend y Flujo Completo de Datos</h2>
                <p className="muted" style={{ marginBottom: '16px' }}>
                  Arquitectura cliente-servidor desacoplada mediante API Gateway, microservicios Node.js/TypeScript y PostgreSQL.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                  <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: '12px', border: '1px solid var(--line-2)' }}>
                    <strong style={{ color: 'var(--accent-hi)', display: 'block', marginBottom: '6px' }}>1. Capa Frontend (React + Vite)</strong>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                      Interacción del usuario, estado reactivo con Context API (Theme, Currency, I18n), interceptor HTTP con Bearer Tokens JWT y Fallback Resiliente.
                    </p>
                  </div>
                  <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: '12px', border: '1px solid var(--line-2)' }}>
                    <strong style={{ color: 'var(--accent-hi)', display: 'block', marginBottom: '6px' }}>2. API Gateway (Puertos 8080 / 3000)</strong>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                      Punto único de entrada, proxy inverso no bloqueante, seguridad HTTP con Helmet, políticas CORS y enrutamiento hacia microservicios.
                    </p>
                  </div>
                  <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: '12px', border: '1px solid var(--line-2)' }}>
                    <strong style={{ color: 'var(--accent-hi)', display: 'block', marginBottom: '6px' }}>3. Microservicios (Arquitectura Hexagonal)</strong>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                      Auth (3001), Expenses (3002), Reports (3003) y Notifications (3004). Validación con Zod y casos de uso de dominio independientes.
                    </p>
                  </div>
                  <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: '12px', border: '1px solid var(--line-2)' }}>
                    <strong style={{ color: 'var(--accent-hi)', display: 'block', marginBottom: '6px' }}>4. Persistencia y Auditoría 5W (PostgreSQL)</strong>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                      Consultas parametrizadas con Pool pg, integridad referencial y bitácora de auditoría (Quién, Qué, Cuándo, Dónde y Por Qué).
                    </p>
                  </div>
                </div>

                <div style={{ background: 'var(--inset)', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                  <strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Ciclo de Vida de una Petición (End-to-End):</strong>
                  <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.7', color: 'var(--text)' }}>
                    <li><b>UI ➔ HTTP:</b> El cliente emite <code>rawRequest()</code> adjuntando el JWT en <code>Authorization: Bearer</code>.</li>
                    <li><b>HTTP ➔ Gateway:</b> Llega al API Gateway que verifica el origen y despacha por proxy hacia el microservicio correspondiente.</li>
                    <li><b>Microservicio ➔ Dominio:</b> Middlewares autentican y autorizan roles; el Caso de Uso ejecuta reglas de negocio.</li>
                    <li><b>Dominio ➔ PostgreSQL:</b> Se realizan transacciones ACID y se guarda la traza en <code>auditoria_evento</code>.</li>
                    <li><b>Respuesta ➔ UI:</b> El Gateway devuelve el payload JSON (200/201) y la interfaz se actualiza de forma reactiva sin recargar.</li>
                  </ol>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </>
  )
}
