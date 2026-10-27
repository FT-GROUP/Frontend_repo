# Pruebas de integración

Levantan la aplicación Express completa (con `supertest`, sin abrir puertos)
contra una base **PostgreSQL real**. No usan mocks de base de datos: cada
prueba pasa por rutas, middlewares, validadores, casos de uso y repositorios.

## Requisitos

PostgreSQL 16 accesible con usuario `postgres` / contraseña `postgres` en
`localhost:5432` (el `docker compose up -d` de esta carpeta sirve).

## Ejecutar

```bash
npm run test:integration   # solo integración
npm run test:all           # unitarias + integración
```

Antes de empezar, `globalSetup.ts` crea la base `ft_group_test` si no existe,
**la vacía** y ejecuta todas las migraciones de `db/migrations`. Por seguridad
se niega a correr si `DB_NAME` no termina en `_test`, así que nunca toca la
base de desarrollo (`ft_group`).

Para usar otra conexión, define las variables antes de ejecutar (tienen
prioridad sobre `env.ts`), por ejemplo:

```bash
DB_HOST=127.0.0.1 DB_PASSWORD=otra DB_NAME=mi_base_test npm run test:integration
```

La IA (OpenAI/Claude) nunca se llama: `ia.integration.ts` inyecta un extractor
falso con `configurarExtractorFacturas`.

## Suites

| Archivo | Qué cubre |
|---|---|
| `auth.integration.ts` | Registro, login, Argon2id, rotación y revocación de refresh tokens, perfil, desactivación, auditoría |
| `grupos.integration.ts` | Grupos, integrantes, gastos (equitativos/personalizados), balances, pagos, historial, control de acceso (IDOR) |
| `seguridad.integration.ts` | Cabeceras, CORS, tamaño de cuerpo, JSON inválido, inyección SQL, fuerza bruta, tokens alterados/expirados/`alg:none`, matriz de roles |
| `ia.integration.ts` | Escaneo con IA: autenticación, formatos, firma del archivo, tamaño, errores del proveedor, límite por usuario |
