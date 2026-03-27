import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getEvents, createEvent, updateEvent, deleteEvent, CalendarEvent } from '../services/eventService';
import { useAuth } from '@/shared/hooks/useAuth';
import { Plus, X, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';

const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function CalendarPage() {
  const { user } = useAuth();
  const isJefe = user?.roles?.some((r: any) => r.name.toLowerCase().includes('jefe'));
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const fetchEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSelectSlot = (slotInfo: any) => {
    if (!isJefe) return;
    setSelectedEvent(null);
    reset({
      title: '',
      description: '',
      start_date: format(slotInfo.start, "yyyy-MM-dd'T'HH:mm"),
      end_date: format(slotInfo.end, "yyyy-MM-dd'T'HH:mm"),
      color: '#3B82F6'
    });
    setIsModalOpen(true);
  };

  const handleSelectEvent = (eventData: any) => {
    if (!isJefe) return; // For non-jefe roles, maybe just viewing but they already see it on the calendar
    const event = eventData.resource;
    setSelectedEvent(event);
    reset({
      title: event.title,
      description: event.description || '',
      start_date: format(new Date(event.start_date), "yyyy-MM-dd'T'HH:mm"),
      end_date: format(new Date(event.end_date), "yyyy-MM-dd'T'HH:mm"),
      color: event.color
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (selectedEvent) {
        await updateEvent(selectedEvent.id, data);
      } else {
        await createEvent(data);
      }
      setIsModalOpen(false);
      fetchEvents();
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || 'Error guardando evento';
      const validationErrors = e.response?.data?.errors ? JSON.stringify(e.response.data.errors) : '';
      console.error('Save event error:', e.response?.data);
      alert(`${errorMsg} ${validationErrors}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    if (window.confirm('¿Seguro que deseas eliminar este evento? Todos serán notificados.')) {
      try {
        await deleteEvent(selectedEvent.id);
        setIsModalOpen(false);
        fetchEvents();
      } catch (e) {
        alert('Error eliminando evento');
      }
    }
  };

  const calendarEvents = events.map(e => ({
    title: e.title,
    start: new Date(e.start_date),
    end: new Date(e.end_date),
    resource: e
  }));

  const eventStyleGetter = (event: any) => {
    const backgroundColor = event.resource.color || '#3B82F6';
    return { style: { backgroundColor, borderRadius: '6px', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 'bold', padding: '2px 6px' } };
  };

  return (
    <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-500 font-primary">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario General</h1>
          <p className="text-sm text-gray-500 mt-1">Actividades y eventos de todas las áreas de ICEP</p>
        </div>
        {isJefe && (
          <button 
            onClick={() => {
               setSelectedEvent(null);
               reset({ title: '', description: '', color: '#3B82F6', start_date: format(new Date(), "yyyy-MM-dd'T'10:00"), end_date: format(new Date(), "yyyy-MM-dd'T'11:00")});
               setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-sm font-medium"
          >
            <Plus size={20} />
            Crear Evento
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1 h-[650px]">
        {loading ? (
           <div className="h-full flex items-center justify-center">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
           </div>
        ) : (
           <Calendar
             localizer={localizer}
             events={calendarEvents}
             startAccessor="start"
             endAccessor="end"
             culture="es"
             selectable={isJefe}
             onSelectSlot={handleSelectSlot}
             onSelectEvent={handleSelectEvent}
             eventPropGetter={eventStyleGetter}
             messages={{
               next: 'Sig.',
               previous: 'Ant.',
               today: 'Hoy',
               month: 'Mes',
               week: 'Semana',
               day: 'Día',
             }}
             className="font-sans"
           />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b bg-gray-50">
              <h2 className="text-xl font-bold font-primary flex items-center gap-2 text-gray-900">
                <CalendarIcon size={20} className="text-blue-600" />
                {selectedEvent ? 'Editar Evento' : 'Nuevo Evento'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-100 p-2 rounded-xl transition shadow-sm">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">Título del Evento *</label>
                <input 
                  type="text" 
                  {...register('title', { required: true })} 
                  className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none focus:border-blue-500 font-medium transition" 
                  placeholder="Reunión general, Lanzamiento..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">Inicio y Fin *</label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="datetime-local" 
                      {...register('start_date', { required: true })} 
                      className="flex-1 w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-2 outline-none focus:border-blue-500 text-sm font-medium" 
                    />
                    <span>-</span>
                    <input 
                      type="datetime-local" 
                      {...register('end_date', { 
                        required: true,
                        validate: (value, formValues) => {
                          const start = new Date(formValues.start_date);
                          const end = new Date(value);
                          return end >= start || 'La fecha de fin debe ser posterior al inicio';
                        }
                      })} 
                      className={`flex-1 w-full border-2 bg-gray-50 rounded-xl p-2 outline-none focus:border-blue-500 text-sm font-medium transition ${errors.end_date ? 'border-red-300' : 'border-gray-100'}`} 
                    />
                  </div>
                  {errors.end_date && <span className="text-[10px] text-red-500 font-bold ml-1">{(errors.end_date as any).message}</span>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">Descripción</label>
                <textarea 
                  {...register('description')} 
                  rows={3} 
                  className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none focus:border-blue-500 text-sm transition" 
                  placeholder="Detalles del evento..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider text-[10px]">Etiqueta de Color</label>
                <div className="flex gap-3">
                   {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'].map(color => (
                     <label key={color} className="relative cursor-pointer">
                       <input type="radio" {...register('color')} value={color} className="peer sr-only" />
                       <div className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-gray-400 transition" style={{ backgroundColor: color }}></div>
                     </label>
                   ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 mt-2 border-t border-gray-100">
                {selectedEvent ? (
                  <button type="button" onClick={handleDelete} className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition tooltip" title="Eliminar evento">
                    <Trash2 size={20} />
                  </button>
                ) : <div></div>}

                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">
                    Cancelar
                  </button>
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/30 transition">
                    {selectedEvent ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
