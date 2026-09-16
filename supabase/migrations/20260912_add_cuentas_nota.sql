-- ==============================================================================
-- MIGRACIÓN: Agregar columna nota opcional a la tabla cuentas
-- ==============================================================================
-- 1. nota: Nota o comentario específico de la cuenta (ej. "Cuenta de su mamá", "Cuenta personal")
--    Pertenece a la cuenta individual, no a la clienta.

ALTER TABLE cuentas
  ADD COLUMN IF NOT EXISTS nota TEXT NULL;

-- Documentación en base de datos
COMMENT ON COLUMN cuentas.nota IS 'Nota o descripción específica de esta cuenta (ej: Cuenta de su mamá)';
