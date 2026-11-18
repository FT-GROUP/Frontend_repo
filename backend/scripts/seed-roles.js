require('dotenv').config();
const argon2 = require('argon2');
const { Pool } = require('pg');

// Estas cuentas tienen contraseñas conocidas (están en el repositorio).
// Nunca deben crearse en producción: el script se niega salvo que se
// pida explícitamente y con contraseñas propias definidas en el entorno.
if (process.env.NODE_ENV === 'production' && process.env.PERMITIR_SEED_ROLES !== 'true') {
  console.error('❌ seed-roles está bloqueado con NODE_ENV=production.');
  console.error('   Las cuentas de prueba usan contraseñas públicas. Si de verdad necesitas');
  console.error('   crearlas, define PERMITIR_SEED_ROLES=true y SEED_PASSWORD_USUARIO,');
  console.error('   SEED_PASSWORD_MODERADOR y SEED_PASSWORD_SUPERVISOR.');
  process.exit(1);
}
const enProduccion = process.env.NODE_ENV === 'production';
function contrasena(variable, porDefecto) {
  const valor = process.env[variable];
  if (valor) return valor;
  if (enProduccion) {
    console.error(`❌ Falta ${variable}: en producción no se usan las contraseñas por defecto.`);
    process.exit(1);
  }
  return porDefecto;
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ft_group'
});

async function seed() {
  console.log('🌱 Ejecutando Seeder de Usuarios y Roles de Prueba...');
  try {
    // Roles de prueba
    const users = [
      { email: 'usuario@ftgroup.test', nombre: 'Carlos Usuario', password: contrasena('SEED_PASSWORD_USUARIO', 'Usuario2026!'), rol: 'usuario', score: 780, nivel: 'Plata' },
      { email: 'moderador@ftgroup.test', nombre: 'Ana Moderadora', password: contrasena('SEED_PASSWORD_MODERADOR', 'Moderador2026!'), rol: 'moderador', score: 850, nivel: 'Oro' },
      { email: 'supervisor@ftgroup.test', nombre: 'Sanny Supervisora', password: contrasena('SEED_PASSWORD_SUPERVISOR', 'Supervisor2026!'), rol: 'supervisor', score: 920, nivel: 'Diamante' }
    ];

    for (const u of users) {
      const passwordHash = await argon2.hash(u.password);
      const usuario = await pool.query(
        `INSERT INTO usuario (email, nombre, password_hash, rol, estado)
         VALUES ($1, $2, $3, $4, 'activo')
         ON CONFLICT (email) DO UPDATE
         SET nombre = EXCLUDED.nombre, password_hash = EXCLUDED.password_hash,
             rol = EXCLUDED.rol, estado = 'activo'
         RETURNING id`,
        [u.email, u.nombre, passwordHash, u.rol]
      );
      
      await pool.query(
        `INSERT INTO usuario_ft_score (usuario_id, ft_score, nivel) 
         VALUES ($1, $2, $3)
         ON CONFLICT (usuario_id) DO UPDATE SET ft_score = $2, nivel = $3;`,
        [usuario.rows[0].id, u.score, u.nivel]
      );
    }
    console.log('✅ Usuarios de prueba creados exitosamente:');
    console.log(' - Usuario Común: usuario@ftgroup.test (Rol: usuario)');
    console.log(' - Moderador: moderador@ftgroup.test (Rol: moderador)');
    console.log(' - Supervisor: supervisor@ftgroup.test (Rol: supervisor)');
  } catch (err) {
    console.error('Error en seeder:', err);
  } finally {
    await pool.end();
  }
}

seed();
