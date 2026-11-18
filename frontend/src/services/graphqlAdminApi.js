import { queryGraphQL } from './graphqlApi.js';

/**
 * Operaciones GraphQL exclusivas del personal (moderador y supervisor).
 * Viven en un módulo aparte para que solo se carguen en las páginas
 * de administración y supervisión, que se descargan bajo demanda.
 * El backend sigue exigiendo el rol en cada operación.
 */
export const graphqlAdminApi = {  /**
   * Consulta usuarios combinando Base de Datos Activa y Cold Storage (Inactivos)
   */
  async obtenerUsuarios(estado = null) {
    const query = `
      query ObtenerUsuarios($estado: EstadoUsuario) {
        usuarios(estado: $estado) {
          id
          nombre
          email
          rol
          estado
          fechaRegistro
          origenBaseDatos
        }
      }
    `;
    const data = await queryGraphQL(query, { estado });
    return (data?.usuarios || []).map(usuario => ({ ...usuario, id: Number(usuario.id) }));
  },

  async obtenerFinanzasUsuario(usuarioId, { limite = 50, offset = 0 } = {}) {
    const query = `
      query FinanzasUsuario($usuarioId: ID!, $limite: Int!, $offset: Int!) {
        finanzasUsuario(usuarioId: $usuarioId, limite: $limite, offset: $offset) {
          usuario { id nombre email rol estado fechaRegistro }
          resumen { grupos gastos montoPagado montoAsignado montoPendiente }
          grupos {
            id
            nombre
            estado
            rol
            fechaUnion
            fechaCreacion
            numeroGastos
          }
          gastos {
            id
            grupoId
            grupo
            pagadorId
            pagador
            descripcion
            montoTotal
            fechaGasto
            categoria
            montoAsignado
            estadoPago
            fechaPago
          }
          paginacion { limite offset total }
        }
      }
    `;
    const data = await queryGraphQL(query, { usuarioId: String(usuarioId), limite, offset });
    return data?.finanzasUsuario;
  },

  async cambiarEstadoUsuario(usuarioId, estado) {
    const query = `
      mutation CambiarEstadoUsuario($usuarioId: ID!, $estado: EstadoUsuario!) {
        cambiarEstadoUsuario(usuarioId: $usuarioId, estado: $estado) {
          id nombre email rol estado fechaRegistro origenBaseDatos
        }
      }
    `;
    const data = await queryGraphQL(query, { usuarioId: String(usuarioId), estado });
    return { ...data.cambiarEstadoUsuario, id: Number(data.cambiarEstadoUsuario.id) };
  },

  async cambiarRolUsuario(usuarioId, rol) {
    const query = `
      mutation CambiarRolUsuario($usuarioId: ID!, $rol: RolUsuario!) {
        cambiarRolUsuario(usuarioId: $usuarioId, rol: $rol) {
          id nombre email rol estado fechaRegistro origenBaseDatos
        }
      }
    `;
    const data = await queryGraphQL(query, { usuarioId: String(usuarioId), rol });
    return { ...data.cambiarRolUsuario, id: Number(data.cambiarRolUsuario.id) };
  },

  /**
   * Desactiva un usuario trasladandolo a la BD historica / cold storage
   */
  async desactivarUsuario(usuarioId) {
    const query = `
      mutation Desactivar($usuarioId: ID!) {
        desactivarUsuario(usuarioId: $usuarioId) {
          id
          nombre
          estado
          origenBaseDatos
        }
      }
    `;
    const data = await queryGraphQL(query, { usuarioId: String(usuarioId) });
    return data?.desactivarUsuario;
  },
};
