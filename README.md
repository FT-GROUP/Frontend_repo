# FT. GROUP — Backend + Frontend inicial

Proyecto integrado para la primera versión del sistema web de gestión y división de gastos compartidos.

## Incluye

### Backend
- Node.js + Express + TypeScript.
- PostgreSQL.
- Arquitectura hexagonal.
- Módulo de usuarios.
- Registro, login, refresh, logout y perfil.
- Actualización y desactivación/activación de cuenta.
- JWT + Bcrypt + validación Zod.
- Helmet, CORS y consultas parametrizadas.

### Frontend inicial
- React + Vite.
- Login funcional conectado al backend.
- Registro funcional.
- Dashboard protegido por autenticación.
- Consulta y actualización de perfil.
- Cierre de sesión.
- Dashboard con indicadores básicos.
- Mapa funcional con Leaflet/OpenStreetMap y marcadores de ejemplo.

## Estructura

```text
ft-group-completo/
├── ft-group-backend/
│   └── ft-group-backend/
└── ft-group-frontend/
```

## Cómo ejecutar

### 1. Backend

En `ft-group-backend/ft-group-backend`:

```bash
npm install
docker compose up -d
npm run migrate:dev
npm run dev
```

Debe quedar disponible en `http://localhost:3000`.

### 2. Frontend

En `ft-group-frontend`:

```bash
npm install
npm run dev
```

Abrir `http://localhost:5173`.

El frontend utiliza `VITE_API_URL=http://localhost:3000/api` por defecto.

## Flujo para probar

1. Entrar a `/registro` y crear un usuario.
2. Volver al login.
3. Iniciar sesión.
4. El frontend consulta `/api/auth/me` y muestra el dashboard.
5. Entrar a **Mi perfil** para actualizar nombre/teléfono.
6. Cerrar sesión y comprobar que las rutas protegidas vuelven al login.
7. El dashboard muestra el mapa y sus marcadores.

## Nota sobre cookies seguras

El backend recibido implementa JWT y refresh tokens, pero actualmente expone el refresh token en la respuesta JSON y espera ese token en el cuerpo de `/refresh` y `/logout`. Por eso el frontend de esta entrega conserva los tokens en `sessionStorage` para ser compatible con el backend existente.

Si el requisito de la entrega exige específicamente una cookie `HttpOnly`, `Secure` y `SameSite`, se debe hacer un pequeño ajuste adicional en el backend para mover el refresh token a una cookie segura y habilitar CORS con credenciales. No se oculta esta diferencia: es importante para que la documentación del proyecto sea coherente con lo que realmente está implementado.
