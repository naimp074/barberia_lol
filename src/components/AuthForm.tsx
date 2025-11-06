import React, { useState } from 'react';
import { Scissors, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AuthFormProps {
  onSuccess: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const { refreshUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Iniciar sesión con Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Logging detallado para debugging
          console.error('🔴 Auth Error (signIn):', {
            name: error.name,
            message: error.message,
            status: error.status,
          });
          
          let errorMessage = error.message || 'Error al iniciar sesión';
          
          if (error.message?.includes('Email not confirmed')) {
            errorMessage = 'Por favor, verifica tu email antes de iniciar sesión.';
          } else if (error.message?.includes('Invalid login credentials')) {
            errorMessage = 'Email o contraseña incorrectos.';
          }
          
          throw new Error(errorMessage);
        }

        if (data.user) {
          // Login exitoso - refrescar usuario con timeout
          try {
            console.log('🔄 Refrescando usuario después de login...');
            const refreshPromise = refreshUser();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout: La operación tardó más de 5 segundos')), 5000)
            );
            
            await Promise.race([refreshPromise, timeoutPromise]);
            console.log('✅ Usuario refrescado correctamente');
            
            // Pequeño delay para asegurar que el estado se actualice
            setTimeout(() => {
              onSuccess();
            }, 100);
          } catch (err: any) {
            console.error('❌ Error en refreshUser:', err);
            const errorMsg = err.message || 'Error desconocido';
            
            if (errorMsg.includes('Timeout')) {
              setError('La operación está tardando demasiado. Por favor, recarga la página e intenta de nuevo.');
            } else {
              setError(`Error al actualizar la sesión: ${errorMsg}. Por favor, recarga la página.`);
            }
            setLoading(false);
          }
        } else {
          setError('No se recibió información del usuario. Por favor, intenta de nuevo.');
          setLoading(false);
        }
      } else {
        // Registrarse con Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          // Logging detallado para debugging
          console.error('🔴 Auth Error (signUp):', {
            name: error.name,
            message: error.message,
            status: error.status,
          });
          
          let errorMessage = error.message || 'Error al registrarse';
          
          if (error.message?.includes('already registered')) {
            errorMessage = 'Este email ya está registrado. Inicia sesión en su lugar.';
          }
          
          throw new Error(errorMessage);
        }

        if (data.user) {
          // Registro exitoso - refrescar usuario con timeout
          try {
            console.log('🔄 Refrescando usuario después de registro...');
            const refreshPromise = refreshUser();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout: La operación tardó más de 5 segundos')), 5000)
            );
            
            await Promise.race([refreshPromise, timeoutPromise]);
            console.log('✅ Usuario refrescado correctamente');
            
            // Pequeño delay para asegurar que el estado se actualice
            setTimeout(() => {
              onSuccess();
            }, 100);
          } catch (err: any) {
            console.error('❌ Error en refreshUser:', err);
            const errorMsg = err.message || 'Error desconocido';
            
            if (errorMsg.includes('Timeout')) {
              setError('La operación está tardando demasiado. Por favor, recarga la página e intenta de nuevo.');
            } else {
              setError(`Error al actualizar la sesión: ${errorMsg}. Por favor, recarga la página.`);
            }
            setLoading(false);
          }
        } else {
          setError('No se recibió información del usuario. Por favor, intenta de nuevo.');
          setLoading(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scissors className="w-10 h-10 text-gray-400" />
            <h1 className="text-4xl font-bold text-white">FZ Barbería</h1>
            <Scissors className="w-10 h-10 text-gray-400 scale-x-[-1]" />
          </div>
          <p className="text-gray-400">Sistema de Control de Ganancias</p>
        </div>

        <div className="bg-transparent rounded-xl p-8 border border-gray-800">
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-lg transition-all ${
                isLogin
                  ? 'bg-white text-black font-semibold'
                  : 'bg-transparent text-gray-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4 inline mr-2" />
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-lg transition-all ${
                !isLogin
                  ? 'bg-white text-black font-semibold'
                  : 'bg-transparent text-gray-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-white/5 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </button>
            
            {loading && (
              <button
                type="button"
                onClick={() => {
                  setLoading(false);
                  setError('Operación cancelada. Por favor, intenta de nuevo.');
                }}
                className="w-full mt-2 py-2 px-4 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
            )}
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          {isLogin
            ? '¿No tienes cuenta? Haz clic en "Registrarse"'
            : '¿Ya tienes cuenta? Haz clic en "Iniciar Sesión"'}
        </p>
      </div>
    </div>
  );
}
