import React, { useState } from 'react'
import { PageHeader, Alert } from '../components/ui'
import Icon from '../components/Icon'

export default function FlujoArquitectura() {
  const [pasoActivo, setPasoActivo] = useState(1)

  const pasos = [
    {
      id: 1,
      titulo: '1. Captura en Interfaz (React Vite)',
      emisor: 'Frontend (Cliente)',
      receptor: 'http.js (Servicio HTTP)',
      protocolo: 'Virtual DOM & Eventos React',
      detalle: 'El usuario interactúa con la UI (ej. crea un gasto o consulta auditoría). Los componentes React con State y Context (ThemeContext, CurrencyContext) procesan los datos en memoria.',
      codigo: '// frontend/src/services/http.js\nconst headers = { "Content-Type": "application/json" }\nif (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`\nconst response = await fetch(`${API_URL}${path}`, { method, headers, body })'
    },
    {
      id: 2,
      titulo: '2. Enrutamiento en API Gateway',
      emisor: 'http.js',
      receptor: 'API Gateway (Puerto 8080/3000)',
      protocolo: 'HTTPS / REST (JSON + JWT Bearer)',
      detalle: 'El API Gateway recibe la petición única, aplica cabeceras de seguridad con Helmet y CORS, e inspecciona la URL para despachar mediante proxy inverso al microservicio responsable.',
      codigo: '// microservices/api-gateway/server.js\napp.use("/api/auth", proxy("http://auth-service:3001"))\napp.use("/api/grupos", proxy("http://expenses-service:3002"))\napp.use("/api/reportes", proxy("http://reports-service:3003"))\napp.use("/api/notificaciones", proxy("http://notifications-service:3004"))'
    },
    {
      id: 3,
      titulo: '3. Procesamiento en Microservicio',
      emisor: 'API Gateway',
      receptor: 'Microservicio Dedicado (Node / TS)',
      protocolo: 'Arquitectura Hexagonal (Puertos & Adaptadores)',
      detalle: 'El adaptador HTTP extrae el token y valida con Zod. Luego, invoca el Caso de Uso de Dominio (lógica pura sin dependencias de base de datos ni librerías web).',
      codigo: '// backend/src/application/usecases/RegistrarGastoUseCase.ts\nconst nuevoGasto = Gasto.crear({ descripcion, monto, grupoId, pagadorId })\nawait this.gastoRepository.guardar(nuevoGasto)'
    },
    {
      id: 4,
      titulo: '4. Persistencia y Auditoría 5W',
      emisor: 'PostgresRepository',
      receptor: 'PostgreSQL Database (ft_group)',
      protocolo: 'SQL Parametrizado (Pool pg)',
      detalle: 'Se ejecutan transacciones ACID en Postgres. Cada acción crítica dispara la inserción en la tabla auditoria_evento registrando Quién, Qué, Cuándo, Dónde y Por Qué.',
      codigo: '// backend/src/infrastructure/adapters/out/persistence/postgres/PostgresAuditoriaRepository.ts\nINSERT INTO auditoria_evento (actor_email, actor_rol, accion, metodo, ruta, estado_http, motivo)\nVALUES ($1, $2, $3, $4, $5, $6, $7)'
    },
    {
      id: 5,
      titulo: '5. Retorno Reactivo y Fallback Resiliente',
      emisor: 'Backend / Cache Local',
      receptor: 'React UI (Componentes)',
      protocolo: 'JSON Response (200 OK / 201 Created)',
      detalle: 'El frontend recibe los datos normalizados y renderiza los estados sin refrescar la página. Si el backend entra en mantenimiento, el Fallback Resiliente entra en acción de inmediato.',
      codigo: '// Retorno reactivo al componente\nsetEstado(data)\nsetLoading(false)'
    }
  ]

  const servicios = [
    { nombre: 'API Gateway', puerto: '8080 / 3000', rol: 'Puerta de enlace, Proxy inverso y CORS', estado: 'Operativo' },
    { nombre: 'Auth Service', puerto: '3001', rol: 'Autenticación, JWT, Roles y Administración', estado: 'Operativo' },
    { nombre: 'Expenses Service', puerto: '3002', rol: 'Grupos, Gastos compartidos y Balances', estado: 'Operativo' },
    { nombre: 'Reports Service', puerto: '3003', rol: 'KPIs, Analítica y Resúmenes consolidados', estado: 'Operativo' },
    { nombre: 'Notifications Service', puerto: '3004', rol: 'Bandeja de alertas y avisos a integrantes', estado: 'Operativo' },
    { nombre: 'PostgreSQL DB', puerto: '5432', rol: 'Persistencia relacional y Auditoría 5W', estado: 'Operativo' },
  ]

  return (
    <>
      <PageHeader
        title="Flujo de Datos y Relación Back ↔ Front"
        subtitle="Visualización interactiva de la arquitectura desacoplada, ciclo de vida de peticiones y microservicios."
      />

      {/* Mapa interactivo de arquitectura */}
      <section className="section card" style={{ marginBottom: '24px' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="brain" size={20} /> Mapa de Conexión: Frontend ➔ API Gateway ➔ Microservicios ➔ DB
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginTop: '16px'
        }}>
          {servicios.map((s, idx) => (
            <div key={idx} style={{
              background: 'var(--surface-2)',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid var(--line-2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ color: 'var(--text)', fontSize: '14px' }}>{s.nombre}</strong>
                <span style={{
                  fontSize: '11px',
                  background: 'rgba(74, 222, 128, 0.15)',
                  color: 'var(--pos)',
                  padding: '2px 6px',
                  borderRadius: '999px',
                  fontWeight: '600'
                }}>
                  {s.estado}
                </span>
              </div>
              <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--accent-hi)', fontFamily: 'monospace' }}>
                Puerto: {s.puerto}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                {s.rol}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Selector de pasos del flujo */}
      <section className="section card">
        <h2 className="card-title" style={{ marginBottom: '16px' }}>
          Ciclo de Vida de una Transacción (End-to-End)
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {pasos.map(p => (
            <button
              key={p.id}
              className={`btn btn-sm ${pasoActivo === p.id ? 'btn-primary' : 'btn-ghost'}`}
              type="button"
              onClick={() => setPasoActivo(p.id)}
            >
              Etapa {p.id}
            </button>
          ))}
        </div>

        {/* Detalle del paso seleccionado */}
        {(() => {
          const p = pasos.find(item => item.id === pasoActivo) || pasos[0]
          return (
            <div style={{
              background: 'var(--inset)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid var(--line)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0, color: 'var(--accent-hi)', fontSize: '16px' }}>{p.titulo}</h3>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Protocolo: <b>{p.protocolo}</b>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '16px', margin: '14px 0', fontSize: '13px' }}>
                <div><span style={{ color: 'var(--muted)' }}>Origen:</span> <b>{p.emisor}</b></div>
                <div>➔</div>
                <div><span style={{ color: 'var(--muted)' }}>Destino:</span> <b>{p.receptor}</b></div>
              </div>

              <p style={{ color: 'var(--text)', fontSize: '14px', lineHeight: '1.6', margin: '10px 0' }}>
                {p.detalle}
              </p>

              <pre style={{
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#38bdf8',
                overflowX: 'auto',
                fontFamily: 'Consolas, monospace',
                marginTop: '12px'
              }}>
                <code>{p.codigo}</code>
              </pre>
            </div>
          )
        })()}
      </section>
    </>
  )
}
