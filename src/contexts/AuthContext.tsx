import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
        return;
      }
      
      if (authUser) {
        console.log('✅ Usuario de Auth encontrado:', authUser.email);
        
        // Usar directamente el usuario de Auth - ya no necesitamos buscar en public.users
        // porque services.user_id ahora referencia auth.users directamente
        setUser({
          id: authUser.id,
          email: authUser.email!,
          created_at: authUser.created_at || new Date().toISOString(),
        });
        
        // Intentar crear el usuario en public.users en segundo plano (sin bloquear)
        // Esto es solo para mantener la consistencia de datos
        findUserByEmail(authUser.email!).then(dbUser => {
          if (!dbUser) {
            console.log('📝 Creando usuario en public.users en segundo plano...');
            saveUser({ email: authUser.email! }).then(createdUser => {
              if (createdUser) {
                console.log('✅ Usuario creado en public.users:', createdUser.id);
              }
            }).catch(err => {
              console.warn('⚠️ Error al crear usuario en public.users (no crítico):', err);
            });
          }
        }).catch(err => {
          console.warn('⚠️ Error al buscar usuario en public.users (no crítico):', err);
        });
        
        console.log('✅ Usuario actualizado en contexto - refreshUser completado');
      } else {
        console.log('⚠️ No hay usuario de Auth');
        setUser(null);
      }
    } catch (error: any) {
      console.error('❌ Error refreshing user:', error);
      // Si hay un error, intentar obtener el usuario de Auth una vez más
      try {
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
        }
      } catch (secondError) {
        console.error('❌ Error al obtener usuario en catch:', secondError);
        setUser(null);
      }
    } finally {
      setIsRefreshing(false);
      console.log('✅ refreshUser finalizado (isRefreshing = false)');
    }
  };

  const isProcessingAuthChangeRef = useRef(false);

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
      
      // Prevenir procesamiento múltiple del mismo evento
      if (isProcessingAuthChangeRef.current) {
        console.log('⚠️ onAuthStateChange ya está procesando, omitiendo...');
        return;
      }
      
      isProcessingAuthChangeRef.current = true;
      
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔐 Usuario autenticado, refrescando...');
          setLoading(true);
          await refreshUser();
          console.log('✅ Refresh completado después de SIGNED_IN');
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 Usuario cerró sesión');
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED') {
          // Solo refrescar si no hay usuario en el contexto
          if (!user) {
            console.log('🔄 Token refrescado, verificando usuario...');
            await refreshUser();
          }
        }
      } catch (error) {
        console.error('❌ Error en onAuthStateChange:', error);
        // Si hay error pero tenemos sesión, usar los datos de la sesión
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            created_at: session.user.created_at || new Date().toISOString(),
          });
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
        isProcessingAuthChangeRef.current = false;
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
