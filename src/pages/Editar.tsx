import React, { useState, useEffect } from 'react';
import { Settings, Save, DollarSign, Scissors, Edit2, Trash2, Plus, X, Calendar } from 'lucide-react';
import { 
  getServiceTypes, 
  saveServiceType, 
  deleteServiceType, 
  ServiceType as DatabaseServiceType,
  getServices,
  saveService,
  deleteService,
  getBarbers,
  Barber,
  Service as DatabaseService
} from '../lib/database';
import { useAuth } from '../contexts/AuthContext';

interface ServiceType {
  id?: string;
  name: string;
  price: number;
  icon: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  timestamp: Date;
  barber_id?: string;
  barber_name?: string;
}

export function Editar() {
  const { user } = useAuth();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([
    { name: 'Corte', price: 6500, icon: '✂️' },
    { name: 'Corte y perfilado', price: 7000, icon: '✂️✨' },
    { name: 'Corte y barba', price: 7500, icon: '✂️🧔' },
    { name: 'Corte barba y perfilado', price: 8000, icon: '✂️🧔✨' },
    { name: 'Barba', price: 3000, icon: '🧔' },
  ]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ServiceType>({ name: '', price: 0, icon: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newService, setNewService] = useState<ServiceType>({ name: '', price: 0, icon: '✂️' });
  
  // Estados para servicios registrados
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceForm, setEditServiceForm] = useState<Partial<Service>>({});
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [newServiceForm, setNewServiceForm] = useState({
    name: '',
    price: 0,
    timestamp: new Date().toISOString().slice(0, 16),
    barber_id: '',
  });
  const [activeTab, setActiveTab] = useState<'types' | 'services'>('types');

  // Cargar tipos de servicio desde la base de datos
  useEffect(() => {
    const loadServiceTypes = async () => {
      if (user) {
        try {
          const dbServiceTypes = await getServiceTypes(user.id);
          if (dbServiceTypes.length > 0) {
            // Si hay tipos en BD, usarlos
            setServiceTypes(dbServiceTypes.map(st => ({
              id: st.id,
              name: st.name,
              price: st.price,
              icon: st.icon,
            })));
            console.log('✅ Tipos de servicio cargados desde BD:', dbServiceTypes.length);
          } else {
            // Si no hay en BD, crear los tipos por defecto
            console.log('📝 No hay tipos de servicio en BD, creando tipos por defecto...');
            const defaultTypesToCreate = [
              { name: 'Corte', price: 6500, icon: '✂️' },
              { name: 'Corte y perfilado', price: 7000, icon: '✂️✨' },
              { name: 'Corte y barba', price: 7500, icon: '✂️🧔' },
              { name: 'Corte barba y perfilado', price: 8000, icon: '✂️🧔✨' },
              { name: 'Barba', price: 3000, icon: '🧔' },
            ];
            
            const createdTypes = [];
            for (const type of defaultTypesToCreate) {
              try {
                const created = await saveServiceType({
                  user_id: user.id,
                  name: type.name,
                  price: type.price,
                  icon: type.icon,
                });
                if (created) {
                  createdTypes.push({
                    id: created.id,
                    name: created.name,
                    price: created.price,
                    icon: created.icon,
                  });
                }
              } catch (error) {
                console.error(`Error creando tipo ${type.name}:`, error);
              }
            }
            
            if (createdTypes.length > 0) {
              setServiceTypes(createdTypes);
              console.log('✅ Tipos de servicio por defecto creados:', createdTypes.length);
            } else {
              // Si no se pudieron crear, usar los valores por defecto sin ID
              setServiceTypes(defaultTypesToCreate.map(t => ({ ...t, id: undefined })));
            }
          }
        } catch (error: any) {
          console.error('Error loading service types:', error);
          const errorMessage = error?.message || 'Error desconocido';
          
          // Si la tabla no existe, mostrar mensaje pero aún así permitir usar valores por defecto
          if (errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorMessage.includes('service_types')) {
            console.warn('⚠️ La tabla service_types no existe. Ejecuta el script CREAR_TABLA_SERVICE_TYPES.sql en Supabase.');
            // Mostrar alerta solo una vez
            if (!localStorage.getItem('service_types_table_warning_shown')) {
              alert('⚠️ La tabla "service_types" no existe en Supabase.\n\nPara poder editar precios, ejecuta el script SQL:\n\n1. Ve a Supabase Dashboard → SQL Editor\n2. Abre CREAR_TABLA_SERVICE_TYPES.sql\n3. Copia y pega TODO el contenido\n4. Ejecuta (Run)\n5. Recarga la aplicación\n\nMientras tanto, puedes usar los valores por defecto.');
              localStorage.setItem('service_types_table_warning_shown', 'true');
            }
          }
          
          // En caso de error, usar valores por defecto
          setServiceTypes([
            { name: 'Corte', price: 6500, icon: '✂️' },
            { name: 'Corte y perfilado', price: 7000, icon: '✂️✨' },
            { name: 'Corte y barba', price: 7500, icon: '✂️🧔' },
            { name: 'Corte barba y perfilado', price: 8000, icon: '✂️🧔✨' },
            { name: 'Barba', price: 3000, icon: '🧔' },
          ]);
        }
      }
    };
    loadServiceTypes();
  }, [user]);

  // Cargar servicios registrados
  useEffect(() => {
    const loadServices = async () => {
      if (user) {
        try {
          const dbServices = await getServices(user.id);
          const sortedServices = dbServices
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
        }
      }
    };
    loadServices();
  }, [user]);

  // Cargar barberos
  useEffect(() => {
    const loadBarbers = async () => {
      try {
        const allBarbers = await getBarbers();
        setBarbers(allBarbers);
        if (allBarbers.length > 0 && !newServiceForm.barber_id) {
          setNewServiceForm(prev => ({ ...prev, barber_id: allBarbers[0].id }));
        }
      } catch (error) {
        console.error('Error loading barbers:', error);
      }
    };
    loadBarbers();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm(serviceTypes[index]);
  };

  const handleSave = async (index: number) => {
    if (!user) {
      alert('No hay usuario autenticado. Por favor, inicia sesión nuevamente.');
      return;
    }
    
    // Validar que el formulario tenga datos válidos
    if (!editForm.name || editForm.name.trim() === '') {
      alert('Por favor, ingresa un nombre para el servicio.');
      return;
    }
    
    if (!editForm.price || editForm.price <= 0) {
      alert('Por favor, ingresa un precio válido (mayor a 0).');
      return;
    }
    
    const currentService = serviceTypes[index];
    console.log('💾 Guardando servicio:', {
      index,
      currentService,
      editForm,
      hasId: !!currentService.id,
    });
    
    try {
      let updatedService: DatabaseServiceType | null = null;
      
      // Si el servicio tiene ID, actualizarlo directamente
      if (currentService.id) {
        console.log('📝 Actualizando servicio con ID:', currentService.id);
        updatedService = await saveServiceType({
          id: currentService.id,
          user_id: user.id,
          name: editForm.name.trim(),
          price: editForm.price,
          icon: editForm.icon || '✂️',
        });
        
        if (!updatedService) {
          console.error('❌ Error: saveServiceType retornó null para ID:', currentService.id);
          alert('Error al actualizar el servicio. Por favor, verifica la consola (F12) para más detalles.');
          return;
        }
        console.log('✅ Servicio actualizado exitosamente:', updatedService);
      } else {
        // Si no tiene ID, buscar por nombre original
        console.log('🔍 Buscando servicio por nombre:', currentService.name);
        const dbServices = await getServiceTypes(user.id);
        console.log('📋 Servicios encontrados en BD:', dbServices);
        
        // Buscar por nombre original primero
        let dbService = dbServices.find(s => s.name === currentService.name);
        
        // Si no se encuentra por nombre original, buscar por nombre editado
        if (!dbService) {
          dbService = dbServices.find(s => s.name === editForm.name.trim());
        }
        
        if (dbService) {
          console.log('✅ Servicio encontrado en BD, actualizando:', dbService.id);
          // Actualizar servicio existente
          updatedService = await saveServiceType({
            id: dbService.id,
            user_id: user.id,
            name: editForm.name.trim(),
            price: editForm.price,
            icon: editForm.icon || '✂️',
          });
          
          if (!updatedService) {
            console.error('❌ Error: saveServiceType retornó null para ID:', dbService.id);
            alert('Error al actualizar el servicio. Por favor, verifica la consola (F12) para más detalles.');
            return;
          }
          console.log('✅ Servicio actualizado exitosamente:', updatedService);
        } else {
          console.log('📝 Servicio no encontrado en BD, creando nuevo');
          // Crear nuevo servicio
          updatedService = await saveServiceType({
            user_id: user.id,
            name: editForm.name.trim(),
            price: editForm.price,
            icon: editForm.icon || '✂️',
          });
          
          if (!updatedService) {
            console.error('❌ Error: saveServiceType retornó null al crear nuevo servicio');
            // Intentar crear con el nombre original si el nuevo nombre no funcionó
            if (editForm.name.trim() !== currentService.name) {
              console.log('🔄 Intentando crear con nombre original...');
              const retryService = await saveServiceType({
                user_id: user.id,
                name: currentService.name,
                price: editForm.price,
                icon: editForm.icon || '✂️',
              });
              if (retryService) {
                // Si se creó con el nombre original, actualizarlo con el nuevo nombre
                updatedService = await saveServiceType({
                  id: retryService.id,
                  user_id: user.id,
                  name: editForm.name.trim(),
                  price: editForm.price,
                  icon: editForm.icon || '✂️',
                });
              }
            }
            
            if (!updatedService) {
              alert('Error al crear el servicio. Por favor, verifica la consola (F12) para más detalles.\n\nAsegúrate de que la tabla service_types existe en Supabase.');
              return;
            }
          }
          console.log('✅ Nuevo servicio creado exitosamente:', updatedService);
        }
      }
      
      // Recargar servicios desde la base de datos
      console.log('🔄 Recargando servicios desde la base de datos...');
      try {
        const updatedServices = await getServiceTypes(user.id);
        console.log('📋 Servicios recargados:', updatedServices);
        
        if (updatedServices.length > 0) {
          setServiceTypes(updatedServices.map(st => ({
            id: st.id,
            name: st.name,
            price: st.price,
            icon: st.icon,
          })));
          console.log('✅ Estado actualizado con servicios de la BD');
        } else {
          // Si no hay servicios en BD pero se actualizó exitosamente, actualizar el estado local
          if (updatedService) {
            setServiceTypes(prev => prev.map((st, idx) => 
              idx === index 
                ? { id: updatedService.id, name: editForm.name.trim(), price: editForm.price, icon: editForm.icon || '✂️' }
                : st
            ));
            console.log('⚠️ No hay servicios en BD, pero se actualizó el estado local');
          }
        }
      } catch (reloadError) {
        console.error('Error al recargar servicios:', reloadError);
        // Si falla la recarga, al menos actualizar el estado local con los datos guardados
        if (updatedService) {
          setServiceTypes(prev => prev.map((st, idx) => 
            idx === index 
              ? { id: updatedService.id, name: editForm.name.trim(), price: editForm.price, icon: editForm.icon || '✂️' }
              : st
          ));
        }
      }
      
      setEditingIndex(null);
      setEditForm({ name: '', price: 0, icon: '' });
      console.log('✅ Edición completada exitosamente');
      
      // Mostrar mensaje de éxito
      alert(`✅ Servicio "${editForm.name.trim()}" actualizado exitosamente.\n\nPrecio: ${formatCurrency(editForm.price)}`);
    } catch (error: any) {
      console.error('❌ Error al guardar servicio:', error);
      console.error('Detalles del error:', {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
      });
      
      const errorMessage = error?.message || 'Error desconocido';
      let alertMessage = `Error al guardar el servicio:\n\n${errorMessage}`;
      
      // Mensaje específico si la tabla no existe
      if (errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorMessage.includes('service_types')) {
        alertMessage += '\n\n⚠️ IMPORTANTE:\n\nLa tabla "service_types" no existe en Supabase.\n\nSOLUCIÓN:\n\n1. Ve a Supabase Dashboard → SQL Editor\n2. Abre el archivo CREAR_TABLA_SERVICE_TYPES.sql\n3. Copia TODO el contenido\n4. Pégalo en SQL Editor y ejecuta (Run)\n5. Recarga la aplicación y prueba de nuevo';
      }
      
      alert(alertMessage);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditForm({ name: '', price: 0, icon: '' });
  };

  const handleDelete = async (index: number) => {
    if (!user) return;
    
    if (confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
      const currentService = serviceTypes[index];
      
      try {
        // Si tiene ID, usarlo directamente
        if (currentService.id) {
          const success = await deleteServiceType(currentService.id, user.id);
          if (!success) {
            alert('Error al eliminar el servicio. Por favor, intenta de nuevo.');
            return;
          }
        } else {
          // Si no tiene ID, buscar por nombre
          const dbServices = await getServiceTypes(user.id);
          const dbService = dbServices.find(s => s.name === currentService.name);
          
          if (dbService) {
            const success = await deleteServiceType(dbService.id, user.id);
            if (!success) {
              alert('Error al eliminar el servicio. Por favor, intenta de nuevo.');
              return;
            }
          }
        }
        
        // Recargar servicios
        const updatedServices = await getServiceTypes(user.id);
        setServiceTypes(updatedServices.map(st => ({
          id: st.id,
          name: st.name,
          price: st.price,
          icon: st.icon,
        })));
      } catch (error: any) {
        console.error('Error al eliminar servicio:', error);
        alert(`Error al eliminar el servicio: ${error?.message || 'Error desconocido'}`);
      }
    }
  };

  const handleAddService = async () => {
    if (!user) return;
    
    if (newService.name.trim() && newService.price > 0) {
      await saveServiceType({
        user_id: user.id,
        name: newService.name,
        price: newService.price,
        icon: newService.icon,
      });
      
      // Recargar servicios
      const updatedServices = await getServiceTypes(user.id);
      setServiceTypes(updatedServices.map(st => ({
        id: st.id,
        name: st.name,
        price: st.price,
        icon: st.icon,
      })));
      setNewService({ name: '', price: 0, icon: '✂️' });
      setShowAddForm(false);
    }
  };

  // Funciones para manejar servicios registrados
  const handleEditService = (service: Service) => {
    setEditingServiceId(service.id);
    setEditServiceForm({
      name: service.name,
      price: service.price,
      barber_id: service.barber_id || '',
      timestamp: service.timestamp,
    });
  };

  const handleSaveService = async () => {
    if (!user || !editingServiceId) return;

    try {
      const serviceToUpdate = services.find(s => s.id === editingServiceId);
      if (!serviceToUpdate) return;

      const selectedBarberData = barbers.find((b) => b.id === editServiceForm.barber_id);
      
      const timestamp = editServiceForm.timestamp 
        ? new Date(editServiceForm.timestamp).toISOString()
        : serviceToUpdate.timestamp.toISOString();

      const updatedService = await saveService({
        id: editingServiceId,
        name: editServiceForm.name,
        price: editServiceForm.price,
        barber_id: editServiceForm.barber_id || undefined,
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
        setEditServiceForm({});
      } else {
        alert('Error al actualizar el servicio. Por favor, intenta de nuevo.');
      }
    } catch (error: any) {
      console.error('Error updating service:', error);
      alert(`Error al actualizar el servicio: ${error?.message || 'Error desconocido'}`);
    }
  };

  const handleCancelService = () => {
    setEditingServiceId(null);
    setEditServiceForm({});
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!user) return;

    if (confirm('¿Estás seguro de que quieres eliminar este servicio registrado?')) {
      try {
        const success = await deleteService(serviceId, user.id);
        if (success) {
          setServices((prev) => prev.filter((service) => service.id !== serviceId));
        } else {
          alert('Error al eliminar el servicio. Por favor, intenta de nuevo.');
        }
      } catch (error: any) {
        console.error('Error deleting service:', error);
        alert(`Error al eliminar el servicio: ${error?.message || 'Error desconocido'}`);
      }
    }
  };

  const handleAddNewService = async () => {
    if (!user) {
      alert('No hay usuario autenticado. Por favor, inicia sesión nuevamente.');
      return;
    }

    if (!newServiceForm.name.trim() || newServiceForm.price <= 0) {
      alert('Por favor, completa el nombre y el precio del servicio.');
      return;
    }

    if (!newServiceForm.barber_id && barbers.length > 0) {
      alert('Por favor, selecciona un barbero.');
      return;
    }

    try {
      const selectedBarberData = barbers.find((b) => b.id === newServiceForm.barber_id);
      const timestamp = newServiceForm.timestamp 
        ? new Date(newServiceForm.timestamp).toISOString()
        : new Date().toISOString();

      const newService = await saveService({
        user_id: user.id,
        name: newServiceForm.name,
        price: newServiceForm.price,
        timestamp: timestamp,
        barber_id: newServiceForm.barber_id || undefined,
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
          barber_id: barbers.length > 0 ? barbers[0].id : '',
        });
        setShowAddServiceForm(false);
      } else {
        alert('Error al guardar el servicio. Por favor, intenta de nuevo.');
      }
    } catch (error: any) {
      console.error('Error adding service:', error);
      alert(`Error al guardar el servicio: ${error?.message || 'Error desconocido'}`);
    }
  };

  const getEditServiceTimestampString = (): string => {
    try {
      if (!editServiceForm.timestamp) {
        const now = new Date();
        return now.toISOString().slice(0, 16);
      }
      if (editServiceForm.timestamp instanceof Date) {
        return editServiceForm.timestamp.toISOString().slice(0, 16);
      }
      const date = new Date(editServiceForm.timestamp);
      if (isNaN(date.getTime())) {
        return new Date().toISOString().slice(0, 16);
      }
      return date.toISOString().slice(0, 16);
    } catch (error) {
      console.error('Error al convertir timestamp:', error);
      return new Date().toISOString().slice(0, 16);
    }
  };

  const icons = ['✂️', '🧔', '✨', '💇', '💈', '👔', '🎩', '🪒'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
            <Settings className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
            <span>Editar Servicios</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">Gestiona los tipos de servicios y los servicios registrados</p>
        </div>

        {/* Pestañas */}
        <div className="mb-6 flex gap-2 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('types')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'types'
                ? 'text-white border-b-2 border-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Tipos de Servicio
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'services'
                ? 'text-white border-b-2 border-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Servicios Registrados
          </button>
        </div>

        {/* Contenido de Tipos de Servicio */}
        {activeTab === 'types' && (
          <>
            {/* Botón para agregar tipo de servicio */}
            <div className="mb-6">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Scissors className="w-4 h-4" />
                Agregar Nuevo Tipo de Servicio
              </button>
            </div>

        {/* Formulario de agregar */}
        {showAddForm && (
          <div className="bg-transparent rounded-xl p-6 border border-gray-800 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Nuevo Servicio</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Nombre del servicio"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                className="px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
              />
              <input
                type="number"
                placeholder="Precio"
                value={newService.price || ''}
                onChange={(e) => setNewService({ ...newService, price: Number(e.target.value) })}
                className="px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
                min="0"
              />
              <div className="flex gap-2">
                <select
                  value={newService.icon}
                  onChange={(e) => setNewService({ ...newService, icon: e.target.value })}
                  className="px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-white flex-1"
                >
                  {icons.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAddService}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewService({ name: '', price: 0, icon: '✂️' });
                }}
                className="px-4 py-2 bg-white/5 border border-gray-800 text-white rounded-lg hover:bg-gray-800/30 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista de servicios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serviceTypes.map((service, index) => (
            <div
              key={index}
              className="bg-transparent rounded-xl p-6 border border-gray-800"
            >
              {editingIndex === index ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-white"
                    placeholder="Nombre"
                  />
                  <input
                    type="number"
                    value={editForm.price || ''}
                    onChange={(e) => {
                      const newPrice = Number(e.target.value) || 0;
                      setEditForm({ ...editForm, price: newPrice });
                    }}
                    className="w-full px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-white"
                    placeholder="Precio"
                    min="0"
                    step="100"
                  />
                  <select
                    value={editForm.icon}
                    onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-white"
                  >
                    {icons.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(index)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Guardar
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 px-4 py-2 bg-white/5 border border-gray-800 text-white rounded-lg hover:bg-gray-800/30 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{service.icon}</span>
                      <div>
                        <h3 className="text-xl font-bold text-white">{service.name}</h3>
                        <p className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
                          <DollarSign className="w-5 h-5" />
                          {formatCurrency(service.price)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(index)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/30 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Scissors className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {serviceTypes.length === 0 && (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No hay servicios configurados</p>
            <p className="text-gray-500 text-sm mt-2">Haz clic en "Agregar Nuevo Tipo de Servicio" para comenzar</p>
          </div>
        )}
          </>
        )}

        {/* Contenido de Servicios Registrados */}
        {activeTab === 'services' && (
          <>
            {/* Botón para agregar servicio registrado */}
            <div className="mb-6">
              <button
                onClick={() => setShowAddServiceForm(!showAddServiceForm)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar Nuevo Servicio Registrado
              </button>
            </div>

            {/* Formulario para agregar servicio registrado */}
            {showAddServiceForm && (
              <div className="bg-transparent rounded-xl p-6 border border-gray-800 mb-6">
                <h2 className="text-xl font-bold text-white mb-4">Nuevo Servicio Registrado</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nombre del servicio"
                    value={newServiceForm.name}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
                    className="px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
                  />
                  <input
                    type="number"
                    placeholder="Precio"
                    value={newServiceForm.price || ''}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, price: Number(e.target.value) })}
                    className="px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
                    min="0"
                  />
                  {barbers.length > 0 && (
                    <select
                      value={newServiceForm.barber_id}
                      onChange={(e) => setNewServiceForm({ ...newServiceForm, barber_id: e.target.value })}
                      className="px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-white"
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
                    value={newServiceForm.timestamp}
                    onChange={(e) => setNewServiceForm({ ...newServiceForm, timestamp: e.target.value })}
                    className="px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-white"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAddNewService}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setShowAddServiceForm(false);
                      setNewServiceForm({
                        name: '',
                        price: 0,
                        timestamp: new Date().toISOString().slice(0, 16),
                        barber_id: barbers.length > 0 ? barbers[0].id : '',
                      });
                    }}
                    className="px-4 py-2 bg-white/5 border border-gray-800 text-white rounded-lg hover:bg-gray-800/30 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de servicios registrados */}
            <div className="space-y-4">
              {services.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No hay servicios registrados</p>
                  <p className="text-gray-500 text-sm mt-2">Haz clic en "Agregar Nuevo Servicio Registrado" para comenzar</p>
                </div>
              ) : (
                services.map((service) => (
                  <div key={service.id} className="bg-transparent rounded-xl p-6 border border-gray-800">
                    {editingServiceId === service.id ? (
                      <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white mb-4">Editar Servicio Registrado</h3>
                        <input
                          type="text"
                          value={editServiceForm.name || ''}
                          onChange={(e) => setEditServiceForm({ ...editServiceForm, name: e.target.value })}
                          className="w-full px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-white"
                          placeholder="Nombre del servicio"
                        />
                        <input
                          type="number"
                          value={editServiceForm.price || ''}
                          onChange={(e) => setEditServiceForm({ ...editServiceForm, price: Number(e.target.value) })}
                          className="w-full px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-white"
                          placeholder="Precio"
                          min="0"
                        />
                        {barbers.length > 0 && (
                          <select
                            value={editServiceForm.barber_id || ''}
                            onChange={(e) => setEditServiceForm({ ...editServiceForm, barber_id: e.target.value })}
                            className="w-full px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-white"
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
                          value={getEditServiceTimestampString()}
                          onChange={(e) => {
                            try {
                              const newTimestamp = e.target.value ? new Date(e.target.value) : service.timestamp;
                              setEditServiceForm({ ...editServiceForm, timestamp: newTimestamp });
                            } catch (error) {
                              console.error('Error al actualizar timestamp:', error);
                            }
                          }}
                          className="w-full px-4 py-2 bg-white/5 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-white"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveService}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <Save className="w-4 h-4" />
                            Guardar
                          </button>
                          <button
                            onClick={handleCancelService}
                            className="flex-1 px-4 py-2 bg-white/5 border border-gray-800 text-white rounded-lg hover:bg-gray-800/30 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2">{service.name}</h3>
                          <div className="flex items-center gap-4 text-gray-400 text-sm">
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {formatCurrency(service.price)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {service.timestamp.toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {service.barber_name && (
                              <span className="text-gray-300">Barbero: {service.barber_name}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditService(service)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

