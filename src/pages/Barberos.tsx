import React, { useState } from 'react';
import { Users, UserPlus, Edit, Trash2, Save, X } from 'lucide-react';
import { getServices, getBarbers, saveBarber, deleteBarber, Barber } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';


interface BarberWithStats extends Barber {
  services: number;
  earnings: number;
}

export function Barberos() {
  const { user } = useAuth();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barbersWithStats, setBarbersWithStats] = useState<BarberWithStats[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Barber>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBarber, setNewBarber] = useState({ name: '', email: '', phone: '' });

  // Cargar barberos desde la base de datos
  React.useEffect(() => {
    const loadData = async () => {
      if (user) {
        const allBarbers = await getBarbers();
        const services = await getServices(user.id);
        
        // Calcular estadísticas para cada barbero
        const barbersWithStatsData: BarberWithStats[] = allBarbers.map((barber) => {
          const barberServices = services.filter((s) => s.barber_id === barber.id);
          return {
            ...barber,
            services: barberServices.length,
            earnings: barberServices.reduce((sum, s) => sum + s.price, 0),
          };
        });

        setBarbers(allBarbers);
        setBarbersWithStats(barbersWithStatsData);
      }
    };
    loadData();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleEdit = (barber: Barber) => {
    setEditingId(barber.id);
    setEditForm({
      id: barber.id,
      name: barber.name,
      email: barber.email,
      phone: barber.phone,
    });
  };

  const handleSave = async (id: string) => {
    const updatedBarber = await saveBarber({
      id,
      name: editForm.name || '',
      email: editForm.email,
      phone: editForm.phone,
    });
    
    if (updatedBarber) {
      setBarbers((prev) =>
        prev.map((b) => (b.id === id ? updatedBarber : b))
      );
      setEditingId(null);
      setEditForm({});
      
      // Recargar estadísticas
      if (user) {
        const services = await getServices(user.id);
        const updatedStats = barbers.map((barber) => {
          const barberServices = services.filter((s) => s.barber_id === barber.id);
          return {
            ...barber,
            services: barberServices.length,
            earnings: barberServices.reduce((sum, s) => sum + s.price, 0),
          };
        });
        setBarbersWithStats(updatedStats);
      }
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este barbero?')) {
      const success = await deleteBarber(id);
      if (success) {
        setBarbers((prev) => prev.filter((b) => b.id !== id));
        setBarbersWithStats((prev) => prev.filter((b) => b.id !== id));
      }
    }
  };

  const handleAddBarber = async () => {
    if (newBarber.name.trim()) {
      const newBarberData = await saveBarber({
        name: newBarber.name,
        email: newBarber.email || undefined,
        phone: newBarber.phone || undefined,
      });
      
      if (newBarberData) {
        setBarbers((prev) => [...prev, newBarberData]);
        setBarbersWithStats((prev) => [
          ...prev,
          {
            ...newBarberData,
            services: 0,
            earnings: 0,
          },
        ]);
        setNewBarber({ name: '', email: '', phone: '' });
        setShowAddForm(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
              <span>Barberos</span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-base">Gestión de barberos</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Agregar Barbero
          </button>
        </div>

        {/* Formulario de agregar */}
        {showAddForm && (
          <div className="bg-transparent rounded-xl p-6 border border-gray-800 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Nuevo Barbero</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Nombre completo"
                value={newBarber.name}
                onChange={(e) => setNewBarber({ ...newBarber, name: e.target.value })}
                className="px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
              />
              <input
                type="email"
                placeholder="Email"
                value={newBarber.email}
                onChange={(e) => setNewBarber({ ...newBarber, email: e.target.value })}
                className="px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
              />
              <input
                type="tel"
                placeholder="Teléfono"
                value={newBarber.phone}
                onChange={(e) => setNewBarber({ ...newBarber, phone: e.target.value })}
                className="px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAddBarber}
                className="px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Guardar
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewBarber({ name: '', email: '', phone: '' });
                }}
                className="px-4 py-2 bg-white/5 border border-gray-800 text-white rounded-lg hover:bg-gray-800/30 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista de barberos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {barbersWithStats.map((barber) => (
            <div
              key={barber.id}
              className="bg-transparent rounded-xl p-6 border border-gray-800"
            >
              {editingId === barber.id ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-white"
                  />
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-white"
                    placeholder="Email"
                  />
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-white"
                    placeholder="Teléfono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(barber.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Guardar
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-gray-800 text-white rounded-lg hover:bg-gray-800/30 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">{barber.name}</h3>
                      {barber.email && (
                        <p className="text-gray-400 text-sm">{barber.email}</p>
                      )}
                      {barber.phone && (
                        <p className="text-gray-400 text-sm">{barber.phone}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(barber)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/30 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(barber.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-gray-700">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Servicios:</span>
                      <span className="text-white font-semibold">{barber.services}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ganancias:</span>
                      <span className="text-white font-bold">{formatCurrency(barber.earnings)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {barbers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No hay barberos registrados</p>
            <p className="text-gray-500 text-sm mt-2">Haz clic en "Agregar Barbero" para comenzar</p>
          </div>
        )}
      </div>
    </div>
  );
}

