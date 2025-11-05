import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Scissors, Home, BarChart3, Users, Settings, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Navbar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-gray-950/95 backdrop-blur-md sticky top-0 z-50 border-b border-gray-800/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors" onClick={closeMenu}>
            <Scissors className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-lg sm:text-xl font-bold">FZ Barbería</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                isActive('/')
                  ? 'bg-white text-black font-semibold'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Inicio</span>
            </Link>

            <Link
              to="/graficos"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                isActive('/graficos')
                  ? 'bg-white text-black font-semibold'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Gráficos</span>
            </Link>

            <Link
              to="/barberos"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                isActive('/barberos')
                  ? 'bg-white text-black font-semibold'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Barberos</span>
            </Link>

            <Link
              to="/editar"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                isActive('/editar')
                  ? 'bg-white text-black font-semibold'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Editar</span>
            </Link>

            {/* Logout Button */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-red-500/20 transition-all text-sm"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
              <span>Salir</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-800/50 py-4">
            <div className="flex flex-col gap-2">
              <Link
                to="/"
                onClick={closeMenu}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive('/')
                    ? 'bg-white text-black font-semibold'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Home className="w-5 h-5" />
                <span>Inicio</span>
              </Link>

              <Link
                to="/graficos"
                onClick={closeMenu}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive('/graficos')
                    ? 'bg-white text-black font-semibold'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                <span>Gráficos</span>
              </Link>

              <Link
                to="/barberos"
                onClick={closeMenu}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive('/barberos')
                    ? 'bg-white text-black font-semibold'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Barberos</span>
              </Link>

              <Link
                to="/editar"
                onClick={closeMenu}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive('/editar')
                    ? 'bg-white text-black font-semibold'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span>Editar</span>
              </Link>

              <button
                onClick={() => {
                  closeMenu();
                  handleSignOut();
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-red-500/20 transition-all text-left"
              >
                <LogOut className="w-5 h-5" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

