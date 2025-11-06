import React, { useState, useEffect } from 'react';
import { Scissors, Calendar as CalendarIcon, Trash2, Edit2, Plus, Save, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  getServices, 
  saveService, 
  deleteService,
  getBarbers,
  getServiceTypes,
  Barber,
  Service as DatabaseService
} from '../lib/database';

interface Service {
  id: string;
  name: string;
  price: number;
  timestamp: Date;
  barber_id?: string;
  barber_name?: string;
}

interface ServiceType {
  name: string;
  price: number;
  icon: string;
}

const defaultServiceTypes: ServiceType[] = [
  { name: 'Corte', price: 6500, icon: '✂️' },
  { name: 'Corte y perfilado', price: 7000, icon: '✂️✨' },
  { name: 'Corte y barba', price: 7500, icon: '✂️🧔' },
  { name: 'Corte barba y perfilado', price: 8000, icon: '✂️🧔✨' },
  { name: 'Barba', price: 3000, icon: '🧔' },
];

export function Dashboard() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>(defaultServiceTypes);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Service>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newServiceForm, setNewServiceForm] = useState({
    name: '',
    price: 0,
    timestamp: new Date().toISOString().slice(0, 16), // Formato datetime-local
  });

  // Cargar tipos de servicio desde la base de datos
  useEffect(() => {
    const loadServiceTypes = async () => {
      if (user) {
        try {
          const dbServiceTypes = await getServiceTypes(user.id);
          if (dbServiceTypes.length > 0) {
            // Mapear los tipos de servicio de la BD al formato esperado
            const mappedTypes = dbServiceTypes.map(st => ({
              name: st.name,
              price: st.price,
              icon: st.icon || '✂️',
            }));
            setServiceTypes(mappedTypes);
            console.log('✅ Tipos de servicio cargados desde BD:', mappedTypes);
          } else {
            // Si no hay en BD, usar los valores por defecto
            console.log('⚠️ No hay tipos de servicio en BD, usando valores por defecto');
          }
        } catch (error) {
          console.error('Error loading service types:', error);
          // En caso de error, usar valores por defecto
        }
      }
    };
    loadServiceTypes();
  }, [user]);

  // Cargar barberos
  useEffect(() => {
    const loadBarbers = async () => {
      try {
        const allBarbers = await getBarbers();
        setBarbers(allBarbers);
        // Si hay barberos y no hay uno seleccionado, seleccionar el primero por defecto
        if (allBarbers.length > 0 && !selectedBarber) {
          setSelectedBarber(allBarbers[0].id);
        }
      } catch (error) {
        console.error('Error loading barbers:', error);
      }
    };
    loadBarbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadServices();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Recargar tipos de servicio cuando la ventana vuelve a estar activa
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        const loadServiceTypes = async () => {
          try {
            const dbServiceTypes = await getServiceTypes(user.id);
            if (dbServiceTypes.length > 0) {
              const mappedTypes = dbServiceTypes.map(st => ({
                name: st.name,
                price: st.price,
                icon: st.icon || '✂️',
              }));
              setServiceTypes(mappedTypes);
              console.log('🔄 Tipos de servicio recargados al volver a la ventana');
            }
          } catch (error) {
            console.error('Error reloading service types:', error);
          }
        };
        loadServiceTypes();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  const loadServices = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      const localServices = await getServices(user.id);
      
      // Ordenar por timestamp descendente (más recientes primero)
      const sortedServices = localServices
        .map((service) => ({
          id: service.id,
          name: service.name,
          price: service.price,
          timestamp: new Date(service.timestamp),
          barber_id: service.barber_id,
          barber_name: service.barber_name,
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setServices(sortedServices);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const addService = async (serviceType: ServiceType) => {
    if (!user) {
      console.error('❌ No hay usuario autenticado');
      alert('No hay usuario autenticado. Por favor, inicia sesión nuevamente.');
      return;
    }

    if (!selectedBarber) {
      console.error('❌ No hay barbero seleccionado');
      alert('Por favor, selecciona un barbero antes de registrar un servicio');
      return;
    }

    try {
      // Verificar autenticación de Supabase
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.error('❌ Error de autenticación:', authError);
        alert('Error de autenticación. Por favor, inicia sesión nuevamente.');
        return;
      }

      console.log('🔍 Verificación de autenticación:', {
        'auth.uid()': authUser.id,
        'user.id del contexto': user.id,
        'Coinciden': authUser.id === user.id,
      });

      const selectedBarberData = barbers.find((b) => b.id === selectedBarber);
      console.log('💾 Guardando servicio:', {
        user_id: user.id,
        auth_uid: authUser.id,
        name: serviceType.name,
        price: serviceType.price,
        barber_id: selectedBarber,
        barber_name: selectedBarberData?.name,
      });

      const newService = await saveService({
        user_id: user.id,
        name: serviceType.name,
        price: serviceType.price,
        timestamp: new Date().toISOString(),
        barber_id: selectedBarber || undefined,
        barber_name: selectedBarberData?.name || undefined,
      });

      if (newService) {
        console.log('✅ Servicio guardado exitosamente:', newService);
        // Actualizar el estado local inmediatamente
        setServices((prev) => [
          {
            id: newService.id,
            name: newService.name,
            price: newService.price,
            timestamp: new Date(newService.timestamp),
            barber_id: newService.barber_id,
            barber_name: newService.barber_name,
          },
          ...prev,
        ]);
        console.log('✅ Servicio registrado correctamente y agregado a la lista');
      } else {
        console.error('❌ Error: saveService retornó null');
        alert('Error al guardar el servicio. Por favor, verifica la consola (F12) para más detalles.');
      }
    } catch (error: any) {
      console.error('❌ Error adding service:', error);
      const errorMessage = error?.message || error?.toString() || 'Error desconocido';
      console.error('Mensaje de error completo:', errorMessage);
      
      // Si es un error de foreign key, mostrar instrucciones específicas
      if (errorMessage.includes('foreign key') || errorMessage.includes('Key is not present')) {
        alert(`❌ Error de configuración de base de datos\n\nEl problema es que la tabla 'services' está intentando referenciar un usuario que no existe.\n\nSOLUCIÓN:\n\n1. Ve a Supabase Dashboard → SQL Editor\n2. Abre el archivo ARREGLAR_AHORA.sql\n3. Copia TODO el contenido\n4. Pégalo en SQL Editor y ejecuta (Run)\n5. Recarga la aplicación y prueba de nuevo\n\nEste script corrige la configuración de la base de datos.`);
      } else {
        alert(`Error al guardar el servicio:\n\n${errorMessage}\n\nPor favor, verifica la consola (F12) para más detalles.`);
      }
    }
  };

  const deleteServiceHandler = async (serviceId: string) => {
    if (!user) return;

    try {
      const success = await deleteService(serviceId, user.id);
      if (success) {
        setServices((prev) => prev.filter((service) => service.id !== serviceId));
      }
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  const handleEditService = (service: Service) => {
    console.log('🔍 Editando servicio:', service);
    setEditingServiceId(service.id);
    setEditForm({
      name: service.name || '',
      price: service.price || 0,
      barber_id: service.barber_id || '',
      timestamp: service.timestamp,
    });
    console.log('✅ Formulario de edición inicializado:', {
      name: service.name,
      price: service.price,
      barber_id: service.barber_id,
    });
  };

  const getEditFormTimestampString = (): string => {
    try {
      if (!editForm.timestamp) {
        const now = new Date();
        return now.toISOString().slice(0, 16);
      }
      if (editForm.timestamp instanceof Date) {
        return editForm.timestamp.toISOString().slice(0, 16);
      }
      // Si es string o cualquier otro formato
      const date = new Date(editForm.timestamp);
      if (isNaN(date.getTime())) {
        return new Date().toISOString().slice(0, 16);
      }
      return date.toISOString().slice(0, 16);
    } catch (error) {
      console.error('Error al convertir timestamp:', error);
      return new Date().toISOString().slice(0, 16);
    }
  };

  const handleSaveEdit = async () => {
    if (!user || !editingServiceId) return;

    try {
      const serviceToUpdate = services.find(s => s.id === editingServiceId);
      if (!serviceToUpdate) return;

      const selectedBarberData = barbers.find((b) => b.id === editForm.barber_id);
      
      const timestamp = editForm.timestamp 
        ? new Date(editForm.timestamp).toISOString()
        : serviceToUpdate.timestamp.toISOString();

      const updatedService = await saveService({
        id: editingServiceId,
        name: editForm.name,
        price: editForm.price,
        barber_id: editForm.barber_id || undefined,
        barber_name: selectedBarberData?.name || undefined,
        timestamp: timestamp,
      });

      if (updatedService) {
        setServices((prev) =>
          prev.map((service) =>
            service.id === editingServiceId
              ? {
                  id: updatedService.id,
                  name: updatedService.name,
                  price: updatedService.price,
                  timestamp: new Date(updatedService.timestamp),
                  barber_id: updatedService.barber_id,
                  barber_name: updatedService.barber_name,
                }
              : service
          )
        );
        setEditingServiceId(null);
        setEditForm({});
      } else {
        alert('Error al actualizar el servicio. Por favor, intenta de nuevo.');
      }
    } catch (error: any) {
      console.error('Error updating service:', error);
      alert(`Error al actualizar el servicio: ${error?.message || 'Error desconocido'}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingServiceId(null);
    setEditForm({});
  };

  const handleAddCustomService = async () => {
    if (!user) {
      alert('No hay usuario autenticado. Por favor, inicia sesión nuevamente.');
      return;
    }

    if (!newServiceForm.name.trim() || newServiceForm.price <= 0) {
      alert('Por favor, completa el nombre y el precio del servicio.');
      return;
    }

    if (!selectedBarber) {
      alert('Por favor, selecciona un barbero antes de registrar un servicio');
      return;
    }

    try {
      const selectedBarberData = barbers.find((b) => b.id === selectedBarber);
      const timestamp = newServiceForm.timestamp 
        ? new Date(newServiceForm.timestamp).toISOString()
        : new Date().toISOString();

      const newService = await saveService({
        user_id: user.id,
        name: newServiceForm.name,
        price: newServiceForm.price,
        timestamp: timestamp,
        barber_id: selectedBarber || undefined,
        barber_name: selectedBarberData?.name || undefined,
      });

      if (newService) {
        setServices((prev) => [
          {
            id: newService.id,
            name: newService.name,
            price: newService.price,
            timestamp: new Date(newService.timestamp),
            barber_id: newService.barber_id,
            barber_name: newService.barber_name,
          },
          ...prev,
        ]);
        setNewServiceForm({
          name: '',
          price: 0,
          timestamp: new Date().toISOString().slice(0, 16),
        });
        setShowAddForm(false);
      } else {
        alert('Error al guardar el servicio. Por favor, intenta de nuevo.');
      }
    } catch (error: any) {
      console.error('Error adding custom service:', error);
      alert(`Error al guardar el servicio: ${error?.message || 'Error desconocido'}`);
    }
  };

  const getTodaysServices = () => {
    try {
      const today = new Date();
      const filtered = services.filter((service) => {
        try {
          if (!service || !service.timestamp) return false;
          const serviceDate = service.timestamp instanceof Date 
            ? service.timestamp 
            : new Date(service.timestamp);
          if (isNaN(serviceDate.getTime())) return false;
          return serviceDate.toDateString() === today.toDateString();
        } catch (error) {
          console.error('Error al filtrar servicio:', error, service);
          return false;
        }
      });
      return filtered;
    } catch (error) {
      console.error('Error en getTodaysServices:', error);
      return [];
    }
  };


  const getWeeklyServices = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return services.filter((service) => {
      const serviceDate = new Date(service.timestamp);
      return serviceDate >= weekStart;
    });
  };

  const getMonthlyServices = () => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    return services.filter((service) => {
      const serviceDate = new Date(service.timestamp);
      return serviceDate >= monthStart;
    });
  };

  const getYearlyServices = () => {
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);

    return services.filter((service) => {
      const serviceDate = new Date(service.timestamp);
      return serviceDate >= yearStart;
    });
  };

  const calculateEarnings = (serviceList: Service[]) => {
    return serviceList.reduce((total, service) => total + service.price, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const todaysServices = React.useMemo(() => {
    return getTodaysServices();
  }, [services]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Scissors className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">FZ Barbería</h1>
            <Scissors className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 scale-x-[-1]" />
          </div>
          <p className="text-gray-300 text-sm sm:text-base md:text-lg">Sistema de Control de Ganancias</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-gray-400 text-xs sm:text-sm">
            <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="px-2">
              {currentDate.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            <div className="bg-transparent rounded-xl p-4 sm:p-6 border border-gray-800">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">Registrar Servicio</h2>
              
              {/* Selector de Barbero */}
              {barbers.length > 0 && (
                <div className="mb-4">
                  <label htmlFor="barber-select" className="block text-sm font-medium text-gray-300 mb-2">
                    Seleccionar Barbero
                  </label>
                  <select
                    id="barber-select"
                    value={selectedBarber}
                    onChange={(e) => setSelectedBarber(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-white transition-colors"
                  >
                    {barbers.map((barber) => (
                      <option key={barber.id} value={barber.id}>
                        {barber.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {barbers.length === 0 && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm text-center">
                    No hay barberos registrados. Ve a la sección "Barberos" para agregar uno.
                  </p>
                </div>
              )}

              {/* Botón para agregar servicio personalizado */}
              <div className="mb-4">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-gray-700 rounded-lg text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {showAddForm ? 'Cancelar' : 'Agregar Servicio Personalizado'}
                </button>
              </div>

              {/* Formulario para agregar servicio personalizado */}
              {showAddForm && (
                <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-white font-semibold mb-3">Nuevo Servicio</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Nombre del servicio"
                      value={newServiceForm.name}
                      onChange={(e) => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
                    />
                    <input
                      type="number"
                      placeholder="Precio"
                      value={newServiceForm.price || ''}
                      onChange={(e) => setNewServiceForm({ ...newServiceForm, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
                      min="0"
                    />
                    <input
                      type="datetime-local"
                      value={newServiceForm.timestamp}
                      onChange={(e) => setNewServiceForm({ ...newServiceForm, timestamp: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-white"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddCustomService}
                        disabled={!selectedBarber || barbers.length === 0}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="w-4 h-4" />
                        Guardar
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setNewServiceForm({
                            name: '',
                            price: 0,
                            timestamp: new Date().toISOString().slice(0, 16),
                          });
                        }}
                        className="px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {serviceTypes.map((service, index) => (
                  <button
                    key={index}
                    onClick={() => addService(service)}
                    disabled={barbers.length === 0 || !selectedBarber}
                    className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white p-4 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{service.icon}</div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-sm">{service.name}</div>
                        <div className="text-lg font-bold">{formatCurrency(service.price)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-transparent rounded-xl p-4 sm:p-6 border border-gray-800">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">Servicios de Hoy</h2>
              <div className="max-h-96 overflow-y-auto">
                {(() => {
                  console.log('📊 Renderizando servicios:', {
                    totalServices: services.length,
                    todaysServicesCount: todaysServices.length,
                    editingServiceId,
                    servicesIds: services.map(s => s.id),
                    todaysServicesIds: todaysServices.map(s => s.id),
                  });
                  return null;
                })()}
                {todaysServices.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No hay servicios registrados hoy</p>
                ) : (
                  <div className="space-y-3">
                    {todaysServices.map((service) => {
                      if (!service || !service.id) {
                        console.error('⚠️ Servicio inválido encontrado:', service);
                        return null;
                      }
                      const isEditing = editingServiceId === service.id;
                      return (
                        <div key={service.id}>
                          {isEditing ? (
                            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                              <h3 className="text-white font-semibold mb-3">Editar Servicio</h3>
                              <div className="space-y-3">
                                <input
                                  type="text"
                                  value={editForm.name ?? service.name ?? ''}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    setEditForm((prev) => ({ ...prev, name: newValue }));
                                  }}
                                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-white"
                                  placeholder="Nombre del servicio"
                                />
                                <input
                                  type="number"
                                  value={editForm.price ?? service.price ?? ''}
                                  onChange={(e) => {
                                    const newValue = Number(e.target.value) || 0;
                                    setEditForm((prev) => ({ ...prev, price: newValue }));
                                  }}
                                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-white"
                                  placeholder="Precio"
                                  min="0"
                                />
                              {barbers.length > 0 && (
                                <select
                                  value={editForm.barber_id ?? service.barber_id ?? ''}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    setEditForm((prev) => ({ ...prev, barber_id: newValue }));
                                  }}
                                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-white"
                                >
                                  <option value="">Seleccionar barbero</option>
                                  {barbers.map((barber) => (
                                    <option key={barber.id} value={barber.id}>
                                      {barber.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <input
                                type="datetime-local"
                                value={getEditFormTimestampString()}
                                onChange={(e) => {
                                  try {
                                    const newTimestamp = e.target.value ? new Date(e.target.value) : service.timestamp;
                                    setEditForm((prev) => ({ 
                                      ...prev, 
                                      timestamp: newTimestamp
                                    }));
                                  } catch (error) {
                                    console.error('Error al actualizar timestamp:', error);
                                  }
                                }}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-white"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveEdit}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  <Save className="w-4 h-4" />
                                  Guardar
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-transparent rounded-lg p-4 flex justify-between items-center border border-gray-800 group hover:bg-gray-800/30 transition-colors">
                            <div className="flex-1">
                              <p className="text-white font-medium">{service.name || 'Sin nombre'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-gray-400 text-sm">
                                  {service.timestamp && service.timestamp instanceof Date
                                    ? service.timestamp.toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : new Date(service.timestamp).toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                </p>
                                {service.barber_name && (
                                  <>
                                    <span className="text-gray-600">•</span>
                                    <p className="text-gray-400 text-sm">
                                      Barbero: <span className="text-gray-300 font-medium">{service.barber_name}</span>
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-white font-bold">{formatCurrency(service.price || 0)}</div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditService(service);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all duration-200"
                                title="Editar servicio"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteServiceHandler(service.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                title="Eliminar servicio"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 text-gray-500">
          <p className="text-sm">© 2024 FZ Barbería - Sistema de Control de Ganancias</p>
        </div>
      </div>
    </div>
  );
}
