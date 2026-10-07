# FT. GROUP – Microservicio de Analítica

Servicio independiente (Node + Express + TypeScript, arquitectura hexagonal) que calcula
**KPIs básicos, estimadores estadísticos y predicciones simples** sobre el historial financiero
guardado por el backend principal en PostgreSQL.

- **Solo lectura**: su conexión a la BD usa `default_transaction_read_only=on`; no puede modificar datos.
- **Misma sesión**: valida el mismo JWT del backend (`JWT_SECRET` idéntico). Cada usuario solo ve sus grupos.
- **Dominio puro y probado**: la estadística y los modelos no dependen de Express ni de PostgreSQL (28 pruebas unitarias).

## Ejecutar (Windows PowerShell)

```powershell
cd ft-group-analytics
npm install
copy .env.example .env      # edita DB_PASSWORD y pon el MISMO JWT_SECRET del backend
npm run dev                 # http://localhost:4000
```
Requisitos: el backend ya migrado (`npm run migrate:dev` en ft-group-backend) y PostgreSQL en marcha.

Datos de demostración (12 meses de historial para un usuario ya registrado):
```powershell
npm run seed:demo -- tu_correo@ejemplo.com
```
Pruebas: `npm test` · Tipos: `npm run lint`

## Endpoints (todos con `Authorization: Bearer <accessToken>`)

| Método | Ruta | Parámetros | Descripción |
|---|---|---|---|
| GET | `/health` | – | Estado del servicio |
| GET | `/api/analitica/kpis` | `grupoId?`, `meses` (1-24, def. 6) | KPIs, estimadores, categorías, miembros |
| GET | `/api/analitica/predicciones` | `grupoId?`, `horizonte` (1-6, def. 3) | Pronóstico de gasto y de cobros |

Sin `grupoId` se analizan todos los grupos del usuario. Un grupo ajeno responde 403.

## KPIs e indicadores
Total gastado, promedio mensual, gasto promedio/mediano por gasto, mayor gasto, variación vs. mes anterior,
gasto por persona, categoría principal, **tasa de pago**, **morosidad**, deuda pendiente, días promedio de pago,
antigüedad de la deuda, % de gastos registrados por OCR, **índice de concentración (HHI)**,
**índice de equidad** y posición neta por integrante (aportó − consumió).

## Estimadores
Media, mediana, desviación estándar muestral, coeficiente de variación, percentil 90 e
**intervalo de confianza del 95 %** de la media (t de Student).

## Predicciones (datos históricos → modelos simples)
1. Se construye la serie mensual de meses **cerrados** (huecos = 0).
2. Se evalúan tres modelos por **backtesting de origen móvil** (predecir el pasado y medir error):
   promedio móvil (k=3), suavizado exponencial simple (α optimizado) y tendencia lineal (mínimos cuadrados).
3. Gana el de menor error (MAE; también se reportan RMSE/MAPE). Se entrega el pronóstico de 3 meses
   (el primero es el mes en curso, comparado con lo acumulado), con **intervalo de predicción del 80 %**
   y un nivel de confianza (alta/media/baja según meses de historial y error).
4. Pronóstico por categoría y esperado por integrante.
5. **Cobros**: distribución empírica del plazo de pago (días entre gasto y pago) → mediana, percentil 90,
   probabilidad de pago a 7 y 30 días y cobro esperado a 30 días (probabilidad condicional según antigüedad de cada deuda).
   Si hay menos de 5 pagos observados se informa que no hay datos suficientes.
6. Alertas automáticas (historial corto, gasto del mes por encima del rango, cobros bajos).

## Limitaciones
Modelos deliberadamente simples y explicables; con menos de 5 meses la confianza es «baja».
No modelan estacionalidad anual ni eventos puntuales (viajes). Siguiente paso: SARIMA/Prophet cuando haya >24 meses.

## Estructura
```
src/domain/services   Estadistica, Pronostico, Kpis, Predicciones (lógica pura)
src/domain/ports      puertos de entrada/salida
src/application       casos de uso (alcance por usuario/grupo)
src/infrastructure    Postgres (solo lectura), Express, JWT, errores
scripts/seed-historico.ts   datos demo
tests/unit            28 pruebas
```
