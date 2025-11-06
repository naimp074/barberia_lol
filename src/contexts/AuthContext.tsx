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

  const refreshUser = async () => {
    try {
      console.log('🔄 refreshUser: Obteniendo usuario de Supabase Auth...');
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
        let dbUser = await findUserByEmail(authUser.email!);
        
        if (!dbUser) {
          console.log('📝 Usuario no existe en DB, creando...');
          // Crear usuario en la tabla users si no existe
          try {
            dbUser = await saveUser({ email: authUser.email! });
            
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
          console.log('✅ Usuario actualizado en contexto');
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
    }
  };

  useEffect(() => {
    // Verificar sesión actual
    const initAuth = async () => {
      try {
        await refreshUser();
      } catch (error) {
        console.error('Error inicializando autenticación:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state changed:', event);
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          await refreshUser();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      } catch (error) {
        console.error('Error en onAuthStateChange:', error);
      } finally {
        setLoading(false);
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
