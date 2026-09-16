-- ==============================================================================
-- MIGRACIÓN: Fix Categorías (icono), Gastos (RLS Multi-Negocio) y Negocios (WhatsApp)
-- ==============================================================================
-- Ejecutar este script en el Editor SQL de Supabase (Dashboard Supabase -> SQL Editor)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CATEGORÍAS: Asegurar columna icono
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.categorias 
  ADD COLUMN IF NOT EXISTS icono VARCHAR(50) DEFAULT '👕';

COMMENT ON COLUMN public.categorias.icono IS 'Emoji o icono representativo de la categoría';

-- ------------------------------------------------------------------------------
-- 2. NEGOCIOS: Agregar columna opcional de WhatsApp
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.negocios 
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);

COMMENT ON COLUMN public.negocios.whatsapp IS 'Número de WhatsApp de contacto comercial del negocio';

-- Actualizar RPC obtener_mi_perfil_login para incluir negocio_whatsapp
DROP FUNCTION IF EXISTS public.obtener_mi_perfil_login();

CREATE OR REPLACE FUNCTION public.obtener_mi_perfil_login()
RETURNS TABLE (
  id UUID,
  negocio_id UUID,
  auth_user_id UUID,
  nombre VARCHAR,
  rol VARCHAR,
  activo BOOLEAN,
  negocio_nombre VARCHAR,
  negocio_activo BOOLEAN,
  negocio_logo_url TEXT,
  negocio_whatsapp VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.negocio_id,
    u.auth_user_id,
    u.nombre,
    u.rol,
    u.activo,
    n.nombre::VARCHAR AS negocio_nombre,
    n.activo AS negocio_activo,
    n.logo_url AS negocio_logo_url,
    n.whatsapp::VARCHAR AS negocio_whatsapp
  FROM public.usuarios u
  LEFT JOIN public.negocios n ON n.id = u.negocio_id
  WHERE u.auth_user_id = auth.uid()
  ORDER BY u.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.obtener_mi_perfil_login() IS 'Permite a un usuario autenticado consultar su perfil, negocio y WhatsApp.';

-- ------------------------------------------------------------------------------
-- 3. GASTOS: Políticas RLS Multi-Negocio
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.gastos ENABLE ROW LEVEL SECURITY;

-- Asegurar índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_gastos_negocio_id ON public.gastos(negocio_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON public.gastos(fecha);

-- Limpiar políticas obsoletas si existen
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios gastos" ON public.gastos;
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios gastos" ON public.gastos;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios gastos" ON public.gastos;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios gastos" ON public.gastos;

DROP POLICY IF EXISTS "Usuarios pueden ver gastos de su negocio" ON public.gastos;
DROP POLICY IF EXISTS "Usuarios pueden crear gastos en su negocio" ON public.gastos;
DROP POLICY IF EXISTS "Usuarios pueden actualizar gastos de su negocio" ON public.gastos;
DROP POLICY IF EXISTS "Usuarios pueden eliminar gastos de su negocio" ON public.gastos;

-- SELECT: Ver gastos del negocio activo
CREATE POLICY "Usuarios pueden ver gastos de su negocio"
  ON public.gastos FOR SELECT
  USING (
    negocio_id IN (
      SELECT u.negocio_id FROM public.usuarios u
      WHERE u.auth_user_id = auth.uid() AND u.activo = true
    )
    OR EXISTS (
      SELECT 1 FROM public.administradores_plataforma ap
      WHERE ap.auth_user_id = auth.uid() AND ap.activo = true
    )
  );

-- INSERT: Crear gastos para su propio negocio
CREATE POLICY "Usuarios pueden crear gastos en su negocio"
  ON public.gastos FOR INSERT
  WITH CHECK (
    negocio_id IN (
      SELECT u.negocio_id FROM public.usuarios u
      WHERE u.auth_user_id = auth.uid() AND u.activo = true
    )
    OR EXISTS (
      SELECT 1 FROM public.administradores_plataforma ap
      WHERE ap.auth_user_id = auth.uid() AND ap.activo = true
    )
  );

-- UPDATE: Actualizar gastos de su negocio
CREATE POLICY "Usuarios pueden actualizar gastos de su negocio"
  ON public.gastos FOR UPDATE
  USING (
    negocio_id IN (
      SELECT u.negocio_id FROM public.usuarios u
      WHERE u.auth_user_id = auth.uid() AND u.activo = true
    )
    OR EXISTS (
      SELECT 1 FROM public.administradores_plataforma ap
      WHERE ap.auth_user_id = auth.uid() AND ap.activo = true
    )
  );

-- DELETE: Eliminar gastos de su negocio
CREATE POLICY "Usuarios pueden eliminar gastos de su negocio"
  ON public.gastos FOR DELETE
  USING (
    negocio_id IN (
      SELECT u.negocio_id FROM public.usuarios u
      WHERE u.auth_user_id = auth.uid() AND u.activo = true
    )
    OR EXISTS (
      SELECT 1 FROM public.administradores_plataforma ap
      WHERE ap.auth_user_id = auth.uid() AND ap.activo = true
    )
  );
