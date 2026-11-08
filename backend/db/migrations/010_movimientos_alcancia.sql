-- 010_movimientos_alcancia.sql
-- La migracion 009 agrego la alcancia, pero el CHECK de movimiento.tipo_movimiento
-- seguia rechazando los dos movimientos que esta registra.

ALTER TABLE movimiento
  DROP CONSTRAINT IF EXISTS movimiento_tipo_movimiento_check;

ALTER TABLE movimiento
  ADD CONSTRAINT movimiento_tipo_movimiento_check CHECK (
    tipo_movimiento IN (
      'gasto_creado', 'gasto_editado', 'pago_registrado', 'miembro_agregado',
      'miembro_expulsado', 'alcancia_configurada', 'aporte_alcancia'
    )
  );
