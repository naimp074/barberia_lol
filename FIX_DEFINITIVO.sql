-- ============================================
-- FIX DEFINITIVO - Ejecuta este script en Supabase SQL Editor
-- Este script resuelve el problema de foreign key constraint
-- ============================================

-- PASO 1: Eliminar la constraint antigua que apunta a public.users
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Buscar la constraint que referencia public.users
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.services'::regclass
    AND confrelid = 'public.users'::regclass
    AND contype = 'f'
    AND conkey::text LIKE '%user_id%';
  
  IF constraint_name IS NOT NULL THEN
    RAISE NOTICE 'Eliminando constraint antigua: %', constraint_name;
    EXECUTE 'ALTER TABLE public.services DROP CONSTRAINT IF EXISTS ' || constraint_name;
  END IF;
END $$;

-- PASO 2: Crear la constraint correcta que apunta a auth.users
ALTER TABLE public.services 
DROP CONSTRAINT IF EXISTS services_user_id_fkey;

ALTER TABLE public.services 
ADD CONSTRAINT services_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- PASO 3: Crear usuarios en public.users para todos los usuarios de auth.users
-- Esto sincroniza las tablas
INSERT INTO public.users (id, email)
SELECT id, email
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users WHERE id IS NOT NULL)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- PASO 4: Verificar que las políticas RLS permitan INSERT en users
DROP POLICY IF EXISTS "Users can insert own" ON public.users;
CREATE POLICY "Users can insert own" ON public.users
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can insert" ON public.users;
CREATE POLICY "Users can insert" ON public.users
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Verificar resultado
SELECT 
  '✅ Fix completado' as mensaje,
  (SELECT COUNT(*) FROM public.users) as usuarios_en_public_users,
  (SELECT COUNT(*) FROM auth.users) as usuarios_en_auth_users;

