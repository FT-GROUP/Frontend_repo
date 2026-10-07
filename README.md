# FT. GROUP — Frontend

Frontend web (React + Vite) de FT. GROUP, basado en los prototipos de las versiones portátil y tablet. Tiene tema oscuro con acentos naranja y se adapta a portátil, tablet y celular.

## Pantallas

| Ruta | Módulo | Datos |
|---|---|---|
| `/login`, `/registro` | Autenticación | **Backend real** (`/api/auth`) |
| `/panel` | Panel de control: balance neto, te deben / debes, liquidaciones sugeridas, mis grupos, mapa | **Backend real** |
| `/grupos` | Grupos financieros: tarjetas con miembros, total y mi balance; crear grupo; agregar integrantes | **Backend real** |
| `/gastos` | Registro de gastos: filtro por grupo, tabla (tarjetas en celular), agregar gasto con división igual o personalizada, detalle y registro de pagos | **Backend real** |
| `/historial` | Historial por mes con filtros de grupo y categoría, total filtrado y movimientos recientes | **Backend real** |
| `/escanear` | Escaneo de recibos: carga/arrastre o cámara del celular, OCR con Tesseract.js y formulario prellenado | **Backend real** |
| `/perfil` | Ver/editar nombre y teléfono, desactivar cuenta, cerrar sesión | **Backend real** |

Todo se guarda en PostgreSQL a través del backend. Para crear un grupo, los integrantes deben tener una cuenta registrada; se agregan por su correo.

Si quieres mostrar la interfaz sin backend, pon `VITE_FINANCE_MODE=local`. En ese modo los datos se guardan en el navegador y se cargan datos de demostración.

## Diseño adaptable

- **Portátil (≥ 1024 px):** menú lateral fijo y expandido, como en el prototipo de portátil.
- **Tablet (721–1023 px):** menú lateral que se abre con el botón ☰, como en el prototipo de tablet.
- **Celular (≤ 720 px):** barra de navegación inferior, tabla de gastos en forma de tarjetas, filtros con desplazamiento horizontal y ventanas que suben desde abajo.

## Cómo ejecutar

```bash
# 1. Backend (en ft-group-backend/ft-group-backend)
npm install
docker compose up -d
npm run migrate:dev
npm run dev            # http://localhost:3000

# 2. Frontend (en esta carpeta)
cp .env.example .env
npm install
npm run dev            # http://localhost:5173
```

En el `.env` del backend, `CORS_ORIGIN` debe ser `http://localhost:5173`.

## Variables de entorno

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000/api` | URL de la API |
| `VITE_FINANCE_MODE` | `api` | `api` guarda todo en PostgreSQL. `local` es una demostración sin backend |

## Endpoints que usa

La lista completa de endpoints y las tablas que modifica cada acción están en el README del backend.

## Estructura

```
src/
├── App.jsx                 rutas y sesión
├── services/
│   ├── http.js             cliente fetch + renovación automática del token (401 -> /auth/refresh)
│   ├── authApi.js          módulo de usuarios (backend real)
│   ├── financeApi.js       grupos, gastos, balances, historial (API o modo local)
│   └── ocr.js              preprocesamiento, OCR y extracción de campos del recibo
├── utils/balances.js       motor de cálculo: división igual, saldos netos, balance por pares
├── components/             Layout, ExpenseForm, MapView, Icon, ui (Modal, Avatar, Chips…)
└── pages/                  Auth, Dashboard, Groups, Expenses, History, Scan, Profile
```

## Cambios respecto al frontend inicial

- Se corrigió la lectura del estado de la cuenta: el backend devuelve `estado` (`activo`/`inactivo`), no `activo`.
- `/auth/refresh` no devuelve el usuario. Ahora, después de renovar el token, se consulta `/auth/me`.
- Si una petición recibe 401, el token se renueva automáticamente una vez.
- Los tokens siguen en `sessionStorage` porque el backend espera el refresh token en el cuerpo de la petición. Para usar una cookie `HttpOnly`, hay que cambiar el backend.

## Nota sobre el escaneo

El OCR se ejecuta en el navegador con Tesseract.js (idioma español). La primera vez descarga el modelo, unos pocos MB, así que necesita internet. La lectura es aproximada, por eso el usuario siempre revisa y confirma los datos antes de guardar. Los PDF se adjuntan, pero sus datos se ingresan a mano.

## Análisis y predicciones
Ruta `/analisis`. Consume el microservicio `ft-group-analytics` (puerto 4000, ver su README).
Configura `VITE_ANALYTICS_URL` (por defecto `http://localhost:4000/api`). Si el servicio está apagado la página muestra un aviso.
