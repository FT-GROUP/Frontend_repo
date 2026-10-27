/**
 * Variables de entorno para las pruebas de integracion. Se cargan antes de
 * importar la app (env.ts lee process.env al importarse). Cualquier valor
 * ya definido en el entorno (por ejemplo en CI) tiene prioridad.
 */
const valores: Record<string, string> = {
  NODE_ENV: 'test',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USER: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_NAME: 'ft_group_test',
  DB_POOL_MAX: '5',
  JWT_SECRET: 'secreto-solo-para-pruebas-de-integracion-0123456789',
  JWT_EXPIRATION: '15m',
  CORS_ORIGIN: 'http://localhost:5173',
  IA_LIMITE_POR_HORA: '3',
  IA_MAX_MB: '1',
  LOGIN_MAX_INTENTOS: '5',
  LOGIN_VENTANA_MINUTOS: '15',
};

for (const [clave, valor] of Object.entries(valores)) {
  process.env[clave] ??= valor;
}
// La IA se prueba con un extractor falso: nunca se llama a OpenAI/Claude.
// Se dejan vacias (no se borran) para que dotenv no las tome de un .env local:
// dotenv nunca sobrescribe variables que ya existen.
process.env.OPENAI_API_KEY = '';
process.env.ANTHROPIC_API_KEY = '';
