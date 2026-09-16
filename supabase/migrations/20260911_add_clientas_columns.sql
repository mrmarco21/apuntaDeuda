-- ==============================================================================
-- MIGRACIÓN: Agregar columnas opcionales a la tabla clientas
-- ==============================================================================
-- 1. telefono: Teléfono de contacto de la clienta (opcional)
-- 2. direccion: Dirección física de la clienta (opcional)
-- 3. notas: Notas adicionales u observaciones (opcional)
-- 4. referencia: Nombre/texto de quién la recomendó (opcional, ya existía en algunos entornos)

ALTER TABLE clientas
  ADD COLUMN IF NOT EXISTS telefono TEXT NULL,
  ADD COLUMN IF NOT EXISTS direccion TEXT NULL,
  ADD COLUMN IF NOT EXISTS notas TEXT NULL,
  ADD COLUMN IF NOT EXISTS referencia TEXT NULL;

-- Documentación en base de datos
COMMENT ON COLUMN clientas.telefono IS 'Teléfono de contacto de la clienta';
COMMENT ON COLUMN clientas.direccion IS 'Dirección física o domicilio de la clienta';
COMMENT ON COLUMN clientas.notas IS 'Notas adicionales u observaciones sobre la clienta';
COMMENT ON COLUMN clientas.referencia IS 'Nombre o descripción de quién recomendó a la clienta (texto opcional libre)';
