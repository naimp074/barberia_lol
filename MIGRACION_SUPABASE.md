# Migración a Supabase - FZ Barbería

## Resumen

Esta aplicación ha sido migrada de `localStorage` a Supabase para almacenamiento persistente en la nube.

## Archivos SQL de Migración

### 1. `supabase/migrations/20250115000000_complete_database_setup.sql`
Migración principal que crea todas las tablas necesarias:
- `users` - Usuarios del sistema
- `barbers` - Barberos
- `service_types` - Tipos de servicios
- `services` - Servicios registrados

### 2. `supabase/migrations/20250115000001_add_barbers_table.sql`
Agrega la columna `barber_id` y `barber_name` a la tabla `services` si no existe.

## Cómo Aplicar las Migraciones

### Opción 1: Desde Supabase Dashboard
1. Ve a tu proyecto en Supabase Dashboard
2. Ve a "SQL Editor"
3. Copia y pega el contenido de cada archivo de migración
4. Ejecuta cada migración en orden

### Opción 2: Usando Supabase CLI
```bash
# Si tienes Supabase CLI instalado
supabase db push
```

## Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

Puedes encontrar estos valores en:
- Supabase Dashboard → Settings → API

## Cambios Realizados

### Archivos Modificados

1. **`src/lib/database.ts`** (NUEVO)
   - Reemplaza `localStorage.ts`
   - Funciones asíncronas para interactuar con Supabase
   - Manejo de usuarios, servicios, barberos y tipos de servicio

2. **`src/contexts/AuthContext.tsx`**
   - Usa Supabase Auth en lugar de localStorage
   - Maneja autenticación real con email/password

3. **`src/components/AuthForm.tsx`**
   - Registro e inicio de sesión con Supabase Auth
   - Validación de contraseñas

4. **`src/components/Dashboard.tsx`**
   - Carga servicios desde Supabase
   - Guarda servicios en Supabase

5. **`src/pages/Barberos.tsx`**
   - Gestiona barberos en Supabase

6. **`src/pages/Graficos.tsx`**
   - Carga datos desde Supabase

7. **`src/pages/Editar.tsx`**
   - Gestiona tipos de servicio en Supabase

## Estructura de la Base de Datos

### Tabla: `users`
- `id` (UUID, Primary Key)
- `email` (TEXT, Unique)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### Tabla: `barbers`
- `id` (UUID, Primary Key)
- `name` (TEXT)
- `email` (TEXT, Optional)
- `phone` (TEXT, Optional)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### Tabla: `service_types`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users)
- `name` (TEXT)
- `price` (INTEGER)
- `icon` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- Unique constraint: `(user_id, name)`

### Tabla: `services`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users)
- `barber_id` (UUID, Foreign Key → barbers, Optional)
- `barber_name` (TEXT, Optional)
- `name` (TEXT)
- `price` (INTEGER)
- `timestamp` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## Seguridad (RLS)

Todas las tablas tienen Row Level Security (RLS) habilitado:
- Los usuarios solo pueden ver y modificar sus propios datos
- Los barberos son compartidos entre usuarios (puedes modificar esto si necesitas privacidad)

## Notas Importantes

1. **Autenticación**: Ahora se requiere una contraseña real para registrarse e iniciar sesión
2. **Datos Existentes**: Los datos en `localStorage` no se migran automáticamente. Si necesitas migrar datos existentes, necesitarás crear un script de migración.
3. **Primera Vez**: Cuando un usuario se registra por primera vez, se crea automáticamente un registro en la tabla `users`

## Próximos Pasos

1. Ejecutar las migraciones SQL en Supabase
2. Configurar las variables de entorno
3. Probar el registro e inicio de sesión
4. Verificar que todos los datos se guardan correctamente

## Solución de Problemas

### Error: "Las variables de entorno de Supabase no están configuradas"
- Verifica que el archivo `.env` existe y tiene las variables correctas
- Reinicia el servidor de desarrollo después de agregar las variables

### Error: "relation does not exist"
- Asegúrate de haber ejecutado todas las migraciones SQL
- Verifica que las tablas existen en Supabase Dashboard → Table Editor

### Error de autenticación
- Verifica que Supabase Auth esté habilitado en tu proyecto
- Revisa la configuración de email en Supabase Dashboard → Authentication → Settings

