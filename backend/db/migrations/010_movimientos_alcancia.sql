-- 010_movimientos_alcancia.sql
-- La migracion 009 agrego la alcancia, pero el CHECK de movimiento.tipo_movimiento
-- seguia rechazando los dos movimientos que esta registra.
-- La lista incluye tambien los tipos de 013 (liquidaciones): las migraciones
-- se ejecutan todas en cada arranque y cada CHECK debe aceptar todos los tipos.

ALTER TABLE movimiento
  DROP CONSTRAINT IF EXISTS movimiento_tipo_movimiento_check;

ALTER TABLE movimiento
  ADD CONSTRAINT movimiento_tipo_movimiento_check CHECK (
    tipo_movimiento IN (
      'gasto_creado', 'gasto_editado', 'gasto_eliminado', 'pago_reportado',
      'pago_registrado', 'miembro_agregado', 'miembro_expulsado',
      'alcancia_configurada', 'aporte_alcancia'
    )
  );
