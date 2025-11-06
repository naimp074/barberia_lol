-- ============================================
-- Script para corregir las políticas RLS de services
-- Este script asegura que las políticas estén correctamente configuradas
-- ============================================

-- Primero, eliminar todas las políticas existentes para services
DROP POLICY IF EXISTS "Users can view own services" ON public.services;
DROP POLICY IF EXISTS "Users can insert own services" ON public.services;
DROP POLICY IF EXISTS "Users can update own services" ON public.services;
DROP POLICY IF EXISTS "Users can delete own services" ON public.services;
DROP POLICY IF EXISTS "Services can view all" ON public.services;
DROP POLICY IF EXISTS "Services can insert own" ON public.services;
DROP POLICY IF EXISTS "Services can update own" ON public.services;
DROP POLICY IF EXISTS "Services can delete own" ON public.services;

-- Asegurar que RLS está habilitado
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Crear políticas correctas que usan auth.uid()
-- Política para SELECT: los usuarios solo pueden ver sus propios servicios
CREATE POLICY "Users can view own services"
  ON public.services
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política para INSERT: los usuarios solo pueden insertar servicios con su propio user_id
CREATE POLICY "Users can insert own services"
  ON public.services
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE: los usuarios solo pueden actualizar sus propios servicios
CREATE POLICY "Users can update own services"
  ON public.services
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política para DELETE: los usuarios solo pueden eliminar sus propios servicios
CREATE POLICY "Users can delete own services"
  ON public.services
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Verificar que la tabla services tenga las columnas necesarias
-- Si no tiene barber_id y barber_name, las agregamos
DO $$
BEGIN
  -- Agregar barber_id si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'barber_id'
  ) THEN
    ALTER TABLE public.services 
    ADD COLUMN barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL;
  END IF;

  -- Agregar barber_name si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'barber_name'
  ) THEN
    ALTER TABLE public.services 
    ADD COLUMN barber_name text;
  END IF;

  -- Agregar updated_at si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.services 
    ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_services_user_id ON public.services(user_id);
CREATE INDEX IF NOT EXISTS idx_services_barber_id ON public.services(barber_id);
CREATE INDEX IF NOT EXISTS idx_services_timestamp ON public.services(timestamp);

