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
    // Crear nuevo usuario
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: user.email,
      })
      .select()
      .single();

    if (error) {
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
        user_id: service.user_id!,
        name: service.name!,
        price: service.price!,
        barber_id: service.barber_id,
        barber_name: service.barber_name,
        timestamp: service.timestamp || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating service:', error);
      return null;
    }

    return data;
  }
}

export async function deleteService(serviceId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId)
    .eq('user_id', userId);

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

