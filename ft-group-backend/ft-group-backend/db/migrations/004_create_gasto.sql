-- Migracion 004: tablas GASTO, DIVISION_GASTO y BALANCE
-- Ver secciones 3.5, 3.6 y 3.7 del esquema de base de datos.

CREATE TABLE IF NOT EXISTS gasto (
    id               BIGSERIAL PRIMARY KEY,
    grupo_id         BIGINT NOT NULL REFERENCES grupo (id) ON DELETE CASCADE,
    pagador_id       BIGINT NOT NULL REFERENCES usuario (id),
    descripcion      VARCHAR(255) NOT NULL,
    monto_total      NUMERIC(12, 2) NOT NULL CHECK (monto_total > 0),
    fecha_gasto      DATE NOT NULL,
    categoria        VARCHAR(60) NOT NULL,
    tipo_division    VARCHAR(20) NOT NULL
        CHECK (tipo_division IN ('equitativa', 'personalizada')),
    comprobante_url  VARCHAR(500),
    origen_registro  VARCHAR(10) NOT NULL DEFAULT 'manual'
        CHECK (origen_registro IN ('manual', 'ocr')),
    fecha_registro   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gasto_grupo_fecha ON gasto (grupo_id, fecha_gasto);

CREATE TABLE IF NOT EXISTS division_gasto (
    id              BIGSERIAL PRIMARY KEY,
    gasto_id        BIGINT NOT NULL REFERENCES gasto (id) ON DELETE CASCADE,
    usuario_id      BIGINT NOT NULL REFERENCES usuario (id),
    monto_asignado  NUMERIC(12, 2) NOT NULL CHECK (monto_asignado >= 0),
    estado_pago     VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_pago IN ('pendiente', 'pagado')),
    fecha_pago      TIMESTAMP,
    CONSTRAINT uq_division_gasto UNIQUE (gasto_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_division_usuario_estado ON division_gasto (usuario_id, estado_pago);

-- Saldo neto entre pares de usuarios dentro de un grupo.
-- Lo recalcula el motor de calculo cada vez que cambia un gasto o un pago.
CREATE TABLE IF NOT EXISTS balance (
    id                   BIGSERIAL PRIMARY KEY,
    grupo_id             BIGINT NOT NULL REFERENCES grupo (id) ON DELETE CASCADE,
    deudor_id            BIGINT NOT NULL REFERENCES usuario (id),
    acreedor_id          BIGINT NOT NULL REFERENCES usuario (id),
    monto                NUMERIC(12, 2) NOT NULL CHECK (monto >= 0),
    fecha_actualizacion  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_balance UNIQUE (grupo_id, deudor_id, acreedor_id)
);

CREATE INDEX IF NOT EXISTS idx_balance_grupo ON balance (grupo_id);
