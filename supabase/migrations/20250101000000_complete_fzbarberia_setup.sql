-- =============================================
-- MIGRACIÓN COMPLETA PARA FZ BARBERÍA
-- =============================================

-- 1. Crear tabla de servicios (ya existe, pero la mejoramos)
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price integer NOT NULL CHECK (price > 0),
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Crear tabla de tipos de servicios (para configuración)
CREATE TABLE IF NOT EXISTS service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price integer NOT NULL CHECK (price > 0),
  icon text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- 3. Crear tabla de clientes (opcional, para futuras mejoras)
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Crear tabla de citas (para futuras mejoras)
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  service_id uuid REFERENCES service_types(id) ON DELETE SET NULL,
  appointment_date timestamptz NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Crear tabla de configuraciones del usuario
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name text DEFAULT 'FZ Barbería',
  currency text DEFAULT 'CLP',
  timezone text DEFAULT 'America/Santiago',
  working_hours jsonb DEFAULT '{"start": "09:00", "end": "18:00", "days": [1,2,3,4,5,6]}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS DE SEGURIDAD PARA SERVICES
-- =============================================

-- Política para ver servicios propios
CREATE POLICY "Users can view own services"
  ON services FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política para insertar servicios propios
CREATE POLICY "Users can insert own services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política para actualizar servicios propios
CREATE POLICY "Users can update own services"
  ON services FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política para eliminar servicios propios
CREATE POLICY "Users can delete own services"
  ON services FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS DE SEGURIDAD PARA SERVICE_TYPES
-- =============================================

CREATE POLICY "Users can view own service types"
  ON service_types FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own service types"
  ON service_types FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own service types"
  ON service_types FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own service types"
  ON service_types FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS DE SEGURIDAD PARA CLIENTS
-- =============================================

CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS DE SEGURIDAD PARA APPOINTMENTS
-- =============================================

CREATE POLICY "Users can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS DE SEGURIDAD PARA USER_SETTINGS
-- =============================================

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =============================================

-- Índices para services
CREATE INDEX IF NOT EXISTS services_user_id_idx ON services(user_id);
CREATE INDEX IF NOT EXISTS services_timestamp_idx ON services(timestamp);
CREATE INDEX IF NOT EXISTS services_user_timestamp_idx ON services(user_id, timestamp);

-- Índices para service_types
CREATE INDEX IF NOT EXISTS service_types_user_id_idx ON service_types(user_id);
CREATE INDEX IF NOT EXISTS service_types_active_idx ON service_types(user_id, is_active);

-- Índices para clients
CREATE INDEX IF NOT EXISTS clients_user_id_idx ON clients(user_id);
CREATE INDEX IF NOT EXISTS clients_name_idx ON clients(user_id, name);

-- Índices para appointments
CREATE INDEX IF NOT EXISTS appointments_user_id_idx ON appointments(user_id);
CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS appointments_user_date_idx ON appointments(user_id, appointment_date);

-- =============================================
-- FUNCIONES DE TRIGGER PARA UPDATED_AT
-- =============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_services_updated_at 
  BEFORE UPDATE ON services 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_types_updated_at 
  BEFORE UPDATE ON service_types 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at 
  BEFORE UPDATE ON clients 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at 
  BEFORE UPDATE ON appointments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
  BEFORE UPDATE ON user_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INSERTAR DATOS INICIALES
-- =============================================

-- Función para crear tipos de servicios por defecto para nuevos usuarios
CREATE OR REPLACE FUNCTION create_default_service_types()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO service_types (user_id, name, price, icon) VALUES
    (NEW.id, 'Corte', 6500, '✂️'),
    (NEW.id, 'Corte y perfilado', 7000, '✂️✨'),
    (NEW.id, 'Corte y barba', 7500, '✂️🧔'),
    (NEW.id, 'Corte barba y perfilado', 8000, '✂️🧔✨'),
    (NEW.id, 'Barba', 3000, '🧔');
  
  -- Crear configuración por defecto con FZ Barbería
  INSERT INTO user_settings (user_id, business_name) VALUES (NEW.id, 'FZ Barbería');
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para crear datos por defecto cuando se registra un usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_service_types();

-- =============================================
-- VISTAS ÚTILES
-- =============================================

-- Vista para estadísticas diarias
CREATE OR REPLACE VIEW daily_stats AS
SELECT 
  user_id,
  DATE(timestamp) as date,
  COUNT(*) as service_count,
  SUM(price) as total_earnings
FROM services
GROUP BY user_id, DATE(timestamp);

-- Vista para estadísticas mensuales
CREATE OR REPLACE VIEW monthly_stats AS
SELECT 
  user_id,
  DATE_TRUNC('month', timestamp) as month,
  COUNT(*) as service_count,
  SUM(price) as total_earnings
FROM services
GROUP BY user_id, DATE_TRUNC('month', timestamp);

-- =============================================
-- COMENTARIOS FINALES
-- =============================================

COMMENT ON TABLE services IS 'Registro de servicios realizados en FZ Barbería';
COMMENT ON TABLE service_types IS 'Tipos de servicios disponibles y sus precios';
COMMENT ON TABLE clients IS 'Base de datos de clientes';
COMMENT ON TABLE appointments IS 'Sistema de citas';
COMMENT ON TABLE user_settings IS 'Configuraciones personalizadas del usuario';
