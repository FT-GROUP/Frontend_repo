-- 015_politica_contrasenas.sql
-- Las cuentas creadas antes de la politica de contrasenas pueden tener una
-- contrasena debil (por ejemplo, solo espacios). No se puede saber cuales
-- son sin la contrasena en claro, asi que se marcan al iniciar sesion: si la
-- contrasena usada no cumple la politica, la cuenta queda obligada a
-- cambiarla y el backend bloquea el resto de la API hasta que lo haga.
ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS debe_cambiar_contrasena BOOLEAN NOT NULL DEFAULT FALSE;
