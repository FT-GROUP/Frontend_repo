# FT. GROUP — Backend

> **Módulos implementados:** usuarios/autenticación, gestión de grupos, registro de gastos,
> motor de cálculo (divisiones y balances), historial financiero, panel de usuario y
> registro de recibos escaneados. Ver la sección **"Módulos financieros"** al final.

Backend funcional del **Sistema Web de Gestión y División de Gastos Compartidos**
(FT. GROUP, Grupo 2, Universidad de San Buenaventura), implementando el
**módulo de usuarios / autenticación** sobre la **Arquitectura Hexagonal
(Ports & Adapters)** definida en el documento oficial de arquitectura.

**Stack:** Node.js + Express + TypeScript + PostgreSQL + JWT + Bcrypt.

---

## 1. ¿Por qué esta estructura de carpetas?

```
src/
├── domain/                 # NÚCLEO: no depende de Express, ni de pg, ni de JWT
│   ├── entities/            → Usuario (reglas de negocio puras)
│   ├── errors/               → Errores de negocio (EmailYaRegistradoError, etc.)
│   └── ports/
│       ├── in/               → Contratos de los casos de uso (lo que el exterior puede pedir)
│       └── out/               → Contratos que el núcleo exige a la infraestructura
│                                (UsuarioRepository, PasswordHasher, TokenService...)
│
├── application/usecases/   # Capa de aplicación: coordina el dominio y los puertos de salida
│   ├── RegistrarUsuarioUseCaseImpl.ts
│   ├── IniciarSesionUseCaseImpl.ts
│   ├── RefrescarTokenUseCaseImpl.ts
│   ├── CerrarSesionUseCaseImpl.ts
│   └── ObtenerPerfilUseCaseImpl.ts
│
├── infrastructure/          # ADAPTADORES: aquí sí se conocen Express, pg, jsonwebtoken, bcrypt
│   ├── adapters/in/http/     → Adaptador de entrada (API REST)
│   │   ├── controllers/       → Traducen HTTP ↔ casos de uso
│   │   ├── routes/            → Definición de endpoints
│   │   ├── middlewares/       → Validación (Zod), autenticación (JWT), manejo de errores
│   │   └── validators/        → Esquemas de validación de entrada
│   ├── adapters/out/
│   │   ├── persistence/postgres/ → PostgresUsuarioRepository, PostgresRefreshTokenRepository
│   │   └── security/              → BcryptPasswordHasher, JwtTokenService
│   └── config/
│       ├── env.ts             → Único lugar que lee variables de entorno
│       ├── container.ts       → "Composition root": conecta puertos con adaptadores
│       └── runMigrations.ts   → Ejecuta los .sql de db/migrations
│
├── app.ts                   # Configuración de Express (middlewares, rutas)
└── server.ts                # Punto de entrada: conecta a la BD y levanta el servidor

db/migrations/               # SQL de las tablas usuario y refresh_token
tests/unit/                  # Pruebas de los casos de uso con MOCKS de los puertos
```

**Regla de oro de esta arquitectura:** el código dentro de `domain/` y
`application/` nunca debería tener un `import` de `express`, `pg`,
`bcrypt` ni `jsonwebtoken`. Todo lo que el núcleo necesita del exterior
pasa por una interfaz (`ports/out`), y quien la implementa vive en
`infrastructure/`.

---

## 2. Requisitos previos

- Node.js 18 o superior
- PostgreSQL 14+ (local, o vía Docker)

## 3. Puesta en marcha

```bash
# 1) Instalar dependencias
npm install

# 2) Configurar variables de entorno
cp .env.example .env
# Editar .env: como mínimo, cambia JWT_SECRET por un valor propio.
#   Puedes generar uno con: openssl rand -base64 48

# 3) Levantar PostgreSQL
#    Opción A: con Docker (recomendado)
docker compose up -d

#    Opción B: usar un PostgreSQL que ya tengas instalado localmente,
#    ajustando DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME en .env

# 4) Ejecutar las migraciones (crea las tablas usuario y refresh_token)
npm run migrate:dev

# 5) Levantar el servidor en modo desarrollo (recarga automática)
npm run dev
```

