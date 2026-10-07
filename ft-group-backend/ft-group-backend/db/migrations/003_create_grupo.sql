-- Migracion 003: tablas GRUPO y MIEMBRO_GRUPO
-- Ver secciones 3.3 y 3.4 del "Esquema de Base de Datos y Documentacion Tecnica" (FT. GROUP).
-- Extension: icono, ciudad, latitud y longitud se agregan para la interfaz (tarjetas y mapa).

CREATE TABLE IF NOT EXISTS grupo (
    id              BIGSERIAL PRIMARY KEY,
    nombre          VARCHAR(120) NOT NULL,
    descripcion     TEXT,
    icono           VARCHAR(30) NOT NULL DEFAULT 'users',
    ciudad          VARCHAR(80),
    latitud         NUMERIC(9, 6),
    longitud        NUMERIC(9, 6),
    creado_por      BIGINT NOT NULL REFERENCES usuario (id),
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT NOW(),
    estado          VARCHAR(20) NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo', 'archivado'))
);

CREATE TABLE IF NOT EXISTS miembro_grupo (
    id          BIGSERIAL PRIMARY KEY,
    grupo_id    BIGINT NOT NULL REFERENCES grupo (id) ON DELETE CASCADE,
    usuario_id  BIGINT NOT NULL REFERENCES usuario (id),
    rol         VARCHAR(20) NOT NULL DEFAULT 'miembro'
        CHECK (rol IN ('administrador', 'miembro')),
    fecha_union TIMESTAMP NOT NULL DEFAULT NOW(),
    estado      VARCHAR(20) NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo', 'expulsado', 'salido')),
    CONSTRAINT uq_miembro_grupo UNIQUE (grupo_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_miembro_grupo_usuario ON miembro_grupo (usuario_id);
