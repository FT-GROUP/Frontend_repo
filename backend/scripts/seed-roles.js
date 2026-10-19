const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const bcrypt = require('bcrypt')
const { Pool } = require('pg')

if (process.env.NODE_ENV === 'production') {
  throw new Error('Las cuentas de prueba no se pueden crear en producción.')
}

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'ft_group',
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    })

const usuarios = [
  {
    nombre: 'Moderador de prueba',
    email: 'moderador@ftgroup.test',
    password: 'Moderador2026!',
    rol: 'moderador',
  },
  {
    nombre: 'Supervisor de prueba',
    email: 'supervisor@ftgroup.test',
    password: 'Supervisor2026!',
    rol: 'supervisor',
  },
  {
    nombre: 'Usuario común de prueba',
    email: 'usuario@ftgroup.test',
    password: 'Usuario2026!',
    rol: 'usuario',
  },
]

async function crearUsuariosDePrueba() {
  try {
    for (const usuario of usuarios) {
      const passwordHash = await bcrypt.hash(usuario.password, 12)
      await pool.query(
        `INSERT INTO usuario (nombre, email, password_hash, estado, rol)
         VALUES ($1, $2, $3, 'activo', $4)
         ON CONFLICT (email) DO UPDATE SET
           nombre = EXCLUDED.nombre,
           password_hash = EXCLUDED.password_hash,
           estado = 'activo',
           rol = EXCLUDED.rol`,
        [usuario.nombre, usuario.email, passwordHash, usuario.rol],
      )
      console.log(`Cuenta ${usuario.rol} lista: ${usuario.email}`)
    }
    console.log('Contraseñas de desarrollo: Moderador2026!, Supervisor2026! y Usuario2026!')
  } finally {
    await pool.end()
  }
}

crearUsuariosDePrueba().catch((error) => {
  console.error('No fue posible crear las cuentas de prueba:', error)
  process.exitCode = 1
})
