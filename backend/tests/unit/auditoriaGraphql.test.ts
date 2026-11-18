import {
  nombreOperacionGraphql,
  respuestaGraphqlTieneErrores,
} from '../../src/infrastructure/adapters/in/http/middlewares/authMiddleware';
import { motivoSolicitudAuditoria } from '../../src/infrastructure/adapters/in/http/middlewares/motivoAuditoria';

/**
 * GraphQL no quedaba registrado en la bitacora porque el middleware solo
 * cubria /api/. Sus mutaciones archivan grupos y desactivan cuentas, asi
 * que era un camino para ejecutar acciones administrativas sin rastro.
 * Estas pruebas cubren la parte que se puede verificar sin levantar la
 * aplicacion: de donde sale el nombre de la operacion y su motivo.
 */
describe('auditoria de operaciones GraphQL', () => {
  describe('nombreOperacionGraphql', () => {
    it('prefiere operationName cuando el cliente lo envia', () => {
      expect(nombreOperacionGraphql({ operationName: 'archivarGrupo', query: '{ otraCosa }' }))
        .toBe('archivarGrupo');
    });

    it('toma el primer campo de una consulta anonima', () => {
      expect(nombreOperacionGraphql({ query: 'query { misGrupos { nombre } }' }))
        .toBe('misGrupos');
      expect(nombreOperacionGraphql({ query: '{ yo { totalGastos } }' })).toBe('yo');
    });

    it('reconoce una mutacion con nombre y variables', () => {
      const query = 'mutation Desactivar($id: ID!) { desactivarUsuario(usuarioId: $id) { id } }';
      expect(nombreOperacionGraphql({ query })).toBe('desactivarUsuario');
    });

    it('ignora un operationName que no sea un identificador valido', () => {
      // Evita que un cliente inyecte texto arbitrario en la bitacora.
      expect(nombreOperacionGraphql({ operationName: 'DROP TABLE usuario; --', query: '{ yo }' }))
        .toBe('yo');
    });

    it('acota la longitud del nombre', () => {
      const largo = 'a'.repeat(200);
      expect(nombreOperacionGraphql({ operationName: largo })!.length).toBe(60);
    });

    it('devuelve null cuando no hay nada reconocible', () => {
      expect(nombreOperacionGraphql(null)).toBeNull();
      expect(nombreOperacionGraphql({})).toBeNull();
      expect(nombreOperacionGraphql({ query: 123 })).toBeNull();
    });

    it('nunca devuelve la consulta completa', () => {
      const query = 'query { usuarios(estado: "activo") { email nombre rol } }';
      const nombre = nombreOperacionGraphql({ query })!;
      expect(nombre).toBe('usuarios');
      expect(nombre).not.toContain('email');
    });
  });

  describe('respuestaGraphqlTieneErrores', () => {
    // GraphQL responde 200 aunque rechace la operacion, asi que el estado
    // HTTP no distingue un intento bloqueado de una accion consumada.
    it('detecta una operacion rechazada por el resolver', () => {
      const cuerpo = JSON.stringify({
        errors: [{ message: 'No puede desactivar su propia cuenta.' }],
        data: { desactivarUsuario: null },
      });
      expect(respuestaGraphqlTieneErrores(cuerpo)).toBe(true);
    });

    it('no marca una operacion exitosa', () => {
      expect(respuestaGraphqlTieneErrores(JSON.stringify({ data: { misGrupos: [] } }))).toBe(false);
    });

    it('no marca un arreglo de errores vacio', () => {
      expect(respuestaGraphqlTieneErrores(JSON.stringify({ errors: [], data: {} }))).toBe(false);
    });

    it('no se confunde con la palabra "errors" dentro de los datos', () => {
      const cuerpo = JSON.stringify({ data: { misGrupos: [{ nombre: 'errors' }] } });
      expect(respuestaGraphqlTieneErrores(cuerpo)).toBe(false);
    });

    it('tolera un cuerpo que no sea JSON valido', () => {
      expect(respuestaGraphqlTieneErrores('{"errors": roto')).toBe(false);
      expect(respuestaGraphqlTieneErrores('')).toBe(false);
    });
  });

  describe('motivo de las operaciones GraphQL', () => {
    it('explica el proposito de cada operacion conocida', () => {
      expect(motivoSolicitudAuditoria('POST', '/graphql', 'desactivarUsuario'))
        .toBe('Desactivar una cuenta y moverla a la base historica.');
      expect(motivoSolicitudAuditoria('POST', '/graphql', 'archivarGrupo'))
        .toBe('Archivar un grupo y moverlo a la base historica.');
    });

    it('nombra la operacion aunque no este en el catalogo', () => {
      expect(motivoSolicitudAuditoria('POST', '/graphql', 'operacionNueva'))
        .toContain('operacionNueva');
    });

    it('da un motivo generico si no se pudo identificar la operacion', () => {
      expect(motivoSolicitudAuditoria('POST', '/graphql', null))
        .toBe('Ejecutar una consulta o mutación GraphQL autorizada.');
    });

    it('no altera los motivos de las rutas REST', () => {
      expect(motivoSolicitudAuditoria('GET', '/api/estado'))
        .toBe('Comprobar la disponibilidad de la API y la base de datos.');
      expect(motivoSolicitudAuditoria('POST', '/api/grupos/:grupoId/gastos'))
        .toBe('Crear o ejecutar una operación sobre grupos y gastos compartidos.');
    });
  });
});
