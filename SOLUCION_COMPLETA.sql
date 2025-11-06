-- ============================================
-- SOLUCIÓN COMPLETA PARA EL ERROR DE REGISTRO DE CORTES
-- Ejecuta este script completo en Supabase SQL Editor
-- ============================================

-- PASO 1: Verificar y corregir la estructura de la tabla services
-- ============================================

-- Primero, verificar si la tabla existe y tiene la estructura correcta
DO $$
BEGIN
  -- Agregar columnas faltantes si no existen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'barber_id'
  ) THEN
    ALTER TABLE public.services 
    ADD COLUMN barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL;
    RAISE NOTICE 'Columna barber_id agregada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'barber_name'
  ) THEN
    ALTER TABLE public.services 
    ADD COLUMN barber_name text;
    RAISE NOTICE 'Columna barber_name agregada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.services 
    ADD COLUMN updated_at timestamptz DEFAULT now();
    RAISE NOTICE 'Columna updated_at agregada';
  END IF;
END $$;

-- PASO 2: Eliminar TODAS las políticas RLS existentes
-- ============================================
DROP POLICY IF EXISTS "Users can view own services" ON public.services;
DROP POLICY IF EXISTS "Users can insert own services" ON public.services;
DROP POLICY IF EXISTS "Users can update own services" ON public.services;
DROP POLICY IF EXISTS "Users can delete own services" ON public.services;
DROP POLICY IF EXISTS "Services can view all" ON public.services;
DROP POLICY IF EXISTS "Services can insert own" ON public.services;
DROP POLICY IF EXISTS "Services can update own" ON public.services;
DROP POLICY IF EXISTS "Services can delete own" ON public.services;

-- PASO 3: Asegurar que RLS está habilitado
-- ============================================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- PASO 4: Crear las políticas RLS correctas
-- ============================================
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

-- PASO 5: Crear índices para mejorar el rendimiento
-- ============================================
CREATE INDEX IF NOT EXISTS idx_services_user_id ON public.services(user_id);
CREATE INDEX IF NOT EXISTS idx_services_barber_id ON public.services(barber_id);
CREATE INDEX IF NOT EXISTS idx_services_timestamp ON public.services(timestamp);

-- PASO 6: Cambiar la foreign key para que apunte a auth.users en lugar de public.users
-- ============================================
-- Esto corrige el error de foreign key constraint

DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Buscar y eliminar la constraint que referencia public.users
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.services'::regclass
    AND confrelid = 'public.users'::regclass
    AND contype = 'f'
    AND conkey::text LIKE '%user_id%';
  
  IF constraint_name IS NOT NULL THEN
    RAISE NOTICE 'Encontrada constraint antigua: %', constraint_name;
    EXECUTE 'ALTER TABLE public.services DROP CONSTRAINT IF EXISTS ' || constraint_name;
    RAISE NOTICE 'Constraint eliminada';
  END IF;
  
  -- Eliminar cualquier constraint existente que apunte a auth.users (por si acaso)
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.services'::regclass
    AND confrelid = 'auth.users'::regclass
    AND contype = 'f'
    AND conkey::text LIKE '%user_id%';
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.services DROP CONSTRAINT IF EXISTS ' || constraint_name;
    RAISE NOTICE 'Constraint existente de auth.users eliminada para recrearla';
  END IF;
  
  -- Crear nueva constraint que referencia auth.users
  ALTER TABLE public.services 
  ADD CONSTRAINT services_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
  
  RAISE NOTICE 'Nueva constraint creada: services apunta a auth.users';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Constraint ya existe';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error al manejar constraints: %', SQLERRM;
END $$;

-- PASO 7: Asegurar que public.users tenga el ID como campo editable
-- ============================================
-- Primero, eliminar la constraint DEFAULT si existe en el ID
DO $$
BEGIN
  -- Si el ID tiene un DEFAULT, lo eliminamos para poder insertar IDs manuales
  ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'No se pudo eliminar DEFAULT del ID (puede que no exista)';
END $$;

-- PASO 8: Crear usuario en public.users para usuarios existentes de auth.users
-- ============================================
-- Esto asegura que los usuarios existentes tengan un registro en public.users
-- con el mismo ID que en auth.users
INSERT INTO public.users (id, email)
SELECT id, email
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Verificar el resultado
SELECT 
  'Tabla services configurada correctamente' as mensaje,
  COUNT(*) as total_politicas
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'services';

