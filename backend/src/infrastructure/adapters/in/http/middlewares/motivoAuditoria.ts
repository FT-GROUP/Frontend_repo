const MOTIVOS_AUTENTICACION: Record<string, string> = {
  '/api/auth/registro': 'Crear una cuenta para habilitar el acceso al sistema.',
  '/api/auth/login': 'Verificar la identidad y crear una sesión.',
  '/api/auth/refresh': 'Renovar una sesión autenticada.',
  '/api/auth/logout': 'Cerrar la sesión y revocar el token de renovación.',
  '/api/auth/me': 'Consultar o actualizar el perfil propio.',
  '/api/estado': 'Comprobar la disponibilidad de la API y la base de datos.',
  '/api/auditoria': 'Consultar la bitácora para supervisar la actividad.',
}

const RECURSOS: Record<string, string> = {
  administracion: 'cuentas y permisos',
  auditoria: 'bitácora de auditoría',
  estado: 'estado de los servicios',
  grupos: 'grupos y gastos compartidos',
  notificaciones: 'notificaciones',
  reportes: 'reportes financieros',
  soporte: 'tickets de soporte al cliente',
  asistente: 'el asistente de soporte con IA',
}

// El "por que" de cada operacion de GraphQL. Una entrada que solo diga
// "POST /graphql" no cumple la regla 5W: no explica que se hizo.
const MOTIVOS_GRAPHQL: Record<string, string> = {
  usuarios: 'Consultar el listado de cuentas activas o historicas.',
  misGrupos: 'Consultar los grupos propios del usuario.',
  gruposArchivados: 'Consultar los grupos archivados.',
  yo: 'Consultar el consolidado financiero propio.',
  archivarGrupo: 'Archivar un grupo y moverlo a la base historica.',
  desactivarUsuario: 'Desactivar una cuenta y moverla a la base historica.',
}

export function motivoSolicitudAuditoria(
  metodo: string,
  ruta: string,
  operacionGraphql?: string | null,
): string {
  if (ruta === '/graphql') {
    if (operacionGraphql && MOTIVOS_GRAPHQL[operacionGraphql]) {
      return MOTIVOS_GRAPHQL[operacionGraphql]!
    }
    return operacionGraphql
      ? `Ejecutar la operacion "${operacionGraphql}" sobre la API GraphQL.`
      : 'Ejecutar una operacion sobre la API GraphQL.'
  }

  const motivoEspecifico = MOTIVOS_AUTENTICACION[ruta]
  if (motivoEspecifico) return motivoEspecifico

  const recursoRuta = ruta.split('/').filter(Boolean)[1]
  const recurso = RECURSOS[recursoRuta] ?? 'un recurso de la aplicación'
  const verbo = metodo.toUpperCase()

  if (verbo === 'GET') return `Consultar ${recurso} para atender una solicitud autenticada.`
  if (verbo === 'POST') return `Crear o ejecutar una operación sobre ${recurso}.`
  if (verbo === 'PUT' || verbo === 'PATCH') return `Actualizar ${recurso} mediante una operación autorizada.`
  if (verbo === 'DELETE') return `Eliminar o desactivar un elemento de ${recurso}.`
  return `Registrar una solicitud autenticada sobre ${recurso}.`
}
