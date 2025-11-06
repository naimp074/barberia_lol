-- ============================================
-- ARREGLAR AHORA - Script SQL DEFINITIVO
-- Ejecuta esto en Supabase SQL Editor
-- ============================================

-- PASO 1: Eliminar TODAS las constraints de foreign key existentes en services.user_id
DO $$
DECLARE
  r RECORD;
BEGIN
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

-- PASO 2: Crear la constraint CORRECTA que apunta a auth.users
ALTER TABLE public.services 
ADD CONSTRAINT services_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- PASO 3: Asegurar que las políticas RLS permitan INSERT en users
DROP POLICY IF EXISTS "Users can insert own" ON public.users;
DROP POLICY IF EXISTS "Users can insert" ON public.users;
DROP POLICY IF EXISTS "Public users can insert" ON public.users;

CREATE POLICY "Authenticated users can insert" ON public.users
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- PASO 4: Sincronizar usuarios de auth.users a public.users
INSERT INTO public.users (id, email)
SELECT id, email
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users WHERE id IS NOT NULL)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  updated_at = NOW();

-- PASO 5: Verificar que todo esté correcto
SELECT 
  '✅ Configuración completada' as mensaje,
  (SELECT COUNT(*) FROM public.users) as usuarios_public,
  (SELECT COUNT(*) FROM auth.users) as usuarios_auth,
  (SELECT conname FROM pg_constraint 
   WHERE conrelid = 'public.services'::regclass 
   AND confrelid = 'auth.users'::regclass 
   AND contype = 'f' 
   LIMIT 1) as constraint_apunta_a_auth_users;

