const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const argon2 = require('argon2')
const { Pool } = require('pg')

if (process.env.NODE_ENV === 'production') {
  throw new Error('Las cuentas de prueba no se pueden crear en producción.')
}

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'ft_group',
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    })

const usuarios = [
  {
    nombre: 'Moderador de prueba',
    email: 'moderador@ftgroup.test',
    password: 'Moderador2026!',
    rol: 'moderador',
    ftScore: 850,
    nivel: 'Oro',
  },
  {
    nombre: 'Supervisor de prueba',
    email: 'supervisor@ftgroup.test',
    password: 'Supervisor2026!',
    rol: 'supervisor',
    ftScore: 920,
    nivel: 'Diamante',
  },
  {
    nombre: 'Usuario común de prueba',
    email: 'usuario@ftgroup.test',
    password: 'Usuario2026!',
    rol: 'usuario',
    ftScore: 780,
    nivel: 'Plata',
  },
]

// FT-Score inicial de la cuenta de prueba (tabla creada por la migración 011).
// Si todavía no se ha migrado, se omite sin detener el seed.
async function asignarFtScore(usuarioId, ftScore, nivel) {
  try {
    await pool.query(
      `INSERT INTO usuario_ft_score (usuario_id, ft_score, nivel)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id) DO UPDATE SET ft_score = EXCLUDED.ft_score, nivel = EXCLUDED.nivel`,
      [usuarioId, ftScore, nivel],
    )
  } catch (error) {
    if (error && typeof error === 'object' && error.code === '42P01') {
      console.warn('Tabla usuario_ft_score no existe: ejecuta las migraciones para asignar el FT-Score.')
      return
    }
    throw error
  }
}

async function crearUsuariosDePrueba() {
  try {
    for (const usuario of usuarios) {
      const passwordHash = await argon2.hash(usuario.password, {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      })
      const { rows } = await pool.query(
        `INSERT INTO usuario (nombre, email, password_hash, estado, rol)
         VALUES ($1, $2, $3, 'activo', $4)
         ON CONFLICT (email) DO UPDATE SET
           nombre = EXCLUDED.nombre,
           password_hash = EXCLUDED.password_hash,
           estado = 'activo',
           rol = EXCLUDED.rol
         RETURNING id`,
        [usuario.nombre, usuario.email, passwordHash, usuario.rol],
      )
      await asignarFtScore(rows[0].id, usuario.ftScore, usuario.nivel)
      console.log(`Cuenta ${usuario.rol} lista: ${usuario.email}`)
    }
    console.log('Las cuentas de prueba quedaron listas.')
  } finally {
    await pool.end()
  }
}

crearUsuariosDePrueba().catch((error) => {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    type: 'demo_seed_failed',
    code,
  }))
  process.exitCode = 1
})
