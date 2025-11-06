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
      
      // Obtener usuario de Supabase
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
          dbUser = await saveUser({ email: authUser.email! });
          
          if (!dbUser) {
            console.error('❌ Error al crear usuario en DB: saveUser retornó null');
            // Si no se puede crear, usar datos del usuario de Auth directamente
            console.warn('⚠️ Usando datos del usuario de Auth directamente');
            setUser({
              id: authUser.id,
              email: authUser.email!,
              created_at: authUser.created_at || new Date().toISOString(),
            });
            return;
          }
          console.log('✅ Usuario creado en DB:', dbUser.id);
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
          console.warn('⚠️ dbUser es null después de buscar/crear, usando Auth user');
          setUser({
            id: authUser.id,
            email: authUser.email!,
            created_at: authUser.created_at || new Date().toISOString(),
          });
        }
      } else {
        console.log('⚠️ No hay usuario de Auth');
        setUser(null);
      }
    } catch (error: any) {
      console.error('❌ Error refreshing user:', error);
      // Si hay un error pero tenemos un usuario de Auth, usar ese
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        console.warn('⚠️ Error en refreshUser pero usuario de Auth disponible, usando datos de Auth');
        setUser({
          id: authUser.id,
          email: authUser.email!,
          created_at: authUser.created_at || new Date().toISOString(),
        });
      } else {
        setUser(null);
        throw error;
      }
    } finally {
      setIsRefreshing(false);
      console.log('✅ refreshUser finalizado (isRefreshing = false)');
    }
  };

  useEffect(() => {
    let safetyTimeout: NodeJS.Timeout | null = null;
    let subscription: { unsubscribe: () => void } | null = null;

    // Timeout de seguridad: siempre resetear loading después de 15 segundos máximo
    safetyTimeout = setTimeout(() => {
      console.warn('⚠️ Timeout de seguridad: reseteando loading después de 15 segundos');
      setLoading(false);
    }, 15000);

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
      
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔐 Usuario autenticado, refrescando...');
          setLoading(true);
          await refreshUser();
          console.log('✅ Refresh completado después de SIGNED_IN');
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 Usuario cerró sesión');
          setUser(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          // Solo refrescar si no hay usuario en el contexto
          if (!user) {
            console.log('🔄 Token refrescado, verificando usuario...');
            await refreshUser();
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Error en onAuthStateChange:', error);
        // No establecer user como null si hay un error, puede ser temporal
        setLoading(false);
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
