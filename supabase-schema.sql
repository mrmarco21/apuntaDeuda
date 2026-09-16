-- =====================================================
-- SCHEMA PARA CONTROL DE DEUDAS
-- =====================================================
-- Ejecutar este SQL en Supabase SQL Editor

-- Tabla de Clientas
CREATE TABLE IF NOT EXISTS clientas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  direccion TEXT,
  referencia TEXT,
  notas TEXT,
  saldo DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Movimientos (Ventas y Pagos)
CREATE TABLE IF NOT EXISTS movimientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  clienta_id UUID REFERENCES clientas(id) ON DELETE CASCADE NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('venta', 'pago')),
  monto DECIMAL(10, 2) NOT NULL,
  descripcion TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Gastos
CREATE TABLE IF NOT EXISTS gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  categoria VARCHAR(100),
  descripcion TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_clientas_user_id ON clientas(user_id);
CREATE INDEX IF NOT EXISTS idx_clientas_saldo ON clientas(saldo);
CREATE INDEX IF NOT EXISTS idx_movimientos_user_id ON movimientos(user_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_clienta_id ON movimientos(clienta_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_user_id ON gastos(user_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);

-- Habilitar Row Level Security (RLS)
ALTER TABLE clientas ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para Clientas
CREATE POLICY "Los usuarios pueden ver sus propias clientas"
  ON clientas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar sus propias clientas"
  ON clientas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias clientas"
  ON clientas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propias clientas"
  ON clientas FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas de seguridad para Movimientos
CREATE POLICY "Los usuarios pueden ver sus propios movimientos"
  ON movimientos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar sus propios movimientos"
  ON movimientos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propios movimientos"
  ON movimientos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios movimientos"
  ON movimientos FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas de seguridad para Gastos
CREATE POLICY "Los usuarios pueden ver sus propios gastos"
  ON gastos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar sus propios gastos"
  ON gastos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propios gastos"
  ON gastos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios gastos"
  ON gastos FOR DELETE
  USING (auth.uid() = user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en clientas
CREATE TRIGGER update_clientas_updated_at
  BEFORE UPDATE ON clientas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DATOS DE EJEMPLO (Opcional - Comentar si no se necesita)
-- =====================================================

-- Descomentar las siguientes líneas para insertar datos de ejemplo
-- NOTA: Reemplazar 'TU_USER_ID' con tu UUID de usuario de Supabase

/*
-- Insertar clientas de ejemplo
INSERT INTO clientas (user_id, nombre, telefono, direccion, saldo) VALUES
('TU_USER_ID', 'María García', '555-0101', 'Calle Principal #123', 150.00),
('TU_USER_ID', 'Juan Pérez', '555-0102', 'Avenida Central #456', 0.00),
('TU_USER_ID', 'Ana López', '555-0103', 'Calle Secundaria #789', 75.50);
*/
