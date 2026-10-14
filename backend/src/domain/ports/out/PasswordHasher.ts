/**
 * Puerto de salida: el nucleo necesita poder "hashear" y "comparar"
 * contrasenas, pero no debe saber que el mecanismo concreto es Bcrypt
 * (ver seccion 11 / 5.8 "Consideraciones de seguridad" del documento
 * de arquitectura: "Almacenamiento seguro de contrasenas mediante
 * funciones de hash como Bcrypt").
 */
export interface PasswordHasher {
  hash(passwordPlano: string): Promise<string>;
  comparar(passwordPlano: string, passwordHash: string): Promise<boolean>;
}
