export class ErrorDeDominio extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = this.constructor.name;
  }
}
export class AccesoDenegadoError extends ErrorDeDominio {
  constructor(mensaje = 'No tienes permiso para consultar esta informacion.') {
    super(mensaje);
  }
}
export class TokenInvalidoError extends ErrorDeDominio {}
