-- ============================================
-- Agregar tabla de barberos y actualizar servicios
-- ============================================

-- Agregar columna barber_id a services si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'services' AND column_name = 'barber_id'
  ) THEN
    ALTER TABLE public.services 
    ADD COLUMN barber_id UUID REFERENCES public.barbers(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_services_barber_id ON public.services(barber_id);
  END IF;
END $$;

-- Agregar columna barber_name a services si no existe (para mantener compatibilidad)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'services' AND column_name = 'barber_name'
  ) THEN
    ALTER TABLE public.services 
    ADD COLUMN barber_name TEXT;
  END IF;
END $$;

