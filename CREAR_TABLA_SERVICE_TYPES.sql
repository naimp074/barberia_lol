-- ============================================
-- SCRIPT PARA CREAR TABLA service_types
-- Copia y pega TODO este contenido en Supabase SQL Editor
-- Ejecuta este script para crear la tabla de tipos de servicio
-- ============================================

-- ============================================
-- PASO 1: Crear tabla service_types
-- ============================================

CREATE TABLE IF NOT EXISTS public.service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  icon TEXT NOT NULL DEFAULT '✂️',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name) -- Evitar duplicados del mismo nombre por usuario
);

-- ============================================
-- PASO 2: Habilitar RLS (Row Level Security)
-- ============================================

ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 3: Eliminar políticas existentes (si las hay)
-- ============================================

DROP POLICY IF EXISTS "Users can view own service types" ON public.service_types;
DROP POLICY IF EXISTS "Users can insert own service types" ON public.service_types;
DROP POLICY IF EXISTS "Users can update own service types" ON public.service_types;
DROP POLICY IF EXISTS "Users can delete own service types" ON public.service_types;

-- ============================================
-- PASO 4: Crear políticas RLS
-- ============================================

-- Política para SELECT: Los usuarios pueden ver sus propios tipos de servicio
CREATE POLICY "Users can view own service types"
  ON public.service_types
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política para INSERT: Los usuarios pueden insertar sus propios tipos de servicio
CREATE POLICY "Users can insert own service types"
  ON public.service_types
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE: Los usuarios pueden actualizar sus propios tipos de servicio
CREATE POLICY "Users can update own service types"
  ON public.service_types
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política para DELETE: Los usuarios pueden eliminar sus propios tipos de servicio
CREATE POLICY "Users can delete own service types"
  ON public.service_types
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- PASO 5: Crear índices para mejorar rendimiento
-- ============================================

CREATE INDEX IF NOT EXISTS idx_service_types_user_id ON public.service_types(user_id);
CREATE INDEX IF NOT EXISTS idx_service_types_name ON public.service_types(name);

-- ============================================
-- PASO 6: Verificación final
-- ============================================

SELECT 
  '✅ Tabla service_types creada exitosamente' as mensaje,
  (SELECT COUNT(*) FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename = 'service_types') as total_politicas_rls,
  (SELECT COUNT(*) FROM pg_indexes 
   WHERE schemaname = 'public' 
   AND tablename = 'service_types') as total_indices;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Si ves el mensaje "✅ Tabla service_types creada exitosamente" arriba,
-- significa que todo se ejecutó correctamente.
-- Recarga tu aplicación y prueba editar los precios de nuevo.
-- ============================================