El servidor queda escuchando en `http://localhost:3000` (o el `PORT` que
hayas definido). Puedes verificar que está vivo con:

```bash
curl http://localhost:3000/health
```

### Para producción

```bash
npm run build      # compila TypeScript a dist/
npm run migrate     # ejecuta migraciones usando el build compilado
npm start           # node dist/server.js
```

---

## 4. Endpoints del módulo de usuarios

Todos los cuerpos de petición/respuesta son JSON.

| Método | Ruta                  | Descripción                                    | Requiere token |
|--------|-----------------------|------------------------------------------------|:--------------:|
| POST   | `/api/auth/registro`  | Registra un nuevo usuario                       | No             |
| POST   | `/api/auth/login`     | Inicia sesión y devuelve access + refresh token | No             |
| POST   | `/api/auth/refresh`   | Renueva el access token (rota el refresh token) | No             |
| POST   | `/api/auth/logout`    | Revoca un refresh token                         | No             |
| GET    | `/api/auth/me`        | Devuelve el perfil del usuario autenticado      | Sí (Bearer)    |
| GET    | `/health`             | Chequeo de salud del servicio                   | No             |

### Ejemplos con `curl`

**Registrar usuario**
```bash
curl -X POST http://localhost:3000/api/auth/registro \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana Torres","email":"ana@example.com","password":"claveSegura123"}'
```

**Iniciar sesión**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","password":"claveSegura123"}'
```
Respuesta:
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "d67548781...",
  "usuario": { "id": 1, "nombre": "Ana Torres", "email": "ana@example.com", "...": "..." }
}
```

**Consultar perfil (ruta protegida)**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

**Renovar el access token**
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```

**Cerrar sesión**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```

---

## 5. Seguridad implementada

Conforme a la sección "Consideraciones de seguridad" del documento de
arquitectura:

- Contraseñas con hash **Bcrypt** (12 salt rounds), nunca en texto plano.
- **JWT** de corta duración (15 min por defecto) para el access token.
- **Refresh token** opaco (no JWT), persistido en BD, con expiración (7
  días) y **revocación**; se **rota** en cada uso (`/refresh` invalida
  el token usado y entrega uno nuevo).
- Validación y saneamiento de entradas con **Zod** antes de llegar a la
  lógica de negocio.
- Cabeceras HTTP endurecidas con **Helmet**.
- Consultas SQL **parametrizadas** (sin concatenación de strings) para
  evitar inyección SQL.
