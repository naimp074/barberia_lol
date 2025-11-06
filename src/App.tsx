import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AuthForm } from './components/AuthForm';
import { Navbar } from './components/Navbar';
import { Inicio } from './pages/Inicio';
import { Graficos } from './pages/Graficos';
import { Barberos } from './pages/Barberos';
import { Editar } from './pages/Editar';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { user, loading } = useAuth();
  const [forceShow, setForceShow] = useState(false);

  // Timeout de emergencia: si loading está en true por más de 15 segundos, forzar mostrar
  useEffect(() => {
    if (loading) {
      const emergencyTimeout = setTimeout(() => {
        console.warn('⚠️ EMERGENCIA: Loading está en true por más de 15 segundos, forzando mostrar login');
        setForceShow(true);
      }, 15000);

      return () => clearTimeout(emergencyTimeout);
    } else {
      setForceShow(false);
    }
  }, [loading]);

  if (loading && !forceShow) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Cargando...</div>
          <div className="text-gray-400 text-sm">Si esto tarda más de 15 segundos, se mostrará el login automáticamente</div>
        </div>
      </div>
    );
  }

  if (!user && !loading) {
    return (
      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={
              <AuthForm 
                onSuccess={() => {
                  // El contexto de autenticación se actualizará automáticamente
                  // y el componente App se re-renderizará con el usuario autenticado
                  console.log('✅ Login exitoso, esperando actualización del contexto...');
                  // No necesitamos hacer nada más, el contexto manejará el estado
                }} 
              />
            } 
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Inicio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/graficos"
          element={
            <ProtectedRoute>
              <Graficos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/barberos"
          element={
            <ProtectedRoute>
              <Barberos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editar"
          element={
            <ProtectedRoute>
              <Editar />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;