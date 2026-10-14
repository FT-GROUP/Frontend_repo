# FT. GROUP

Sistema web de gestión y división de gastos compartidos — Universidad de San Buenaventura, sede Bello.

El repositorio es un **monorepo**: frontend y backend viven juntos, cada uno en su carpeta y con sus propias dependencias.

```
.
├── frontend/   React + Vite: interfaz, análisis, KPIs y predicciones   → frontend/README.md
├── backend/    Node + Express + TypeScript + PostgreSQL (hexagonal)    → backend/README.md
└── README.md   este archivo
```

Cada carpeta se instala y se ejecuta por separado (`npm install` dentro de cada una). No hay `package.json` en la raíz.

## Requisitos

- [Node.js](https://nodejs.org) 20 o superior y [Git](https://git-scm.com).
- PostgreSQL 16, de una de estas dos formas:
  - **Docker Desktop:** `docker compose up -d` dentro de `backend/` levanta la base de datos ya creada.
  - **PostgreSQL instalado** (por ejemplo, junto con pgAdmin): crea una base de datos llamada `ft_group` y pon tu contraseña en `DB_PASSWORD` del `backend/.env`.

## Cómo ejecutar

Abre **dos terminales**, una para cada parte.

**Terminal 1: backend** (http://localhost:3000)

```bash
cd backend
cp .env.example .env          # en Windows: copy .env.example .env
npm install
docker compose up -d          # solo si usas Docker
npm run migrate:dev
npm run dev
```

**Terminal 2: frontend** (http://localhost:5173)

```bash
cd frontend
cp .env.example .env          # en Windows: copy .env.example .env
npm install
npm run dev
```

En `frontend/.env`, `VITE_FINANCE_MODE=local` guarda grupos y gastos en el navegador con datos de demostración; el inicio de sesión siempre usa el backend. `VITE_FINANCE_MODE=api` usa el backend para todo.

## Pruebas

```bash
cd backend  && npm test       # Jest: dominio y casos de uso
cd frontend && npm test       # node --test: KPIs y modelos de análisis
```

## Convenciones

- Nunca se suben `node_modules/`, `dist/` ni archivos `.env` (ver `.gitignore`).
- Cada cambio va en una rama y entra a `main` mediante pull request.
