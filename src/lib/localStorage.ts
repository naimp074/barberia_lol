// Servicio de almacenamiento local para usuarios y servicios

export interface LocalUser {
  id: string;
  email: string;
  created_at: string;
}

export interface LocalService {
  id: string;
  user_id: string;
  name: string;
  price: number;
  timestamp: string;
  barber_id?: string;
  barber_name?: string;
}

export interface LocalBarber {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

const USERS_KEY = 'fzbarberia_users';
const SERVICES_KEY = 'fzbarberia_services';
const CURRENT_USER_KEY = 'fzbarberia_current_user';
const BARBERS_KEY = 'fzbarberia_barbers';

// ============================================
// Gestión de usuarios
// ============================================

export function getUsers(): LocalUser[] {
  const usersJson = localStorage.getItem(USERS_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
}

export function saveUser(user: LocalUser): void {
  const users = getUsers();
  const existingIndex = users.findIndex((u) => u.id === user.id);
  
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function findUserByEmail(email: string): LocalUser | null {
  const users = getUsers();
  return users.find((u) => u.email === email) || null;
}

export function getCurrentUser(): LocalUser | null {
  const userJson = localStorage.getItem(CURRENT_USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
}

export function setCurrentUser(user: LocalUser | null): void {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

// ============================================
// Gestión de servicios
// ============================================

export function getServices(userId?: string): LocalService[] {
  const servicesJson = localStorage.getItem(SERVICES_KEY);
  const allServices: LocalService[] = servicesJson ? JSON.parse(servicesJson) : [];
  
  if (userId) {
    return allServices.filter((s) => s.user_id === userId);
  }
  
  return allServices;
}

export function saveService(service: LocalService): void {
  const services = getServices();
  const existingIndex = services.findIndex((s) => s.id === service.id);
  
  if (existingIndex >= 0) {
    services[existingIndex] = service;
  } else {
    services.push(service);
  }
  
  localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
}

export function deleteService(serviceId: string, userId: string): void {
  const services = getServices();
  const filtered = services.filter(
    (s) => !(s.id === serviceId && s.user_id === userId)
  );
  localStorage.setItem(SERVICES_KEY, JSON.stringify(filtered));
}

// ============================================
// Utilidades
// ============================================

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Gestión de barberos
// ============================================

export function getBarbers(): LocalBarber[] {
  const barbersJson = localStorage.getItem(BARBERS_KEY);
  return barbersJson ? JSON.parse(barbersJson) : [];
}

export function saveBarber(barber: LocalBarber): void {
  const barbers = getBarbers();
  const existingIndex = barbers.findIndex((b) => b.id === barber.id);
  
  if (existingIndex >= 0) {
    barbers[existingIndex] = barber;
  } else {
    barbers.push(barber);
  }
  
  localStorage.setItem(BARBERS_KEY, JSON.stringify(barbers));
}

export function deleteBarber(barberId: string): void {
  const barbers = getBarbers();
  const filtered = barbers.filter((b) => b.id !== barberId);
  localStorage.setItem(BARBERS_KEY, JSON.stringify(filtered));
}

export function getBarberById(barberId: string): LocalBarber | null {
  const barbers = getBarbers();
  return barbers.find((b) => b.id === barberId) || null;
}

