import React, { useState, useEffect } from 'react';
import { Scissors, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getServices, 
  saveService, 
  deleteService,
  getBarbers,
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

  // Cargar tipos de servicio desde localStorage
  useEffect(() => {
    const savedServices = localStorage.getItem('fzbarberia_service_types');
    if (savedServices) {
      setServiceTypes(JSON.parse(savedServices));
    }
  }, []);

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
      console.error('No hay usuario autenticado');
      return;
    }

    if (!selectedBarber) {
      console.error('No hay barbero seleccionado');
      alert('Por favor, selecciona un barbero antes de registrar un servicio');
      return;
    }

    try {
      const selectedBarberData = barbers.find((b) => b.id === selectedBarber);
      console.log('Guardando servicio:', {
        user_id: user.id,
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
        console.log('Servicio guardado exitosamente:', newService);
        // Actualizar el estado local
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
      } else {
        console.error('Error: saveService retornó null');
        alert('Error al guardar el servicio. Por favor, intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error adding service:', error);
      alert('Error al guardar el servicio: ' + (error instanceof Error ? error.message : 'Error desconocido'));
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

  const getTodaysServices = () => {
    const today = new Date();
    return services.filter((service) => {
      const serviceDate = new Date(service.timestamp);
      return serviceDate.toDateString() === today.toDateString();
    });
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

  const todaysServices = getTodaysServices();

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
                {todaysServices.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No hay servicios registrados hoy</p>
                ) : (
                  <div className="space-y-3">
                    {todaysServices.map((service) => (
                      <div
                        key={service.id}
                        className="bg-transparent rounded-lg p-4 flex justify-between items-center border border-gray-800 group hover:bg-gray-800/30 transition-colors"
                      >
                      <div className="flex-1">
                        <p className="text-white font-medium">{service.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-gray-400 text-sm">
                            {service.timestamp.toLocaleTimeString('es-ES', {
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
                          <div className="text-white font-bold">{formatCurrency(service.price)}</div>
                          <button
                            onClick={() => deleteServiceHandler(service.id)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                            title="Eliminar servicio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
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
