// Servicio de base de datos usando Supabase

import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  user_id: string;
  name: string;
  price: number;
  timestamp: string;
  barber_id?: string;
  barber_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Barber {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceType {
  id: string;
  user_id: string;
  name: string;
  price: number;
  icon: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Gestión de usuarios
// ============================================

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data || [];
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No encontrado
    }
    console.error('Error finding user:', error);
    return null;
  }

  return data;
}

export async function saveUser(user: Partial<User>): Promise<User | null> {
  // Obtener el usuario autenticado de Supabase Auth
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) {
    console.error('Error: No hay usuario autenticado para crear usuario en DB');
    return null;
  }

  // Usar el ID de auth.users como ID en public.users
  const userId = authUser.id;

  if (user.id) {
    // Actualizar usuario existente
    const { data, error } = await supabase
      .from('users')
      .update({
        email: user.email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return null;
    }

    return data;
  } else {
    // Crear nuevo usuario usando el ID de auth.users
    // Esto asegura que el ID coincida con auth.uid()
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId, // Usar el mismo ID que auth.users
        email: user.email || authUser.email!,
      })
      .select()
      .single();

    if (error) {
      // Si el error es porque el usuario ya existe, intentar buscarlo
      if (error.code === '23505') { // Unique violation
        console.log('Usuario ya existe, buscándolo...');
        return await findUserByEmail(authUser.email!);
      }
      console.error('Error creating user:', error);
      return null;
    }

    return data;
  }
}

// ============================================
// Gestión de servicios
// ============================================

export async function getServices(userId?: string): Promise<Service[]> {
  let query = supabase
    .from('services')
    .select('*')
    .order('timestamp', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching services:', error);
    return [];
  }

  return data || [];
}

export async function saveService(service: Partial<Service>): Promise<Service | null> {
  // Obtener el usuario actual de Supabase Auth para usar auth.uid()
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) {
    console.error('Error: No hay usuario autenticado');
    return null;
  }

  // Usar auth.uid() para cumplir con las políticas RLS
  const userId = authUser.id;

  // Asegurar que el usuario existe en public.users (por si la foreign key apunta ahí)
  // Esto es una solución temporal hasta que se ejecute el script SQL
  try {
    const existingUser = await findUserByEmail(authUser.email!);
    if (!existingUser) {
      console.log('📝 Usuario no existe en public.users, creándolo...');
      await saveUser({ 
        id: userId, // Usar el mismo ID que auth.users
        email: authUser.email! 
      });
      console.log('✅ Usuario creado en public.users');
    }
  } catch (userError) {
    console.warn('⚠️ Error al verificar/crear usuario en public.users (continuando):', userError);
    // Continuamos de todas formas, puede que la foreign key apunte a auth.users
  }

  if (service.id) {
    // Actualizar servicio existente
    const { data, error } = await supabase
      .from('services')
      .update({
        name: service.name,
        price: service.price,
        barber_id: service.barber_id,
        barber_name: service.barber_name,
        timestamp: service.timestamp,
        updated_at: new Date().toISOString(),
      })
      .eq('id', service.id)
      .eq('user_id', userId) // Asegurar que solo se actualice el servicio del usuario actual
      .select()
      .single();

    if (error) {
      console.error('Error updating service:', error);
      return null;
    }

    return data;
  } else {
    // Crear nuevo servicio
    const { data, error } = await supabase
      .from('services')
      .insert({
        user_id: userId, // Usar auth.uid() en lugar del user_id del parámetro
        name: service.name!,
        price: service.price!,
        barber_id: service.barber_id,
        barber_name: service.barber_name,
        timestamp: service.timestamp || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating service:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      console.error('User ID usado:', userId);
      console.error('Datos del servicio:', {
        name: service.name,
        price: service.price,
        barber_id: service.barber_id,
        timestamp: service.timestamp,
      });
      
      // Si el error es de foreign key, intentar crear el usuario primero
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        console.log('🔄 Intentando crear usuario en public.users para resolver foreign key...');
        try {
          await saveUser({ 
            id: userId,
            email: authUser.email! 
          });
          // Intentar insertar de nuevo
          const retryResult = await supabase
            .from('services')
            .insert({
              user_id: userId,
              name: service.name!,
              price: service.price!,
              barber_id: service.barber_id,
              barber_name: service.barber_name,
              timestamp: service.timestamp || new Date().toISOString(),
            })
            .select()
            .single();
          
          if (retryResult.error) {
            throw retryResult.error;
          }
          
          console.log('✅ Servicio guardado después de crear usuario');
          return retryResult.data;
        } catch (retryError: any) {
          console.error('❌ Error en reintento:', retryError);
        }
      }
      
      // Lanzar el error para que el componente pueda manejarlo
      throw new Error(`Error al guardar servicio: ${error.message}`);
    }

    return data;
  }
}

