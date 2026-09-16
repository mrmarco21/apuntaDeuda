-- ==============================================================================
-- MIGRACIÓN: Tabla de Categorías Multi-Negocio y Políticas RLS
-- ==============================================================================

-- 1. Crear tabla categorias si no existe
CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id UUID REFERENCES public.negocios(id) ON DELETE CASCADE NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  icono VARCHAR(50) DEFAULT '👕',
  color VARCHAR(50) DEFAULT '#45beff',
  activo BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Índices para búsqueda rápida por negocio y estado
CREATE INDEX IF NOT EXISTS idx_categorias_negocio_id ON public.categorias(negocio_id);
CREATE INDEX IF NOT EXISTS idx_categorias_activo ON public.categorias(activo);
CREATE INDEX IF NOT EXISTS idx_categorias_negocio_activo ON public.categorias(negocio_id, activo);

-- 3. Trigger para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_categorias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_categorias_updated_at ON public.categorias;
CREATE TRIGGER trg_categorias_updated_at
  BEFORE UPDATE ON public.categorias
  FOR EACH ROW
  EXECUTE FUNCTION update_categorias_updated_at();

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de seguridad (RLS) multi-negocio
-- Lectura: Usuarios autenticados que pertenezcan al negocio o superadmins
DROP POLICY IF EXISTS "Usuarios pueden ver categorias de su negocio" ON public.categorias;
CREATE POLICY "Usuarios pueden ver categorias de su negocio"
  ON public.categorias FOR SELECT
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

-- Inserción: Usuarios autenticados para su propio negocio
DROP POLICY IF EXISTS "Usuarios pueden crear categorias en su negocio" ON public.categorias;
CREATE POLICY "Usuarios pueden crear categorias en su negocio"
  ON public.categorias FOR INSERT
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

-- Actualización: Usuarios autenticados para su propio negocio
DROP POLICY IF EXISTS "Usuarios pueden actualizar categorias de su negocio" ON public.categorias;
CREATE POLICY "Usuarios pueden actualizar categorias de su negocio"
  ON public.categorias FOR UPDATE
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

-- Eliminación: Usuarios autenticados para su propio negocio
DROP POLICY IF EXISTS "Usuarios pueden eliminar categorias de su negocio" ON public.categorias;
CREATE POLICY "Usuarios pueden eliminar categorias de su negocio"
  ON public.categorias FOR DELETE
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

-- Comentarios descriptivos
COMMENT ON TABLE public.categorias IS 'Categorías de productos/prendas para cargos, organizadas por negocio_id';
COMMENT ON COLUMN public.categorias.negocio_id IS 'Negocio al que pertenece la categoría';
COMMENT ON COLUMN public.categorias.nombre IS 'Nombre visible de la categoría';
COMMENT ON COLUMN public.categorias.icono IS 'Emoji o icono representativo de la categoría';
COMMENT ON COLUMN public.categorias.color IS 'Color hexadecimal decorativo';
COMMENT ON COLUMN public.categorias.activo IS 'Estado activo o inactivo (para bajas lógicas)';
