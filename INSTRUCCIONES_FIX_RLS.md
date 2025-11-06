# Instrucciones para Corregir las Políticas RLS en Supabase

Si los botones para registrar cortes no funcionan, es muy probable que sea un problema con las políticas RLS (Row Level Security) en Supabase. Sigue estos pasos:

## Opción 1: Ejecutar el Script SQL (Recomendado)

1. **Abre tu proyecto en Supabase Dashboard**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Ve a SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - O ve directamente a: `https://supabase.com/dashboard/project/[TU_PROJECT_ID]/sql`

3. **Copia y pega el siguiente script SQL:**

```sql
-- ============================================
-- Script para corregir las políticas RLS de services
-- ============================================

-- Eliminar todas las políticas existentes para services
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

-- Agregar columnas faltantes si no existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'barber_id'
  ) THEN
    ALTER TABLE public.services 
    ADD COLUMN barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'barber_name'
  ) THEN
    ALTER TABLE public.services 
    ADD COLUMN barber_name text;
  END IF;

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
```

4. **Haz clic en "Run" o presiona Ctrl+Enter para ejecutar el script**

5. **Verifica que se ejecutó correctamente**
   - Deberías ver un mensaje de éxito
   - Si hay errores, cópialos y compártelos

## Opción 2: Verificar Manualmente las Políticas

Si prefieres verificar manualmente:

1. **Ve a Authentication > Policies** o **Table Editor > services > RLS**
2. **Verifica que existan estas políticas:**
   - `Users can view own services` (SELECT)
   - `Users can insert own services` (INSERT)
   - `Users can update own services` (UPDATE)
   - `Users can delete own services` (DELETE)

3. **Verifica que todas usen la condición:**
   - `auth.uid() = user_id` para SELECT, UPDATE, DELETE
   - `WITH CHECK (auth.uid() = user_id)` para INSERT

## Verificar que la Tabla Existe

1. **Ve a Table Editor**
2. **Busca la tabla `services`**
3. **Verifica que tenga estas columnas:**
   - `id` (uuid, primary key)
   - `user_id` (uuid, references auth.users)
   - `name` (text)
   - `price` (integer)
   - `timestamp` (timestamptz)
   - `barber_id` (uuid, opcional)
   - `barber_name` (text, opcional)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz, opcional)

## Después de Aplicar las Correcciones

1. **Recarga la aplicación** en tu navegador
2. **Intenta registrar un corte nuevamente**
3. **Abre la consola del navegador (F12)** para ver los logs
4. **Si todavía hay errores**, comparte:
   - El mensaje de error de la consola
   - El código de error de Supabase (si aparece)

## Solución de Problemas

### Error: "new row violates row-level security policy"
- **Causa:** Las políticas RLS están bloqueando la inserción
- **Solución:** Ejecuta el script SQL de arriba

### Error: "column does not exist"
- **Causa:** Faltan columnas en la tabla
- **Solución:** El script SQL las agregará automáticamente

### Error: "permission denied"
- **Causa:** El usuario no está autenticado correctamente
- **Solución:** Asegúrate de estar logueado en la aplicación

## Notas Importantes

- El `user_id` en la tabla `services` DEBE coincidir con `auth.uid()` del usuario autenticado
- Las políticas RLS son obligatorias cuando RLS está habilitado
- Si deshabilitas RLS temporalmente para probar, recuerda volver a habilitarlo por seguridad

