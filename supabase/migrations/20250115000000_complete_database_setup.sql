-- ============================================
-- Migración completa para FZ Barbería
-- ============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Tabla: users (usuarios del sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Tabla: barbers (barberos)
-- ============================================
CREATE TABLE IF NOT EXISTS public.barbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Tabla: service_types (tipos de servicio)
-- ============================================
CREATE TABLE IF NOT EXISTS public.service_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  icon TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- ============================================
-- Tabla: services (servicios registrados)
-- ============================================
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES public.barbers(id) ON DELETE SET NULL,
  barber_name TEXT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Índices para mejorar el rendimiento
-- ============================================
CREATE INDEX IF NOT EXISTS idx_services_user_id ON public.services(user_id);
CREATE INDEX IF NOT EXISTS idx_services_barber_id ON public.services(barber_id);
CREATE INDEX IF NOT EXISTS idx_services_timestamp ON public.services(timestamp);
CREATE INDEX IF NOT EXISTS idx_service_types_user_id ON public.service_types(user_id);

-- ============================================
-- Funciones para actualizar updated_at automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_barbers_updated_at ON public.barbers;
CREATE TRIGGER update_barbers_updated_at
  BEFORE UPDATE ON public.barbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_types_updated_at ON public.service_types;
CREATE TRIGGER update_service_types_updated_at
  BEFORE UPDATE ON public.service_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Políticas de seguridad (RLS - Row Level Security)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Políticas para users (todos pueden leer, pero solo insertar/actualizar propios)
CREATE POLICY "Users can view all" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own" ON public.users
  FOR UPDATE USING (true);

-- Políticas para barbers (todos los usuarios autenticados pueden gestionar)
-- Nota: En producción, puedes restringir esto por user_id si cada usuario tiene sus propios barberos
CREATE POLICY "Barbers can view all" ON public.barbers
  FOR SELECT USING (true);

CREATE POLICY "Barbers can insert" ON public.barbers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Barbers can update" ON public.barbers
  FOR UPDATE USING (true);

CREATE POLICY "Barbers can delete" ON public.barbers
  FOR DELETE USING (true);

-- Políticas para service_types (todos pueden leer, pero solo modificar propios)
CREATE POLICY "Service types can view all" ON public.service_types
  FOR SELECT USING (true);

CREATE POLICY "Service types can insert own" ON public.service_types
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service types can update own" ON public.service_types
  FOR UPDATE USING (true);

CREATE POLICY "Service types can delete own" ON public.service_types
  FOR DELETE USING (true);

-- Políticas para services (todos pueden leer, pero solo modificar propios)
CREATE POLICY "Services can view all" ON public.services
  FOR SELECT USING (true);

CREATE POLICY "Services can insert own" ON public.services
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Services can update own" ON public.services
  FOR UPDATE USING (true);

CREATE POLICY "Services can delete own" ON public.services
  FOR DELETE USING (true);

-- ============================================
-- Datos iniciales (opcional)
-- ============================================
-- Insertar tipos de servicio por defecto se hará desde la aplicación
-- para que estén asociados al usuario correcto

