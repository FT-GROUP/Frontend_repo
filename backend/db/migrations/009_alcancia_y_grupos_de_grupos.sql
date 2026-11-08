-- =========================================================================
-- 009_alcancia_y_grupos_de_grupos.sql
-- Propósito:
--   1. Admin - Grupos de grupos: Tabla `agrupacion_grupo` (macro-grupos /
--      clústeres jerárquicos de grupos) y vínculo en `grupo.agrupacion_id`.
--   2. Alcancía compartida: Tablas `alcancia_grupo` (meta de ahorro y pozo
--      acumulado por grupo) y `aporte_alcancia` (aportes individuales).
-- =========================================================================

CREATE TABLE IF NOT EXISTS agrupacion_grupo (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  descripcion VARCHAR(255),
  color VARCHAR(32) NOT NULL DEFAULT '#1f9d63',
  creado_por BIGINT REFERENCES usuario(id) ON DELETE SET NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE grupo
  ADD COLUMN IF NOT EXISTS agrupacion_id BIGINT REFERENCES agrupacion_grupo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_grupo_agrupacion ON grupo (agrupacion_id);

CREATE TABLE IF NOT EXISTS alcancia_grupo (
  id BIGSERIAL PRIMARY KEY,
  grupo_id BIGINT NOT NULL UNIQUE REFERENCES grupo(id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL DEFAULT 'Alcancía del grupo',
  meta NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (meta >= 0),
  ahorrado NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (ahorrado >= 0),
  actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aporte_alcancia (
  id BIGSERIAL PRIMARY KEY,
  alcancia_id BIGINT NOT NULL REFERENCES alcancia_grupo(id) ON DELETE CASCADE,
  usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
  nota VARCHAR(255),
  fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aporte_alcancia_id ON aporte_alcancia (alcancia_id, fecha DESC);
