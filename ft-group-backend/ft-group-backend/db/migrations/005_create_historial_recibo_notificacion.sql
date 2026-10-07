-- Migracion 005: HISTORIAL_MOVIMIENTO, RECIBO_ESCANEADO y NOTIFICACION
-- Ver secciones 3.8, 3.9 y 3.10 del esquema de base de datos.
-- Extension: tipos 'grupo_creado' y 'gasto_eliminado' para una trazabilidad completa.

CREATE TABLE IF NOT EXISTS historial_movimiento (
    id               BIGSERIAL PRIMARY KEY,
    usuario_id       BIGINT NOT NULL REFERENCES usuario (id),
    grupo_id         BIGINT NOT NULL REFERENCES grupo (id) ON DELETE CASCADE,
    gasto_id         BIGINT REFERENCES gasto (id) ON DELETE SET NULL,
    tipo_movimiento  VARCHAR(30) NOT NULL
        CHECK (tipo_movimiento IN ('grupo_creado', 'gasto_creado', 'gasto_editado', 'gasto_eliminado',
                                   'pago_registrado', 'miembro_agregado', 'miembro_expulsado')),
    descripcion      TEXT,
    fecha            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_grupo_fecha ON historial_movimiento (grupo_id, fecha);

CREATE TABLE IF NOT EXISTS recibo_escaneado (
    id                   BIGSERIAL PRIMARY KEY,
    gasto_id             BIGINT REFERENCES gasto (id) ON DELETE SET NULL,
    imagen_url           VARCHAR(500) NOT NULL,
    monto_extraido       NUMERIC(12, 2),
    fecha_extraida       DATE,
    comercio_extraido    VARCHAR(150),
    categoria_sugerida   VARCHAR(60),
    confianza_ocr        NUMERIC(5, 2),
    estado_validacion    VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_validacion IN ('pendiente', 'confirmado', 'rechazado')),
    fecha_procesamiento  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recibo_estado ON recibo_escaneado (estado_validacion);

CREATE TABLE IF NOT EXISTS notificacion (
    id              BIGSERIAL PRIMARY KEY,
    usuario_id      BIGINT NOT NULL REFERENCES usuario (id),
    tipo            VARCHAR(30) NOT NULL
        CHECK (tipo IN ('nuevo_gasto', 'pago_recibido', 'recordatorio', 'invitacion_grupo')),
    mensaje         TEXT NOT NULL,
    leido           BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificacion_usuario ON notificacion (usuario_id, leido);
