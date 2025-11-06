-- ============================================
-- SCRIPT SQL FINAL PARA FZ BARBERÍA
-- Copia y pega TODO este contenido en Supabase SQL Editor
-- Ejecuta este script para que todo funcione correctamente
-- ============================================

-- ============================================
-- PASO 1: Crear/Verificar estructura de tablas
-- ============================================

-- Asegurar que la tabla users existe y tiene la estructura correcta
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar que la tabla barbers existe (necesaria para la foreign key)
CREATE TABLE IF NOT EXISTS public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear la tabla services si no existe
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar que la tabla services tiene todas las columnas necesarias
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
    ADD COLUMN barber_id UUID REFERENCES public.barbers(id) ON DELETE SET NULL;
  END IF;

  -- Agregar barber_name si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'barber_name'
  ) THEN
    ALTER TABLE public.services 
    ADD COLUMN barber_name TEXT;
  END IF;
END $$;

-- ============================================
-- PASO 2: Eliminar TODAS las constraints de foreign key incorrectas
-- ============================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Eliminar TODAS las constraints de foreign key en services.user_id
  FOR r IN 
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.services'::regclass
      AND contype = 'f'
      AND conkey::text LIKE '%user_id%'
  LOOP
    EXECUTE 'ALTER TABLE public.services DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    RAISE NOTICE 'Constraint eliminada: %', r.conname;
  END LOOP;
END $$;

-- ============================================
-- PASO 3: Crear la constraint CORRECTA (apunta a auth.users)
-- ============================================

ALTER TABLE public.services 
ADD CONSTRAINT services_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- ============================================
-- PASO 4: Eliminar y recrear políticas RLS para services
-- ============================================

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can view own services" ON public.services;
DROP POLICY IF EXISTS "Users can insert own services" ON public.services;
DROP POLICY IF EXISTS "Users can update own services" ON public.services;
DROP POLICY IF EXISTS "Users can delete own services" ON public.services;
DROP POLICY IF EXISTS "Services can view all" ON public.services;
DROP POLICY IF EXISTS "Services can insert own" ON public.services;
DROP POLICY IF EXISTS "Services can update own" ON public.services;
DROP POLICY IF EXISTS "Services can delete own" ON public.services;

-- Habilitar RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Crear políticas correctas
CREATE POLICY "Users can view own services"
  ON public.services
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own services"
  ON public.services
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own services"
  ON public.services
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own services"
  ON public.services
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- PASO 5: Configurar políticas RLS para users (permitir creación)
-- ============================================

-- Eliminar políticas existentes de users
DROP POLICY IF EXISTS "Users can insert own" ON public.users;
DROP POLICY IF EXISTS "Users can insert" ON public.users;
DROP POLICY IF EXISTS "Public users can insert" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.users;

-- Habilitar RLS en users si no está habilitado
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir INSERT en users
CREATE POLICY "Authenticated users can insert" ON public.users
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Política para SELECT (ver todos los usuarios, o solo los propios según tu necesidad)
DROP POLICY IF EXISTS "Users can view all" ON public.users;
CREATE POLICY "Users can view all" ON public.users
  FOR SELECT 
  TO authenticated
  USING (true);

-- Política para UPDATE
DROP POLICY IF EXISTS "Users can update own" ON public.users;
CREATE POLICY "Users can update own" ON public.users
  FOR UPDATE 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- PASO 6: Sincronizar usuarios de auth.users a public.users
-- ============================================

-- Eliminar DEFAULT del ID para poder insertar IDs manuales
DO $$
BEGIN
  ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignorar si no existe DEFAULT
END $$;

-- Sincronizar usuarios
INSERT INTO public.users (id, email)
SELECT id, email
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users WHERE id IS NOT NULL)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  updated_at = NOW();

-- ============================================
-- PASO 7: Crear índices para mejorar rendimiento
-- ============================================

CREATE INDEX IF NOT EXISTS idx_services_user_id ON public.services(user_id);
CREATE INDEX IF NOT EXISTS idx_services_barber_id ON public.services(barber_id);
CREATE INDEX IF NOT EXISTS idx_services_timestamp ON public.services(timestamp);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================
-- PASO 8: Verificación final
-- ============================================

SELECT 
  '✅ Configuración completada exitosamente' as mensaje,
  (SELECT COUNT(*) FROM public.users) as total_usuarios_public,
  (SELECT COUNT(*) FROM auth.users) as total_usuarios_auth,
  (SELECT conname FROM pg_constraint 
   WHERE conrelid = 'public.services'::regclass 
   AND confrelid = 'auth.users'::regclass 
   AND contype = 'f' 
   AND conkey::text LIKE '%user_id%'
   LIMIT 1) as foreign_key_constraint,
  (SELECT COUNT(*) FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename = 'services') as total_politicas_rls_services;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Si ves el mensaje "✅ Configuración completada exitosamente" arriba,
-- significa que todo se ejecutó correctamente.
-- Recarga tu aplicación y prueba registrar un corte.
-- ============================================

