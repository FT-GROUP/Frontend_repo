# FT. GROUP — Frontend inicial

Frontend React + Vite integrado con el backend existente de FT. GROUP.

## Funcionalidades

- Login conectado a `POST /api/auth/login`.
- Registro conectado a `POST /api/auth/registro`.
- Renovación de access token con `POST /api/auth/refresh`.
- Cierre de sesión con `POST /api/auth/logout`.
- Perfil protegido con `GET /api/auth/me`.
- Actualización de perfil con `PUT /api/auth/me`.
- Activación/desactivación de cuenta.
- Dashboard básico.
- Mapa funcional con Leaflet y marcadores.
- Diseño responsive.

## Ejecución

1. Tener PostgreSQL y el backend funcionando en `http://localhost:3000`.
2. Copiar `.env.example` a `.env`.
3. Ejecutar:

```bash
npm install
npm run dev
```

Abrir `http://localhost:5173`.

El access token se conserva únicamente en `sessionStorage` durante la sesión del navegador. El refresh token se mantiene en `sessionStorage` para ser enviado al endpoint `/refresh`, porque el backend entregado actualmente espera el token en el cuerpo de la petición.