export async function deleteService(serviceId: string, userId: string): Promise<boolean> {
  // Obtener el usuario actual de Supabase Auth para usar auth.uid()
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) {
    console.error('Error: No hay usuario autenticado');
    return false;
  }

  // Usar auth.uid() para cumplir con las políticas RLS
  const currentUserId = authUser.id;

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId)
    .eq('user_id', currentUserId); // Usar auth.uid() en lugar del userId del parámetro

  if (error) {
    console.error('Error deleting service:', error);
    return false;
  }

  return true;
}

// ============================================
// Gestión de barberos
// ============================================

export async function getBarbers(): Promise<Barber[]> {
  const { data, error } = await supabase
    .from('barbers')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching barbers:', error);
    return [];
  }

  return data || [];
}

export async function getBarberById(barberId: string): Promise<Barber | null> {
  const { data, error } = await supabase
    .from('barbers')
    .select('*')
    .eq('id', barberId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error finding barber:', error);
    return null;
  }

  return data;
}

export async function saveBarber(barber: Partial<Barber>): Promise<Barber | null> {
  if (barber.id) {
    // Actualizar barbero existente
    const { data, error } = await supabase
      .from('barbers')
      .update({
        name: barber.name,
        email: barber.email,
        phone: barber.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', barber.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating barber:', error);
      return null;
    }

    return data;
  } else {
    // Crear nuevo barbero
    const { data, error } = await supabase
      .from('barbers')
      .insert({
        name: barber.name!,
        email: barber.email,
        phone: barber.phone,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating barber:', error);
      return null;
    }

    return data;
  }
}

export async function deleteBarber(barberId: string): Promise<boolean> {
  const { error } = await supabase
    .from('barbers')
    .delete()
    .eq('id', barberId);

  if (error) {
    console.error('Error deleting barber:', error);
    return false;
  }

  return true;
}

// ============================================
// Gestión de tipos de servicio
// ============================================

export async function getServiceTypes(userId: string): Promise<ServiceType[]> {
  const { data, error } = await supabase
    .from('service_types')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching service types:', error);
    return [];
  }

  return data || [];
}

export async function saveServiceType(serviceType: Partial<ServiceType>): Promise<ServiceType | null> {
  if (serviceType.id) {
    // Actualizar tipo de servicio existente
    const { data, error } = await supabase
      .from('service_types')
      .update({
        name: serviceType.name,
        price: serviceType.price,
        icon: serviceType.icon,
        updated_at: new Date().toISOString(),
      })
      .eq('id', serviceType.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service type:', error);
      return null;
    }

    return data;
  } else {
    // Crear nuevo tipo de servicio
    const { data, error } = await supabase
      .from('service_types')
      .insert({
        user_id: serviceType.user_id!,
        name: serviceType.name!,
        price: serviceType.price!,
        icon: serviceType.icon!,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating service type:', error);
      return null;
    }

    return data;
  }
}

export async function deleteServiceType(serviceTypeId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('service_types')
    .delete()
    .eq('id', serviceTypeId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting service type:', error);
    return false;
  }

  return true;
}

// ============================================
// Utilidades
// ============================================

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

