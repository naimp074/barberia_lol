import React, { useState, useEffect } from 'react';
import { Settings, Save, DollarSign, Scissors } from 'lucide-react';
import { getServiceTypes, saveServiceType, deleteServiceType, ServiceType as DatabaseServiceType } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';

interface ServiceType {
  id?: string;
  name: string;
  price: number;
  icon: string;
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

  // Cargar tipos de servicio desde la base de datos
  useEffect(() => {
    const loadServiceTypes = async () => {
      if (user) {
        const dbServiceTypes = await getServiceTypes(user.id);
        if (dbServiceTypes.length > 0) {
          setServiceTypes(dbServiceTypes.map(st => ({
            id: st.id,
            name: st.name,
            price: st.price,
            icon: st.icon,
          })));
        }
      }
    };
    loadServiceTypes();
  }, [user]);

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
          console.log('📝 Servicio no encontrado, creando nuevo');
          // Crear nuevo servicio
          updatedService = await saveServiceType({
            user_id: user.id,
            name: editForm.name.trim(),
            price: editForm.price,
            icon: editForm.icon || '✂️',
          });
          
          if (!updatedService) {
            console.error('❌ Error: saveServiceType retornó null al crear nuevo servicio');
            alert('Error al crear el servicio. Por favor, verifica la consola (F12) para más detalles.');
            return;
          }
          console.log('✅ Nuevo servicio creado exitosamente:', updatedService);
        }
      }
      
      // Recargar servicios desde la base de datos
      console.log('🔄 Recargando servicios desde la base de datos...');
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
        // Si no hay servicios en BD, mantener los locales pero actualizar el editado
        setServiceTypes(prev => prev.map((st, idx) => 
          idx === index 
            ? { id: updatedService?.id, name: editForm.name.trim(), price: editForm.price, icon: editForm.icon || '✂️' }
            : st
        ));
        console.log('⚠️ No hay servicios en BD, actualizando estado local');
      }
      
      setEditingIndex(null);
      setEditForm({ name: '', price: 0, icon: '' });
      console.log('✅ Edición completada exitosamente');
    } catch (error: any) {
      console.error('❌ Error al guardar servicio:', error);
      console.error('Detalles del error:', {
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
      });
      alert(`Error al guardar el servicio:\n\n${error?.message || 'Error desconocido'}\n\nPor favor, verifica la consola (F12) para más detalles.`);
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

  const icons = ['✂️', '🧔', '✨', '💇', '💈', '👔', '🎩', '🪒'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-2 sm:gap-3">
            <Settings className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" />
            <span>Editar Servicios</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">Gestiona los tipos de servicios y sus precios</p>
        </div>

        {/* Botón para agregar servicio */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Scissors className="w-4 h-4" />
            Agregar Nuevo Servicio
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
            <p className="text-gray-500 text-sm mt-2">Haz clic en "Agregar Nuevo Servicio" para comenzar</p>
          </div>
        )}
      </div>
    </div>
  );
}

