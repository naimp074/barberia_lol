-- ============================================
-- SOLUCIÓN RÁPIDA PARA EL ERROR DE FOREIGN KEY
-- Ejecuta este script en Supabase SQL Editor
-- ============================================

-- Paso 1: Crear usuario en public.users para usuarios existentes de auth.users
-- Esto asegura que todos los usuarios autenticados tengan un registro en public.users
INSERT INTO public.users (id, email)
SELECT id, email
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users WHERE id IS NOT NULL)
ON CONFLICT (id) DO NOTHING;

-- Paso 2: Si hay conflicto con email único, usar UPDATE en lugar de INSERT
UPDATE public.users
SET email = auth.users.email
FROM auth.users
WHERE public.users.id = auth.users.id
  AND public.users.email != auth.users.email;

-- Verificar resultado
SELECT 
  'Usuarios sincronizados' as mensaje,
  COUNT(*) as total_usuarios_en_public_users
FROM public.users;

