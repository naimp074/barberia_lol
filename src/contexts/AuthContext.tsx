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
      
      // Agregar timeout a getUser
      const getUserPromise = supabase.auth.getUser();
      const getUserTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: getUser tardó más de 5 segundos')), 5000)
      );
      
      const { data: { user: authUser }, error: authError } = await Promise.race([
        getUserPromise,
        getUserTimeout
      ]) as any;
      
      if (authError) {
        console.error('❌ Error obteniendo usuario de Auth:', authError);
        setUser(null);
        throw authError;
      }
      
      if (authUser) {
        console.log('✅ Usuario de Auth encontrado:', authUser.email);
        // Buscar o crear usuario en la tabla users
        console.log('🔍 Buscando usuario en DB...');
        
        // Agregar timeout a findUserByEmail
        const findUserPromise = findUserByEmail(authUser.email!);
        const findUserTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: findUserByEmail tardó más de 5 segundos')), 5000)
        );
        
        let dbUser = await Promise.race([findUserPromise, findUserTimeout]) as any;
        
        if (!dbUser) {
          console.log('📝 Usuario no existe en DB, creando...');
          // Crear usuario en la tabla users si no existe
          try {
            // Agregar timeout a saveUser
            const saveUserPromise = saveUser({ email: authUser.email! });
            const saveUserTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout: saveUser tardó más de 5 segundos')), 5000)
            );
            
            dbUser = await Promise.race([saveUserPromise, saveUserTimeout]) as any;
            
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
    // Timeout de seguridad: siempre resetear loading después de 10 segundos máximo
    const safetyTimeout = setTimeout(() => {
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
        clearTimeout(safetyTimeout); // Limpiar timeout si todo fue bien
        setLoading(false);
        console.log('✅ Loading reseteado después de initAuth');
      }
    };
    
    initAuth();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state changed:', event, session?.user?.email);
      
      // Timeout de seguridad para onAuthStateChange
      const changeTimeout = setTimeout(() => {
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
        clearTimeout(changeTimeout); // Limpiar timeout si todo fue bien
        setLoading(false);
        console.log('✅ Loading reseteado después de onAuthStateChange');
      }
    });

    return () => {
      subscription.unsubscribe();
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
