import {
  iniciarSesionSchema,
  registrarUsuarioSchema,
} from '../../src/infrastructure/adapters/in/http/validators/authValidators';

describe('validadores de autenticacion', () => {
  const registroValido = {
    nombre: 'Jheinson Gutierrez',
    email: 'jheinson@example.com',
    password: 'ClaveSegura2026',
  };

  describe('contrasena en el registro', () => {
    it('acepta una contrasena sin espacios', () => {
      expect(registrarUsuarioSchema.parse(registroValido).password).toBe('ClaveSegura2026');
    });

    it.each([
      ['un espacio en medio', 'Clave Segura2026'],
      ['un espacio al principio', ' ClaveSegura2026'],
      ['un espacio al final', 'ClaveSegura2026 '],
      ['varios espacios', 'Clave Segura 2026'],
      ['un tabulador', 'Clave\tSegura2026'],
      ['un salto de linea', 'Clave\nSegura2026'],
    ])('rechaza una contrasena con %s', (_caso, password) => {
      const resultado = registrarUsuarioSchema.safeParse({ ...registroValido, password });
      expect(resultado.success).toBe(false);
      if (!resultado.success) {
        expect(resultado.error.errors.some((e) => e.message.includes('espacios'))).toBe(true);
      }
    });

    it('sigue exigiendo al menos 8 caracteres', () => {
      const resultado = registrarUsuarioSchema.safeParse({ ...registroValido, password: 'Corta1' });
      expect(resultado.success).toBe(false);
    });

    it('sigue rechazando mas de 72 caracteres', () => {
      const resultado = registrarUsuarioSchema.safeParse({
        ...registroValido,
        password: 'a'.repeat(73),
      });
      expect(resultado.success).toBe(false);
    });

    it('no recorta la contrasena: la guarda tal cual se escribio', () => {
      const password = 'Clave-Con-Guiones_2026';
      expect(registrarUsuarioSchema.parse({ ...registroValido, password }).password).toBe(password);
    });
  });

  describe('contrasena en el inicio de sesion', () => {
    // Las cuentas creadas antes de la regla pueden tener espacios; si el
    // login tambien las rechazara, esas personas quedarian bloqueadas.
    it('acepta una contrasena con espacios para no bloquear cuentas antiguas', () => {
      const resultado = iniciarSesionSchema.safeParse({
        email: 'jheinson@example.com',
        password: 'clave con espacios',
      });
      expect(resultado.success).toBe(true);
    });

    it('rechaza una contrasena vacia', () => {
      const resultado = iniciarSesionSchema.safeParse({
        email: 'jheinson@example.com',
        password: '',
      });
      expect(resultado.success).toBe(false);
    });
  });

  describe('normalizacion del resto de campos', () => {
    it('recorta el nombre y pasa el correo a minusculas', () => {
      const datos = registrarUsuarioSchema.parse({
        ...registroValido,
        nombre: '  Jheinson Gutierrez  ',
        email: '  Jheinson@Example.COM  ',
      });
      expect(datos.nombre).toBe('Jheinson Gutierrez');
      expect(datos.email).toBe('jheinson@example.com');
    });

    it('rechaza un correo con formato invalido', () => {
      const resultado = registrarUsuarioSchema.safeParse({ ...registroValido, email: 'sin-arroba' });
      expect(resultado.success).toBe(false);
    });
  });
});
