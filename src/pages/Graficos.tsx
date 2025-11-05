import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Calendar as CalendarIcon, Users } from 'lucide-react';
import { getServices, getBarbers } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';
import { Calendar } from '../components/Calendar';

interface Service {
  id: string;
  name: string;
  price: number;
  timestamp: string;
  barber_id?: string;
  barber_name?: string;
}

export function Graficos() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [barbers, setBarbers] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        try {
          const allServices = await getServices(user.id);
          setServices(allServices || []);
          const allBarbers = await getBarbers();
          setBarbers(allBarbers);
        } catch (error) {
          console.error('Error loading services:', error);
          setServices([]);
          setBarbers([]);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
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

  // Calcular ganancias por mes
  const getMonthlyEarnings = () => {
    const monthlyData: { [key: string]: number } = {};
    
    services.forEach((service) => {
      const date = new Date(service.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + service.price;
    });

    return Object.entries(monthlyData)
      .map(([month, total]) => ({
        month,
        total,
        date: new Date(month + '-01'),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-6); // Últimos 6 meses
  };

  // Calcular ganancias por día de la semana
  const getWeeklyEarnings = () => {
    const weeklyData: { [key: string]: number } = {};
    
    services.forEach((service) => {
      const date = new Date(service.timestamp);
      const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
      weeklyData[dayName] = (weeklyData[dayName] || 0) + service.price;
    });

    const daysOrder = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    return daysOrder.map((day) => ({
      day,
      total: weeklyData[day] || 0,
    }));
  };

  // Calcular servicios por tipo
  const getServicesByType = () => {
    const typeData: { [key: string]: { count: number; total: number } } = {};
    
    services.forEach((service) => {
      if (!typeData[service.name]) {
        typeData[service.name] = { count: 0, total: 0 };
      }
      typeData[service.name].count++;
      typeData[service.name].total += service.price;
    });

    return Object.entries(typeData)
      .map(([name, data]) => ({
        name,
        ...data,
      }))
      .sort((a, b) => b.total - a.total);
  };

  // Calcular datos por período (igual que en Dashboard)
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

  const todaysServices = getTodaysServices();
  const weeklyServices = getWeeklyServices();
  const monthlyServices = getMonthlyServices();
  const yearlyServices = getYearlyServices();

  const todayEarnings = calculateEarnings(todaysServices);
  const weekEarnings = calculateEarnings(weeklyServices);
  const monthEarnings = calculateEarnings(monthlyServices);
  const yearEarnings = calculateEarnings(yearlyServices);

  const periodData = [
    { label: 'Hoy', earnings: todayEarnings, count: todaysServices.length, color: 'from-green-500 to-green-400' },
    { label: 'Esta Semana', earnings: weekEarnings, count: weeklyServices.length, color: 'from-blue-500 to-blue-400' },
    { label: 'Este Mes', earnings: monthEarnings, count: monthlyServices.length, color: 'from-purple-500 to-purple-400' },
    { label: 'Este Año', earnings: yearEarnings, count: yearlyServices.length, color: 'from-orange-500 to-orange-400' },
  ];

  const maxEarnings = Math.max(...periodData.map((d) => d.earnings), 1);

  const monthlyData = getMonthlyEarnings();
  const weeklyData = getWeeklyEarnings();
  const servicesByType = getServicesByType();
  const maxMonthly = monthlyData.length > 0 ? Math.max(...monthlyData.map((d) => d.total), 1) : 1;
  const maxWeekly = weeklyData.length > 0 ? Math.max(...weeklyData.map((d) => d.total), 1) : 1;

  const totalEarnings = services.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalServices = services.length;

  // Calcular ganancias por barbero por período
  const getBarberEarningsByPeriod = (barberId: string, period: 'day' | 'week' | 'month' | 'year') => {
    const today = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
    }

    return services
      .filter((service) => {
        const serviceDate = new Date(service.timestamp);
        return service.barber_id === barberId && serviceDate >= startDate;
      })
      .reduce((total, service) => total + service.price, 0);
  };

  // Obtener datos de barberos con ganancias por período
  const getBarbersData = () => {
    return barbers.map((barber) => {
      const dayEarnings = getBarberEarningsByPeriod(barber.id, 'day');
      const weekEarnings = getBarberEarningsByPeriod(barber.id, 'week');
      const monthEarnings = getBarberEarningsByPeriod(barber.id, 'month');
      const yearEarnings = getBarberEarningsByPeriod(barber.id, 'year');

      const dayServices = services.filter((s) => {
        const serviceDate = new Date(s.timestamp);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return s.barber_id === barber.id && serviceDate >= today;
      }).length;

      const weekServices = services.filter((s) => {
        const serviceDate = new Date(s.timestamp);
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return s.barber_id === barber.id && serviceDate >= weekStart;
      }).length;

      const monthServices = services.filter((s) => {
        const serviceDate = new Date(s.timestamp);
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return s.barber_id === barber.id && serviceDate >= monthStart;
      }).length;

      const yearServices = services.filter((s) => {
        const serviceDate = new Date(s.timestamp);
        const today = new Date();
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return s.barber_id === barber.id && serviceDate >= yearStart;
      }).length;

      return {
        id: barber.id,
        name: barber.name,
        day: { earnings: dayEarnings, services: dayServices },
        week: { earnings: weekEarnings, services: weekServices },
        month: { earnings: monthEarnings, services: monthServices },
        year: { earnings: yearEarnings, services: yearServices },
      };
    });
  };

  const barbersData = getBarbersData();
  const maxBarberEarnings = Math.max(
    ...barbersData.flatMap((b) => [b.day.earnings, b.week.earnings, b.month.earnings, b.year.earnings]),
    1
  );

  // Convertir servicios a formato Date para el Calendar
  const servicesForCalendar = services
    .filter((service) => service.timestamp)
    .map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price,
      timestamp: new Date(service.timestamp),
    }))
    .filter((service) => !isNaN(service.timestamp.getTime())); // Filtrar fechas inválidas

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
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
            <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
            <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl">Gráficos y Estadísticas</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">Análisis de ganancias y servicios</p>
        </div>

        {/* Calendario */}
        <div className="mb-6 sm:mb-8">
          <Calendar
            services={servicesForCalendar}
            onDateSelect={setSelectedDate}
            selectedDate={selectedDate}
          />
        </div>

        {/* Gráfico de Períodos (Hoy, Semana, Mes, Año) */}
        <div className="bg-transparent rounded-xl p-6 border border-gray-800 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Ganancias por Período
          </h2>
          
          {/* Gráficos Visuales en Bloques de Color */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {periodData.map((period, index) => {
              const height = maxEarnings > 0 ? (period.earnings / maxEarnings) * 100 : 0;
              return (
                <div
                  key={index}
                  className={`bg-gradient-to-br ${period.color} rounded-xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden`}
                >
                  {/* Contenedor del gráfico visual decorativo */}
                  <div className="absolute inset-0 flex items-end justify-center pb-4 opacity-20">
                    <div className="w-full flex items-end justify-center gap-1.5 h-full px-4">
                      {/* Mini gráfico de barras decorativo */}
                      {Array.from({ length: 5 }).map((_, i) => {
                        // Distribución basada en la posición para un patrón visual
                        const baseHeight = 30 + (i * 15);
                        const variation = Math.sin(i * 0.8) * 20;
                        const barHeight = Math.min(100, Math.max(25, baseHeight + variation));
                        return (
                          <div
                            key={i}
                            className="bg-white/50 rounded-t w-2.5 shadow-sm"
                            style={{ height: `${barHeight}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Contenido visible */}
                  <div className="relative z-10">
                    <div className="mb-4">
                      <p className="text-white/90 text-sm font-medium mb-1">{period.label}</p>
                      <div className="h-32 bg-white/10 rounded-lg flex items-center justify-center mb-3 backdrop-blur-sm">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-white mb-1">
                            {formatCurrency(period.earnings)}
                          </p>
                          <div className="w-20 h-1 bg-white/30 rounded-full mx-auto">
                            <div
                              className={`h-full bg-white rounded-full transition-all duration-500`}
                              style={{ width: `${height}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-white/80 text-sm">{period.count} servicios</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gráfico de Barras Comparativo */}
          <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Comparación Visual</h3>
            <div className="flex items-end justify-between gap-4 h-64">
              {periodData.map((period, index) => {
                const height = maxEarnings > 0 ? (period.earnings / maxEarnings) * 100 : 0;
                const minHeight = height < 5 ? 5 : height;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center h-full">
                    <div className="w-full h-full relative flex flex-col justify-end">
                      <div
                        className={`w-full bg-gradient-to-t ${period.color} rounded-t-xl transition-all duration-500 hover:opacity-90 cursor-pointer relative group shadow-lg`}
                        style={{ height: `${minHeight}%`, minHeight: '30px' }}
                        title={`${period.label}: ${formatCurrency(period.earnings)}`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            {formatCurrency(period.earnings)}
                          </span>
                        </div>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap z-10 shadow-xl">
                          {formatCurrency(period.earnings)}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-black/90"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-center w-full">
                      <p className="text-white font-semibold text-sm mb-1">{period.label}</p>
                      <p className="text-gray-400 text-xs">{period.count} servicios</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-transparent rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-white" />
              <h3 className="text-white font-semibold">Total General</h3>
            </div>
            <p className="text-3xl font-bold text-white">{formatCurrency(totalEarnings)}</p>
            <p className="text-gray-400 text-sm mt-1">{totalServices} servicios registrados</p>
          </div>

          <div className="bg-transparent rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-white" />
              <h3 className="text-white font-semibold">Promedio por Servicio</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {formatCurrency(totalServices > 0 ? totalEarnings / totalServices : 0)}
            </p>
            <p className="text-gray-400 text-sm mt-1">Promedio de ganancia</p>
          </div>
        </div>

        {/* Gráfico de Ganancias Mensuales */}
        <div className="bg-transparent rounded-xl p-6 border border-gray-800 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6" />
            Ganancias Mensuales (Últimos 6 meses)
          </h2>
          <div className="space-y-4">
            {monthlyData.map((item) => {
              const percentage = (item.total / maxMonthly) * 100;
              const monthName = item.date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
              return (
                <div key={item.month}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium capitalize">{monthName}</span>
                    <span className="text-white font-bold">{formatCurrency(item.total)}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-6">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-400 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${percentage}%` }}
                    >
                      <span className="text-xs text-white font-semibold">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfico de Ganancias por Día de la Semana */}
        <div className="bg-transparent rounded-xl p-6 border border-gray-800 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Ganancias por Día de la Semana</h2>
          <div className="space-y-4">
            {weeklyData.map((item) => {
              const percentage = maxWeekly > 0 ? (item.total / maxWeekly) * 100 : 0;
              return (
                <div key={item.day}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium capitalize">{item.day}</span>
                    <span className="text-white font-bold">{formatCurrency(item.total)}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-6">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-400 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${percentage}%` }}
                    >
                      {item.total > 0 && (
                        <span className="text-xs text-white font-semibold">
                          {percentage.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

                {/* Servicios por Tipo */}
                <div className="bg-transparent rounded-xl p-6 border border-gray-800 mb-8">
                  <h2 className="text-2xl font-bold text-white mb-6">Servicios por Tipo</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {servicesByType.map((item) => (
                      <div
                        key={item.name}
                        className="bg-transparent rounded-lg p-4 border border-gray-800"
                      >
                        <h3 className="text-white font-semibold mb-2">{item.name}</h3>
                        <p className="text-2xl font-bold text-white mb-1">{formatCurrency(item.total)}</p>
                        <p className="text-gray-400 text-sm">{item.count} servicios</p>
                      </div>
                    ))}
                  </div>
                  {servicesByType.length === 0 && (
                    <p className="text-gray-400 text-center py-8">No hay servicios registrados</p>
                  )}
                </div>

                {/* Ganancias por Barbero */}
                {barbersData.length > 0 && (
                  <div className="bg-transparent rounded-xl p-6 border border-gray-800">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                      <Users className="w-6 h-6" />
                      Ganancias por Barbero
                    </h2>
                    
                    <div className="space-y-8">
                      {barbersData.map((barber) => (
                        <div key={barber.id} className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                          <h3 className="text-xl font-bold text-white mb-6">{barber.name}</h3>
                          
                          {/* Tarjetas de períodos */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {[
                              { label: 'Hoy', data: barber.day, color: 'from-green-500 to-green-400' },
                              { label: 'Esta Semana', data: barber.week, color: 'from-blue-500 to-blue-400' },
                              { label: 'Este Mes', data: barber.month, color: 'from-purple-500 to-purple-400' },
                              { label: 'Este Año', data: barber.year, color: 'from-orange-500 to-orange-400' },
                            ].map((period, index) => {
                              const percentage = maxBarberEarnings > 0 
                                ? (period.data.earnings / maxBarberEarnings) * 100 
                                : 0;
                              return (
                                <div
                                  key={index}
                                  className={`bg-gradient-to-br ${period.color} rounded-xl p-4 border border-white/20 shadow-lg`}
                                >
                                  <p className="text-white/90 text-sm font-medium mb-2">{period.label}</p>
                                  <p className="text-2xl font-bold text-white mb-1">
                                    {formatCurrency(period.data.earnings)}
                                  </p>
                                  <p className="text-white/80 text-xs">{period.data.services} servicios</p>
                                  <div className="mt-2 w-full bg-white/20 rounded-full h-2">
                                    <div
                                      className="bg-white rounded-full h-2 transition-all duration-500"
                                      style={{ width: `${Math.min(100, percentage)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Gráfico de barras comparativo */}
                          <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-800">
                            <h4 className="text-white font-semibold mb-4 text-sm">Comparación Visual</h4>
                            <div className="flex items-end justify-between gap-4 h-48">
                              {[
                                { label: 'Hoy', data: barber.day, color: 'from-green-500 to-green-400' },
                                { label: 'Semana', data: barber.week, color: 'from-blue-500 to-blue-400' },
                                { label: 'Mes', data: barber.month, color: 'from-purple-500 to-purple-400' },
                                { label: 'Año', data: barber.year, color: 'from-orange-500 to-orange-400' },
                              ].map((period, index) => {
                                const height = maxBarberEarnings > 0 
                                  ? (period.data.earnings / maxBarberEarnings) * 100 
                                  : 0;
                                const minHeight = height < 5 ? 5 : height;
                                return (
                                  <div key={index} className="flex-1 flex flex-col items-center h-full">
                                    <div className="w-full h-full relative flex flex-col justify-end">
                                      <div
                                        className={`w-full bg-gradient-to-t ${period.color} rounded-t-xl transition-all duration-500 hover:opacity-90 cursor-pointer relative group shadow-lg`}
                                        style={{ height: `${minHeight}%`, minHeight: '20px' }}
                                        title={`${period.label}: ${formatCurrency(period.data.earnings)}`}
                                      >
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <span className="text-white font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                            {formatCurrency(period.data.earnings)}
                                          </span>
                                        </div>
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 shadow-xl">
                                          {formatCurrency(period.data.earnings)}
                                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                            <div className="border-4 border-transparent border-t-black/90"></div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-2 text-center w-full">
                                      <p className="text-white font-semibold text-xs">{period.label}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {barbersData.length === 0 && (
                      <p className="text-gray-400 text-center py-8">
                        No hay barberos registrados. Ve a la sección "Barberos" para agregar uno.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        }

