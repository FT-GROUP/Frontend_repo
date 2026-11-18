import { request, GRAPHQL_URL, ApiError } from './http.js';

/**
 * Cliente para consultas GraphQL contra el endpoint /graphql.
 * Permite seleccionar campos especificos evitando el over-fetching.
 */
export async function queryGraphQL(query, variables = {}) {
  let respuesta;
  try {
    respuesta = await request(GRAPHQL_URL, {
      method: 'POST',
      auth: true,
      body: { query, variables },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;

    console.error(JSON.stringify({
      level: 'error',
      type: 'graphql_request_failed',
      errorName: error instanceof Error ? error.name : 'Error',
    }));
    throw new ApiError('No fue posible completar la solicitud GraphQL.', 0);
  }

  if (respuesta?.errors && respuesta.errors.length > 0) {
    const error = respuesta.errors[0];
    const codigo = error?.extensions?.code;
    const estados = {
      UNAUTHENTICATED: 401,
      FORBIDDEN: 403,
      BAD_USER_INPUT: 400,
      NOT_FOUND: 404,
      CONFLICT: 409,
      SERVICE_UNAVAILABLE: 503,
      INTERNAL_SERVER_ERROR: 500,
    };
    throw new ApiError(
      error?.message || 'Error en la consulta GraphQL',
      estados[codigo] || 400,
      respuesta.errors,
    )
  }

  return respuesta?.data;
}

export const graphqlApi = {
  async obtenerYo() {
    const data = await queryGraphQL('query { yo { id nombre email rol estado fechaRegistro } }');
    return data?.yo ? { ...data.yo, id: Number(data.yo.id) } : null;
  },

  async obtenerGruposArchivados() {
    const data = await queryGraphQL(`
      query {
        gruposArchivados {
          id
          nombre
          descripcion
          estado
          fechaCreacion
        }
      }
    `);
    return data?.gruposArchivados || [];
  },

  /**
   * Consulta grupos activos con GraphQL
   */
  async obtenerMisGrupos() {
    const query = `
      query {
        misGrupos {
          id
          nombre
          descripcion
          rol
          moneda
          tasaCop
          instruccionesPago
          miembrosActivos
          fechaCreacion
          icono
          ciudad
          totalGastos
          numGastos
          miBalance
          miembros {
            id
            nombre
            email
            rol
          }
        }
      }
    `;
    const data = await queryGraphQL(query);
    return (data?.misGrupos || []).map(grupo => ({
      ...grupo,
      total_gastos: grupo.totalGastos,
      num_gastos: grupo.numGastos,
      mi_balance: grupo.miBalance,
    }));
  },

  async obtenerMiPanel() {
    const query = `
      query ObtenerMiPanel {
        miPanel {
          teDeben
          debes
          balance
          grupos {
            id
            nombre
            descripcion
            rol
            moneda
            tasaCop
            instruccionesPago
            miembrosActivos
            fechaCreacion
            icono
            ciudad
            totalGastos
            numGastos
            miBalance
            miembros {
              id
              nombre
              email
              rol
            }
          }
          liquidaciones {
            grupo_id
            grupo
            de
            para
            monto
            montoGrupo
            moneda
            tasaCop
            deUsuario { id nombre }
            paraUsuario { id nombre }
          }
        }
      }
    `;
    const data = await queryGraphQL(query);
    const panel = data?.miPanel;
    if (!panel) return null;
    return {
      ...panel,
      grupos: (panel.grupos || []).map(grupo => ({
        ...grupo,
        total_gastos: grupo.totalGastos,
        num_gastos: grupo.numGastos,
        mi_balance: grupo.miBalance,
      })),
    };
  },

  /**
   * Archiva un grupo y lo transfiere a la base de datos historica
   */
  async archivarGrupo(grupoId) {
    const query = `
      mutation Archivar($grupoId: ID!) {
        archivarGrupo(grupoId: $grupoId)
      }
    `;
    const data = await queryGraphQL(query, { grupoId: String(grupoId) });
    return data?.archivarGrupo;
  },
};
