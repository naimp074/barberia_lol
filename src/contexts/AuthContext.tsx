import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { findUserByEmail, saveUser } from '../lib/database';

interface AuthContextType {
  user: { id: string; email: string; created_at: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshUser = async () => {
    // Prevenir llamadas duplicadas
    if (isRefreshing) {
      console.log('⚠️ refreshUser ya está en ejecución, omitiendo llamada duplicada');
      return;
    }

    setIsRefreshing(true);
    try {
      console.log('🔄 refreshUser: Obteniendo usuario de Supabase Auth...');
      
      // Obtener usuario de Supabase (sin timeout agresivo, Supabase ya maneja su propio timeout)
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ Error obteniendo usuario de Auth:', authError);
        setUser(null);
        throw authError;
      }
      
      if (authUser) {
        console.log('✅ Usuario de Auth encontrado:', authUser.email);
        // Buscar o crear usuario en la tabla users
        console.log('🔍 Buscando usuario en DB...');
        
        // Buscar usuario en DB (con timeout más generoso)
        const findUserPromise = findUserByEmail(authUser.email!);
        const findUserTimeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: findUserByEmail tardó más de 10 segundos')), 10000)
        );
        
        let dbUser;
        try {
          dbUser = await Promise.race([findUserPromise, findUserTimeout]);
        } catch (timeoutError: any) {
          if (timeoutError.message?.includes('Timeout')) {
            console.warn('⚠️ Timeout en findUserByEmail, intentando continuar...');
            // Si falla la búsqueda, intentamos crear el usuario directamente
            dbUser = null;
          } else {
            throw timeoutError;
          }
        }
        
        if (!dbUser) {
          console.log('📝 Usuario no existe en DB, creando...');
          // Crear usuario en la tabla users si no existe
          try {
            // Crear usuario en DB (con timeout más generoso)
            const saveUserPromise = saveUser({ email: authUser.email! });
            const saveUserTimeout = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout: saveUser tardó más de 10 segundos')), 10000)
            );
            
            try {
              dbUser = await Promise.race([saveUserPromise, saveUserTimeout]);
            } catch (timeoutError: any) {
              if (timeoutError.message?.includes('Timeout')) {
                console.error('❌ Timeout al crear usuario en DB');
                throw new Error('Timeout: La creación del usuario tardó demasiado. Verifica tu conexión y permisos RLS.');
              }
              throw timeoutError;
            }
            
            if (!dbUser) {
              console.error('❌ Error al crear usuario en DB: saveUser retornó null');
              throw new Error('No se pudo crear el usuario en la base de datos. Verifica los permisos RLS.');
            }
            console.log('✅ Usuario creado en DB:', dbUser.id);
          } catch (saveError: any) {
            console.error('❌ Error en saveUser:', saveError);
            throw new Error(`Error al crear usuario: ${saveError.message || 'Error desconocido'}`);
          }
        } else {
          console.log('✅ Usuario encontrado en DB:', dbUser.id);
        }
        
        if (dbUser) {
          setUser({
            id: dbUser.id,
            email: dbUser.email,
            created_at: dbUser.created_at,
          });
          console.log('✅ Usuario actualizado en contexto - refreshUser completado');
        } else {
          console.warn('⚠️ dbUser es null después de buscar/crear');
          setUser(null);
          throw new Error('No se pudo obtener el usuario de la base de datos');
        }
      } else {
        console.log('⚠️ No hay usuario de Auth');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Error refreshing user:', error);
      setUser(null);
      throw error; // Re-lanzar para que el componente pueda manejarlo
    } finally {
      setIsRefreshing(false);
      console.log('✅ refreshUser finalizado (isRefreshing = false)');
    }
  };

  useEffect(() => {
    let safetyTimeout: NodeJS.Timeout | null = null;
    let subscription: { unsubscribe: () => void } | null = null;

    // Timeout de seguridad: siempre resetear loading después de 10 segundos máximo
    safetyTimeout = setTimeout(() => {
      console.warn('⚠️ Timeout de seguridad: reseteando loading después de 10 segundos');
      setLoading(false);
    }, 10000);

    // Verificar sesión actual
    const initAuth = async () => {
      try {
        console.log('🚀 Inicializando autenticación...');
        await refreshUser();
        console.log('✅ Inicialización de autenticación completada');
      } catch (error) {
        console.error('❌ Error inicializando autenticación:', error);
        setUser(null);
      } finally {
        if (safetyTimeout) {
          clearTimeout(safetyTimeout);
          safetyTimeout = null;
        }
        setLoading(false);
        console.log('✅ Loading reseteado después de initAuth');
      }
    };
    
    initAuth();

    // Escuchar cambios en la autenticación
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state changed:', event, session?.user?.email);
      
      let changeTimeout: NodeJS.Timeout | null = null;
      
      // Timeout de seguridad para onAuthStateChange
      changeTimeout = setTimeout(() => {
        console.warn('⚠️ Timeout de seguridad en onAuthStateChange: reseteando loading');
        setLoading(false);
      }, 10000);
      
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔐 Usuario autenticado, refrescando...');
          setLoading(true);
          await refreshUser();
          console.log('✅ Refresh completado después de SIGNED_IN');
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 Usuario cerró sesión');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Error en onAuthStateChange:', error);
        setUser(null);
      } finally {
        if (changeTimeout) {
          clearTimeout(changeTimeout);
        }
        setLoading(false);
        console.log('✅ Loading reseteado después de onAuthStateChange');
      }
    });

    subscription = authSubscription;

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
      }
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
