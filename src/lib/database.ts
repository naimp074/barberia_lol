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

export async function findUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No encontrado
    }
    console.error('Error finding user by ID:', error);
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
  const userId = user.id || authUser.id;
  const userEmail = user.email || authUser.email!;

  // Primero verificar si el usuario ya existe
  const existingUser = await findUserByEmail(userEmail);
  if (existingUser) {
    console.log('✅ Usuario ya existe en public.users:', existingUser.id);
    return existingUser;
  }

  // Intentar crear el usuario usando RPC o insert directo
  try {
    // Primero intentar insert directo
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: userEmail,
      })
      .select()
      .single();

    if (error) {
      // Si el error es porque el usuario ya existe (por unique constraint en email o id)
      if (error.code === '23505') {
        console.log('⚠️ Usuario ya existe (unique constraint), buscándolo...');
        const foundUser = await findUserByEmail(userEmail);
        if (foundUser) {
          return foundUser;
        }
        // Si no lo encuentra por email, intentar por ID
        const { data: userById } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        if (userById) {
          return userById;
        }
      }
      
      // Si hay otro error, intentar con RPC function
      console.warn('⚠️ Error en insert directo, intentando método alternativo...', error);
      
      // Intentar usando una función RPC si existe
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_user_if_not_exists', {
        user_id: userId,
        user_email: userEmail
      }).catch(() => ({ data: null, error: { message: 'RPC function not available' } }));
      
      if (!rpcError && rpcData) {
        return await findUserByEmail(userEmail);
      }
      
      console.error('❌ Error creating user:', error);
      return null;
    }

    console.log('✅ Usuario creado exitosamente en public.users:', data.id);
    return data;
  } catch (err: any) {
    console.error('❌ Error en saveUser:', err);
    return null;
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

  // CRÍTICO: Asegurar que el usuario existe en public.users ANTES de guardar el servicio
  // Esto es necesario si la foreign key apunta a public.users
  let userExists = false;
  let attempts = 0;
  const maxAttempts = 3;
  
  while (!userExists && attempts < maxAttempts) {
    attempts++;
    try {
      // Primero verificar por ID (más directo)
      let existingUser = await findUserById(userId);
      
      // Si no existe por ID, verificar por email
      if (!existingUser) {
        existingUser = await findUserByEmail(authUser.email!);
      }
      
      if (existingUser && existingUser.id === userId) {
        userExists = true;
        console.log('✅ Usuario existe en public.users:', existingUser.id);
        break;
      }
      
      // Si no existe o el ID no coincide, intentar crearlo
      console.log(`📝 Intento ${attempts}/${maxAttempts}: Creando usuario en public.users...`);
      
      // Intentar crear con upsert usando el ID específico
      const { data: upsertData, error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: authUser.email!,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select()
        .single();
      
      if (!upsertError && upsertData) {
        if (upsertData.id === userId) {
          userExists = true;
          console.log('✅ Usuario creado/actualizado exitosamente en public.users:', upsertData.id);
          break;
        }
      }
      
      // Si upsert falla, intentar insert directo
      if (upsertError) {
        console.log('⚠️ Upsert falló, intentando insert directo...', upsertError);
        const { data: insertData, error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: authUser.email!,
          })
          .select()
          .single();
        
        if (!insertError && insertData && insertData.id === userId) {
          userExists = true;
          console.log('✅ Usuario creado con insert directo:', insertData.id);
          break;
        } else if (insertError && insertError.code === '23505') {
          // Si el error es que ya existe, verificarlo
          const verified = await findUserById(userId);
          if (verified && verified.id === userId) {
            userExists = true;
            console.log('✅ Usuario ya existía (verificado después del error):', verified.id);
            break;
          }
        }
      }
      
      // Esperar un momento antes de reintentar
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (userError: any) {
      console.error(`❌ Error en intento ${attempts} de crear usuario:`, userError);
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }
  
  if (!userExists) {
    console.warn('⚠️ No se pudo crear/verificar usuario en public.users después de múltiples intentos');
    console.warn('⚠️ Continuando de todas formas - puede que la foreign key apunte a auth.users');
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
      
      // Si el error es de foreign key, el usuario definitivamente no existe
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        console.log('🔄 Error de foreign key detectado, forzando creación de usuario...');
        
        // Intentar múltiples métodos para crear el usuario
        let userCreated = false;
        
        // Método 1: Upsert
        try {
          const { data: upsertData, error: upsertError } = await supabase
            .from('users')
            .upsert({
              id: userId,
              email: authUser.email!,
            }, {
              onConflict: 'id',
              ignoreDuplicates: false
            })
            .select()
            .single();
          
          if (!upsertError && upsertData && upsertData.id === userId) {
            userCreated = true;
            console.log('✅ Usuario creado con upsert en reintento');
          }
        } catch (e) {
          console.warn('⚠️ Upsert falló en reintento:', e);
        }
        
        // Método 2: Insert directo si upsert falló
        if (!userCreated) {
          try {
            const { data: insertData, error: insertError } = await supabase
              .from('users')
              .insert({
                id: userId,
                email: authUser.email!,
              })
              .select()
              .single();
            
            if (!insertError && insertData && insertData.id === userId) {
              userCreated = true;
              console.log('✅ Usuario creado con insert en reintento');
            } else if (insertError && insertError.code === '23505') {
              // Ya existe, verificar
              const verified = await findUserById(userId);
              if (verified && verified.id === userId) {
                userCreated = true;
                console.log('✅ Usuario ya existía (verificado en reintento)');
              }
            }
          } catch (e) {
            console.warn('⚠️ Insert directo falló en reintento:', e);
          }
        }
        
        // Si el usuario fue creado/verificado, intentar insertar el servicio de nuevo
        if (userCreated) {
          console.log('🔄 Reintentando insertar servicio después de crear usuario...');
          
          // Esperar un momento para que la transacción se complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Intentar insertar el servicio de nuevo
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
            console.error('❌ Error en reintento después de crear usuario:', retryResult.error);
            throw new Error(`Error al guardar servicio después de crear usuario: ${retryResult.error.message}`);
          }
          
          console.log('✅ Servicio guardado exitosamente después de crear usuario');
          return retryResult.data;
        } else {
          throw new Error(`No se pudo crear el usuario en public.users. El user_id ${userId} no existe en la tabla users. Por favor, ejecuta el script SQL en Supabase.`);
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

