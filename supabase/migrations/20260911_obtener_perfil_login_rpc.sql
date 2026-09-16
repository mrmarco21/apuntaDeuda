-- ==============================================================================
-- MIGRACIÓN: Función RPC segura para verificar estado de usuario en Login y RLS
-- ==============================================================================

-- 1. Políticas RLS en public.usuarios para permitir que un usuario vea su propio registro
-- independientemente de si está activo o inactivo
ALTER TABLE IF EXISTS public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios pueden ver su propio registro" ON public.usuarios;
CREATE POLICY "Usuarios pueden ver su propio registro"
  ON public.usuarios FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.administradores_plataforma ap
      WHERE ap.auth_user_id = auth.uid() AND ap.activo = true
    )
  );

-- 2. Permitir lectura de negocios asociados al usuario autenticado
ALTER TABLE IF EXISTS public.negocios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios pueden ver su negocio asignado" ON public.negocios;
CREATE POLICY "Usuarios pueden ver su negocio asignado"
  ON public.negocios FOR SELECT
  USING (
    id IN (
      SELECT u.negocio_id FROM public.usuarios u
      WHERE u.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.administradores_plataforma ap
      WHERE ap.auth_user_id = auth.uid() AND ap.activo = true
    )
  );

-- 3. Función RPC SECURITY DEFINER para consultar perfil y estado de login de forma 100% confiable
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
  negocio_logo_url TEXT
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
    n.logo_url AS negocio_logo_url
  FROM public.usuarios u
  LEFT JOIN public.negocios n ON n.id = u.negocio_id
  WHERE u.auth_user_id = auth.uid()
  ORDER BY u.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.obtener_mi_perfil_login() IS 'Permite a un usuario autenticado consultar su estado de usuario y negocio en el login, incluso si su cuenta se encuentra inactiva.';
