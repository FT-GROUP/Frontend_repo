# FT. GROUP — Frontend

Frontend web (React + Vite) de FT. GROUP, basado en los prototipos de las versiones portátil y tablet. Tiene tema oscuro con acentos naranja y se adapta a portátil, tablet y celular.

## Pantallas

| Ruta | Módulo | Datos |
|---|---|---|
| `/login`, `/registro` | Autenticación | **Backend real** (`/api/auth`) |
| `/panel` | Panel de control: balance neto, te deben / debes, liquidaciones sugeridas, mis grupos, mapa | Local* |
| `/grupos` | Grupos financieros: tarjetas con miembros, total y mi balance; crear grupo | Local* |
| `/gastos` | Registro de gastos: filtro por grupo, tabla (tarjetas en celular), agregar gasto con división igual o personalizada, detalle y registro de pagos | Local* |
| `/historial` | Historial por mes con filtros de grupo y categoría y total filtrado | Local* |
| `/escanear` | Escaneo de recibos: carga/arrastre o cámara del celular, OCR con Tesseract.js y formulario prellenado | Local* |
| `/perfil` | Ver/editar nombre y teléfono, desactivar cuenta, cerrar sesión | **Backend real** |

\* El backend entregado solo tiene el módulo de usuarios. Mientras tanto, grupos, gastos y balances se guardan en el navegador (`localStorage`) con la **misma estructura de tablas** del documento técnico (GRUPO, MIEMBRO_GRUPO, GASTO, DIVISION_GASTO, BALANCE, RECIBO_ESCANEADO). La primera vez que un usuario entra se cargan datos de demostración. Desde **Mi perfil** se pueden restaurar o borrar esos datos.

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
| `VITE_FINANCE_MODE` | `local` | `local` guarda grupos y gastos en el navegador. `api` usa los endpoints REST de abajo |

## Endpoints para conectar los módulos financieros

Cuando se implementen en el backend, se pone `VITE_FINANCE_MODE=api` y el frontend los usa sin más cambios (ver `src/services/financeApi.js`):

```
GET    /api/panel/resumen        -> { grupos, teDeben, debes, balance, liquidaciones }
GET    /api/grupos               POST /api/grupos          DELETE /api/grupos/:id
GET    /api/gastos               POST /api/gastos          DELETE /api/gastos/:id
POST   /api/gastos/:id/pagar     POST /api/balances/liquidar { grupo_id, de, para }
```

Las formas de respuesta esperadas son las que devuelven `viewGroups` y `viewExpenses` en ese mismo archivo.

## Estructura

```
src/
├── App.jsx                 rutas y sesión
├── services/
│   ├── http.js             cliente fetch + renovación automática del token (401 -> /auth/refresh)
│   ├── authApi.js          módulo de usuarios (backend real)
│   ├── financeApi.js       grupos, gastos, balances (local o API)
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