- Mensajes de error de login genéricos ("correo o contraseña
  incorrectos") para no revelar si un correo está registrado.
- Límite de tamaño de payload JSON (100kb) para mitigar abusos.

## 6. Pruebas

```bash
npm test
```

Las pruebas unitarias (`tests/unit/`) ejercitan los casos de uso
(`RegistrarUsuarioUseCaseImpl`, `IniciarSesionUseCaseImpl`) usando
**dobles de prueba (mocks)** de los puertos de salida — no requieren
una base de datos real. Esto demuestra en la práctica el atributo de
"Testabilidad" señalado en el documento de arquitectura como una de
las ventajas del enfoque hexagonal.

## 7. Cómo extender este backend (próximos módulos)

Para agregar el siguiente módulo (p. ej. **Grupos**), el patrón a
seguir es siempre el mismo:

1. **Dominio:** crear la entidad (`Grupo`) y sus errores en `domain/`.
2. **Puertos:** definir `GrupoRepository` (`ports/out`) y los casos de
   uso como interfaces (`ports/in`).
3. **Aplicación:** implementar los casos de uso (`CrearGrupoUseCaseImpl`, etc.)
   usando solo los puertos, nunca `pg` o `express` directamente.
4. **Infraestructura:** implementar `PostgresGrupoRepository`, agregar
   la migración SQL, el controlador HTTP y las rutas.
5. **Conectar:** registrar las nuevas instancias en `container.ts`.

Esto mantiene la promesa central de la arquitectura elegida: el
dominio y los casos de uso nunca cambian por cambios de infraestructura.


---

## Módulos financieros (grupos, gastos, balances, historial)

### Tablas nuevas (migraciones 003–005)

| Migración | Tablas |
|---|---|
| `003_create_grupo.sql` | `grupo`, `miembro_grupo` |
| `004_create_gasto.sql` | `gasto`, `division_gasto`, `balance` |
| `005_create_historial_recibo_notificacion.sql` | `historial_movimiento`, `recibo_escaneado`, `notificacion` |

Las migraciones usan `IF NOT EXISTS`, así que `npm run migrate:dev` se puede volver a ejecutar sin perder datos.

Extensiones respecto al documento técnico: `grupo` tiene además `icono`, `ciudad`, `latitud` y `longitud` (para las tarjetas y el mapa), y `historial_movimiento` admite también `grupo_creado` y `gasto_eliminado`.

### Qué se guarda y cuándo

| Acción en la interfaz | Tablas afectadas |
|---|---|
| Crear grupo | `grupo`, `miembro_grupo` (creador = administrador), `historial_movimiento`, `notificacion` |
| Agregar integrante | `miembro_grupo`, `historial_movimiento`, `notificacion` |
| Agregar gasto | `gasto`, `division_gasto` (una fila por participante), `balance` (recalculado), `historial_movimiento`, `notificacion` |
| Gasto desde recibo escaneado | Lo anterior + `recibo_escaneado` |
| "Pagué" / "Recibido" | `division_gasto.estado_pago = 'pagado'`, `balance`, `historial_movimiento` |
| Liquidar deuda (panel) | `division_gasto` entre las dos personas, `balance`, `historial_movimiento` |
| Eliminar gasto | borra `gasto` y sus `division_gasto`, recalcula `balance` |

### Endpoints (requieren `Authorization: Bearer <accessToken>`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/panel/resumen` | Balance neto, te deben, debes, liquidaciones y grupos |
| GET | `/api/grupos` | Grupos activos del usuario con miembros, totales y balance |
| POST | `/api/grupos` | Crear grupo `{ nombre, descripcion?, icono?, ciudad?, lat?, lng?, integrantes: [{ email }] }` |
| POST | `/api/grupos/:id/miembros` | Agregar integrante `{ email }` (solo administrador) |
| DELETE | `/api/grupos/:id` | Archivar grupo (solo administrador) |
| GET | `/api/gastos` | Gastos de mis grupos con divisiones y "mi parte" |
| POST | `/api/gastos` | Registrar gasto `{ grupo_id, pagador_id, descripcion, monto_total, fecha_gasto, categoria, tipo_division, divisiones: [{ usuario_id, monto_asignado? }], origen_registro?, recibo? }` |
| DELETE | `/api/gastos/:id` | Eliminar gasto (quien pagó o el administrador) |
| POST | `/api/gastos/:id/pagar` | Marcar pagada una parte `{ usuario_id? }` (el deudor o quien pagó) |
| POST | `/api/balances/liquidar` | Saldar el balance entre dos personas `{ grupo_id, de, para }` |
| GET | `/api/historial?limite=50` | Movimientos de `historial_movimiento` de mis grupos |

### Reglas de negocio (motor de cálculo)

- Los integrantes de un grupo deben ser **usuarios registrados**: se agregan por su correo.
- Solo los miembros activos de un grupo pueden ver o registrar sus gastos (403 en otro caso).
- División **equitativa**: el servidor reparte el monto sin perder pesos por redondeo.
- División **personalizada**: la suma de las partes debe ser igual al monto total (400 si no).
- La parte de quien pagó queda marcada como pagada desde el inicio.
- `balance` guarda el **saldo neto por pares** en cada grupo (si A le debe 100 a B y B le debe 30 a A, queda A → B: 70). Se recalcula después de cada cambio.

La lógica pura está en `src/domain/services/MotorCalculo.ts` y tiene pruebas en `tests/unit/MotorCalculo.test.ts`.
