import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getEvents, createEvent, updateEvent, deleteEvent, CalendarEvent } from '../services/eventService';
import { useAuth } from '@/shared/hooks/useAuth';
import { Plus, X, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2, BookOpen, Sparkles, Video, Link as LinkIcon, Users as UsersIcon, Award, AlertTriangle, Clock, Paperclip, Camera, Trash } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { showSuccess, showError, showConfirmDanger } from '@/shared/utils/alerts';
import api from '@/shared/services/api';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// Color dot for event type
const EVENT_TYPE_COLORS: Record<string, string> = {
  '#10B981': 'bg-emerald-400',
  '#3B82F6': 'bg-blue-400',
  '#F59E0B': 'bg-amber-400',
  '#EF4444': 'bg-red-400',
  '#8B5CF6': 'bg-violet-400',
};
const EVENT_TYPE_LABELS: Record<string, string> = {
  '#10B981': 'Académico',
  '#3B82F6': 'Administrativo',
  '#F59E0B': 'Seguimiento',
  '#EF4444': 'Urgente',
  '#8B5CF6': 'Reunión',
};

const COLOR_LIGHT: Record<string, string> = {
  '#10B981': 'bg-emerald-50 text-emerald-700 border-emerald-400',
  '#3B82F6': 'bg-blue-50 text-blue-700 border-blue-400',
  '#F59E0B': 'bg-amber-50 text-amber-700 border-amber-400',
  '#EF4444': 'bg-red-50 text-red-700 border-red-400',
  '#8B5CF6': 'bg-violet-50 text-violet-700 border-violet-400',
};

const TIME_BG: Record<string, string> = {
  '#10B981': 'bg-emerald-100/50 text-emerald-700',
  '#3B82F6': 'bg-blue-100/50 text-blue-700',
  '#F59E0B': 'bg-amber-100/50 text-amber-700',
  '#EF4444': 'bg-red-100/50 text-red-700',
  '#8B5CF6': 'bg-violet-100/50 text-violet-700',
};

const AVAILABLE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

const AVAILABLE_ICONS = [
  { id: 'calendar', Icon: CalendarIcon, label: 'Evento' },
  { id: 'video', Icon: Video, label: 'Videollamada' },
  { id: 'users', Icon: UsersIcon, label: 'Reunión' },
  { id: 'award', Icon: Award, label: 'Académico' },
  { id: 'alert', Icon: AlertTriangle, label: 'Urgente' },
];

const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hora', value: 60 },
  { label: '2 horas', value: 120 },
  { label: 'Todo el día', value: 'full' },
  { label: '3 días', value: '3days' },
];

export default function CalendarPage() {
  const { user } = useAuth();
  const canCreate = user?.roles?.some((r: any) =>
    r.name.toLowerCase().includes('jefe') || r.name.toLowerCase().includes('admin')
  );

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<string>(Views.MONTH);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      color: '#10B981',
      icon: 'calendar',
      meeting_link: '',
      participant_ids: [] as number[],
    }
  });

  const [users, setUsers] = useState<any[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const watchColor = watch('color', '#10B981');
  const watchIcon = watch('icon', 'calendar');
  const watchStartDate = watch('start_date');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.data || []);
    } catch (e) {
      console.error("Error fetching users", e);
    }
  };

  const fetchEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchEvents();
    if (canCreate) fetchUsers();
  }, [canCreate]);

  const openNewEventModal = (defaults?: any) => {
    setSelectedEvent(null);
    reset({
      title: '',
      description: '',
      start_date: defaults?.start_date || format(new Date(), "yyyy-MM-dd'T'10:00"),
      end_date: defaults?.end_date || format(new Date(), "yyyy-MM-dd'T'11:00"),
      color: '#10B981',
      icon: 'calendar',
      meeting_link: '',
      participant_ids: [],
    });
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const handleSelectSlot = (slotInfo: any) => {
    if (!canCreate) return;
    openNewEventModal({
      start_date: format(slotInfo.start, "yyyy-MM-dd'T'HH:mm"),
      end_date: format(slotInfo.end, "yyyy-MM-dd'T'HH:mm"),
    });
  };

  const handleSelectEvent = (eventData: any) => {
    const event = (eventData.resource || eventData) as CalendarEvent;
    setSelectedEvent(event);
    reset({
      title: event.title,
      description: event.description || '',
      start_date: format(new Date(event.start_date), "yyyy-MM-dd'T'HH:mm"),
      end_date: format(new Date(event.end_date), "yyyy-MM-dd'T'HH:mm"),
      color: event.color || '#10B981',
      icon: event.icon || 'calendar',
      meeting_link: event.meeting_link || '',
      participant_ids: event.participants?.map(p => p.id) || [],
    });
    setImageFile(null);
    setImagePreview(event.image_url || null);
    setIsModalOpen(true);
  };

  const setDuration = (duration: number | string) => {
    const start = watch('start_date');
    if (!start) return;

    let newEnd = new Date(start);
    if (typeof duration === 'number') {
      newEnd.setMinutes(newEnd.getMinutes() + duration);
    } else if (duration === 'full') {
      newEnd.setHours(23, 59, 0, 0);
    } else if (duration === '3days') {
      newEnd.setDate(newEnd.getDate() + 3);
    }

    reset((prev) => ({ ...prev, end_date: format(newEnd, "yyyy-MM-dd'T'HH:mm") }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('start_date', data.start_date);
      formData.append('end_date', data.end_date);
      formData.append('color', data.color);
      formData.append('icon', data.icon);
      formData.append('meeting_link', data.meeting_link || '');
      formData.append('participant_ids', JSON.stringify(data.participant_ids));
      
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (selectedEvent) {
        await updateEvent(selectedEvent.id, formData);
        showSuccess('Evento Actualizado', 'Los cambios fueron registrados correctamente.');
      } else {
        await createEvent(formData);
        showSuccess('Evento Creado', 'El nuevo evento fue publicado en el calendario.');
      }
      setIsModalOpen(false);
      fetchEvents();
    } catch (e: any) {
      showError('Error', e.response?.data?.message || 'No se pudo guardar el evento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    const confirmed = await showConfirmDanger('¿Eliminar este evento?', 'Esta acción es permanente y no se puede deshacer.');
    if (!confirmed) return;
    try {
      await deleteEvent(selectedEvent.id);
      showSuccess('Eliminado', 'El evento fue removido del calendario.');
      setIsModalOpen(false);
      fetchEvents();
    } catch {
      showError('Error', 'No se pudo eliminar el evento.');
    }
  };

  const calendarEvents = events.map(e => ({
    title: e.title,
    start: new Date(e.start_date),
    end: new Date(e.end_date),
    resource: e,
  }));

  const eventStyleGetter = (event: any) => {
    const color = event.resource.color || '#10B981';
    const lightStyle = COLOR_LIGHT[color] || 'bg-emerald-50 text-emerald-700 border-emerald-400';
    // Extract just color for style
    return {
      style: {
        backgroundColor: color,
        borderRadius: '6px',
        border: 'none',
        color: '#fff',
        fontSize: '11px',
        fontWeight: 'bold',
        padding: '2px 6px',
      }
    };
  };

  // Today's events
  const todayEvents = events.filter(e => {
    const start = new Date(e.start_date);
    const today = new Date();
    return (
      start.getDate() === today.getDate() &&
      start.getMonth() === today.getMonth() &&
      start.getFullYear() === today.getFullYear()
    );
  });

  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: es });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* === HEADER CONTROLS === */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <p className="text-on-surface-variant font-medium text-sm tracking-wide uppercase opacity-60">
            Vista Mensual
          </p>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold text-primary tracking-tight capitalize">
            {monthLabel}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle */}
          <div className="bg-surface-container-low p-1 rounded-2xl flex gap-1">
            {[
              { label: 'Mes', view: Views.MONTH },
              { label: 'Semana', view: Views.WEEK },
              { label: 'Día', view: Views.DAY },
            ].map(({ label, view }) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${
                  currentView === view
                    ? 'bg-surface-container-lowest shadow-sm text-primary'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                const d = new Date(currentDate);
                d.setMonth(d.getMonth() - 1);
                setCurrentDate(d);
              }}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-surface-container-low hover:bg-surface-container-high transition-colors active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-5 h-10 flex items-center gap-2 rounded-2xl bg-surface-container-low font-black text-xs uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95"
            >
              Hoy
            </button>
            <button
              onClick={() => {
                const d = new Date(currentDate);
                d.setMonth(d.getMonth() + 1);
                setCurrentDate(d);
              }}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-surface-container-low hover:bg-surface-container-high transition-colors active:scale-95"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* New Event CTA */}
          {canCreate && (
            <button
              onClick={() => openNewEventModal()}
              className="bg-tertiary-fixed text-on-tertiary-fixed px-6 h-10 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-90 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-tertiary-fixed/20"
            >
              <Plus size={18} />
              Nuevo Evento
            </button>
          )}
        </div>
      </div>

      {/* === FILTER CHIPS === */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-[10px] font-black text-on-surface-variant/40 tracking-[0.3em] uppercase">
          Categorías:
        </span>
        {[
          { label: 'Académico', dot: 'bg-emerald-400' },
          { label: 'Administrativo', dot: 'bg-blue-400' },
          { label: 'Seguimiento', dot: 'bg-amber-400' },
          { label: 'Urgente', dot: 'bg-red-400' },
        ].map(({ label, dot }) => (
          <button
            key={label}
            className="px-4 py-1.5 rounded-full border border-outline-variant/20 text-xs font-bold flex items-center gap-2 hover:bg-surface-container-low transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            {label}
          </button>
        ))}
      </div>

      {/* === BIG CALENDAR WRAPPER === */}
      <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-xl shadow-primary/5 ghost-border">
        <style>{`
          .rbc-calendar { font-family: 'Inter', sans-serif; }
          .rbc-header { padding: 16px 0; text-align: center; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #45464d; border-bottom: 1px solid rgba(198,198,205,0.2) !important; border-left: none !important; }
          .rbc-off-range-bg { background-color: rgba(242,244,246,0.4) !important; }
          .rbc-today { background-color: rgba(111,251,190,0.06) !important; }
          .rbc-date-cell { padding: 10px 12px; font-size: 13px; font-weight: 700; }
          .rbc-date-cell.rbc-now { color: #009668; }
          .rbc-date-cell.rbc-now > a { background: rgba(111,251,190,0.3); padding: 2px 8px; border-radius: 50%; }
          .rbc-month-row { border-color: rgba(198,198,205,0.15) !important; }
          .rbc-day-bg + .rbc-day-bg { border-color: rgba(198,198,205,0.1) !important; }
          .rbc-day-bg:hover { background-color: rgba(242,244,246,0.5); transition: background 0.2s; }
          .rbc-toolbar { display: none; }
          .rbc-event { border-radius: 6px !important; font-size: 11px !important; font-weight: 700 !important; padding: 2px 6px !important; }
          .rbc-event-label { font-size: 10px !important; }
          .rbc-show-more { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #45464d; background: transparent; }
        `}</style>

        {loading ? (
          <div className="h-[700px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={32} className="text-primary/30 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40">Cargando Agenda</p>
            </div>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            culture="es"
            selectable={canCreate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            date={currentDate}
            onNavigate={setCurrentDate}
            view={currentView as any}
            onView={setCurrentView as any}
            style={{ minHeight: 700 }}
            messages={{
              next: 'Sig.', previous: 'Ant.', today: 'Hoy',
              month: 'Mes', week: 'Semana', day: 'Día',
              showMore: (total) => `+${total} más`,
            }}
          />
        )}
      </div>

      {/* === TODAY'S EVENTS SECTION === */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-headline font-bold text-2xl text-primary tracking-tight">
            Eventos de Hoy
          </h2>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
            {format(new Date(), 'EEEE, d MMMM', { locale: es })}
          </span>
        </div>

        {todayEvents.length === 0 ? (
          <div className="p-12 bg-surface-container-low/30 rounded-3xl border-2 border-dashed border-outline-variant/20 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <Sparkles size={24} className="text-on-primary-container opacity-30" />
            </div>
            <p className="font-headline font-bold text-lg text-primary mb-1">Sin actividad programada</p>
            <p className="text-xs text-on-surface-variant/60">No hay eventos registrados para hoy.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayEvents.map(event => {
              const color = event.color || '#10B981';
              const timeBg = TIME_BG[color] || 'bg-emerald-100/50 text-emerald-700';
              const dot = EVENT_TYPE_COLORS[color] || 'bg-emerald-400';
              const label = EVENT_TYPE_LABELS[color] || 'General';
              const startTime = format(new Date(event.start_date), 'hh:mm');
              const amPm = format(new Date(event.start_date), 'a').toUpperCase();
              const EventIcon = AVAILABLE_ICONS.find(i => i.id === event.icon)?.Icon || CalendarIcon;

              return (
                <div
                  key={event.id}
                  onClick={() => handleSelectEvent({ title: event.title, resource: event })}
                  className="bg-surface-container-lowest p-5 rounded-3xl ghost-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex gap-4 cursor-pointer group active:scale-[0.98]"
                >
                  <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl flex-shrink-0 ${timeBg}`}>
                    <span className="text-xs font-black uppercase tracking-tight">{startTime}</span>
                    <span className="text-lg font-black leading-none">{amPm}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                        <span className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest">{label}</span>
                      </div>
                      <EventIcon size={14} className="text-on-surface-variant/30" />
                    </div>
                    <h4 className="font-bold text-on-surface leading-tight truncate text-sm">{event.title}</h4>
                    <div className="flex items-center gap-3 mt-1.5">
                       {event.meeting_link && (
                         <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                            <Video size={10} /> Enlace activo
                         </span>
                       )}
                       {event.participants && event.participants.length > 0 && (
                         <div className="flex -space-x-1.5">
                            {event.participants.slice(0, 3).map(p => (
                              <div key={p.id} className="w-5 h-5 rounded-full bg-surface-container-high border-2 border-white flex items-center justify-center text-[8px] font-black">
                                {p.name.charAt(0)}
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* === EDITORIAL EVENT MODAL === */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-primary/20 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-xl shadow-2xl shadow-primary/20 ghost-border overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 origin-center">
            
            {/* Modal Header */}
            <div className="px-10 py-8 bg-surface-container-low/30 border-b border-outline-variant/5 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div
                  className="p-3 rounded-2xl text-white shadow-lg transition-all"
                  style={{ backgroundColor: watchColor || '#10B981' }}
                >
                  {AVAILABLE_ICONS.find(i => i.id === watchIcon)?.Icon ? 
                    (() => {
                      const Icon = AVAILABLE_ICONS.find(i => i.id === watchIcon)!.Icon;
                      return <Icon size={20} />;
                    })() : <CalendarIcon size={20} />
                  }
                </div>
                <div>
                  <h2 className="font-headline font-extrabold text-primary text-xl leading-none mb-1">
                    {selectedEvent ? 'Modificar Evento' : 'Registrar Evento'}
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                    Agenda Institucional — Ciclo Académico
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-3 bg-white border border-outline-variant/10 rounded-2xl text-on-surface-variant hover:bg-surface-container-high transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="p-10 space-y-8 overflow-y-auto max-h-[70vh]">

              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-6 bg-tertiary-fixed rounded-full" />
                  <h3 className="font-headline font-bold text-on-surface text-sm">Información Principal</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      {...register('title', { required: true })}
                      placeholder="Título del evento..."
                      disabled={!canCreate}
                      className={`w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-bold placeholder:text-on-surface-variant/20 focus:ring-4 focus:ring-primary/5 transition-all ${errors.title ? 'ring-2 ring-error/20' : ''} ${!canCreate ? 'opacity-80 cursor-default' : ''}`}
                    />
                    {errors.title && <p className="text-error text-[10px] font-black uppercase tracking-widest mt-2">Campo requerido</p>}
                  </div>
                  
                  <textarea
                    {...register('description')}
                    rows={2}
                    placeholder="Descripción o detalles adicionales..."
                    disabled={!canCreate}
                    className={`w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-medium placeholder:text-on-surface-variant/20 focus:ring-4 focus:ring-primary/5 transition-all resize-none ${!canCreate ? 'opacity-80 cursor-default' : ''}`}
                  />

                  {/* Meeting Link */}
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30 group-focus-within:text-primary transition-colors">
                      <LinkIcon size={18} />
                    </div>
                    <input
                      type="text"
                      {...register('meeting_link')}
                      placeholder="Enlace de la reunión (Zoom, Meet, Teams...)"
                      disabled={!canCreate}
                      className={`w-full pl-12 pr-6 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-medium placeholder:text-on-surface-variant/20 focus:ring-4 focus:ring-primary/5 transition-all ${!canCreate ? 'opacity-80 cursor-default' : ''}`}
                    />
                  </div>
                </div>
              </div>

              {/* Block: Icon Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h3 className="font-headline font-bold text-on-surface text-sm">Icono Representativo</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {AVAILABLE_ICONS.map(({ id, Icon, label }) => (
                    <label key={id} className={`cursor-pointer ${!canCreate ? 'pointer-events-none' : ''}`}>
                      <input type="radio" {...register('icon')} value={id} className="peer sr-only" disabled={!canCreate} />
                      <div className="px-4 py-3 bg-surface-container-low rounded-xl flex items-center gap-3 border-2 border-transparent peer-checked:border-primary peer-checked:bg-primary/5 transition-all">
                        <Icon size={18} className="text-on-surface-variant/60 peer-checked:text-primary" />
                        <span className="text-xs font-bold text-on-surface-variant/60 peer-checked:text-primary">{label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Block 2: Schedule & Presets */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-6 bg-on-primary-container rounded-full" />
                  <h3 className="font-headline font-bold text-on-surface text-sm">Programación Temporal</h3>
                </div>

                {/* Duration Presets */}
                {canCreate && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mr-2 py-2">Duración:</span>
                    {DURATIONS.map(({ label, value }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setDuration(value)}
                        className="px-3 py-2 bg-surface-container-high rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-primary hover:text-white transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] ml-2 flex items-center gap-1">
                      <Clock size={10} /> Inicio
                    </label>
                      <input
                        type="datetime-local"
                        {...register('start_date', { required: true })}
                        disabled={!canCreate}
                        className={`w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 transition-all ${!canCreate ? 'opacity-80 cursor-default' : ''}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] ml-2 flex items-center gap-1">
                        <Clock size={10} /> Fin
                      </label>
                      <input
                        type="datetime-local"
                        {...register('end_date', {
                          required: true,
                          validate: (val, form) =>
                            new Date(val) >= new Date(form.start_date) || 'Debe ser posterior al inicio',
                        })}
                        disabled={!canCreate}
                        className={`w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 transition-all ${errors.end_date ? 'ring-2 ring-error/20' : ''} ${!canCreate ? 'opacity-80 cursor-default' : ''}`}
                      />
                    {errors.end_date && <p className="text-error text-[10px] font-black uppercase tracking-widest">{(errors.end_date as any).message}</p>}
                  </div>
                </div>
              </div>

              {/* Block: Participants */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-6 bg-violet-400 rounded-full" />
                  <h3 className="font-headline font-bold text-on-surface text-sm">Participantes</h3>
                </div>
                <div className="bg-surface-container-low rounded-2xl p-4">
                  <Controller
                    name="participant_ids"
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {(field.value || []).map((id: number) => {
                            const u = users.find(u => u.id === id);
                            return (
                              <div key={id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-outline-variant/10 animate-in zoom-in-90 duration-200">
                                <span className="text-[10px] font-bold text-primary">{u?.name}</span>
                                <button
                                  type="button"
                                  onClick={() => field.onChange((field.value || []).filter((v: number) => v !== id))}
                                  className="text-on-surface-variant/40 hover:text-error"
                                  disabled={!canCreate}
                                >
                                  {canCreate && <X size={14} />}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        {canCreate && (
                          <select
                            className="w-full bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer text-on-surface-variant"
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (val && !(field.value || []).includes(val)) {
                                field.onChange([...(field.value || []), val]);
                              }
                              e.target.value = '';
                            }}
                          >
                            <option value="">Añadir participante...</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.name} ({u.roles?.[0]?.name})</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  />
                </div>
              </div>

              {/* Block: Image Upload */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-6 bg-amber-400 rounded-full" />
                  <h3 className="font-headline font-bold text-on-surface text-sm">Material / Imagen</h3>
                </div>
                
                <div 
                  className={`relative h-40 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${imagePreview ? 'border-primary/20 bg-primary/5' : 'border-outline-variant/30 bg-surface-container-low'} ${canCreate ? 'cursor-pointer hover:bg-surface-container-high' : 'cursor-default'}`}
                  onClick={() => canCreate && document.getElementById('image-upload')?.click()}
                >
                  {imagePreview ? (
                    <div className="absolute inset-2">
                      <img src={imagePreview} className="w-full h-full object-cover rounded-2xl" alt="Preview" />
                      <div className={`absolute inset-0 bg-black/40 opacity-0 transition-opacity rounded-2xl flex items-center justify-center gap-4 ${canCreate ? 'group-hover:opacity-100' : ''}`}>
                        {canCreate && (
                          <>
                            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl text-white">
                              <Camera size={20} />
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setImageFile(null);
                                setImagePreview(null);
                              }}
                              className="p-2 bg-error/20 backdrop-blur-md rounded-xl text-white hover:bg-error"
                            >
                              <Trash size={20} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 bg-white rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
                        <Paperclip size={20} className="text-primary/40" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Sube una imagen o banner</p>
                    </>
                  )}
                  <input type="file" id="image-upload" className="hidden" accept="image/*" onChange={handleImageChange} />
                </div>
              </div>

              {/* Block 3: Category Color */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-6 bg-tertiary-fixed rounded-full" />
                  <h3 className="font-headline font-bold text-on-surface text-sm">Categoría del Evento</h3>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {AVAILABLE_COLORS.map(color => (
                    <label key={color} className={`relative group ${canCreate ? 'cursor-pointer' : 'pointer-events-none'}`}>
                      <input type="radio" {...register('color')} value={color} className="peer sr-only" disabled={!canCreate} />
                      <div
                        className="w-full h-12 rounded-2xl border-4 border-transparent peer-checked:border-primary/20 peer-checked:scale-110 transition-all shadow-sm flex items-center justify-center"
                        style={{ backgroundColor: color }}
                      >
                        <span className="text-[8px] text-white font-black uppercase tracking-tight opacity-80 text-center leading-tight px-1">
                          {EVENT_TYPE_LABELS[color] || color}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                <input type="hidden" {...register('color')} value={watchColor} />
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-10 bg-surface-container-low/30 border-t border-outline-variant/5 flex gap-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-8 py-5 bg-white ghost-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-high transition-all active:scale-95"
              >
                {canCreate ? 'Cancelar' : 'Cerrar'}
              </button>
              
              {canCreate && (
                <button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  disabled={saving}
                  className="flex-1 px-8 py-5 bg-primary rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>{selectedEvent ? 'Actualizar Evento' : 'Registrar en Agenda'}</>
                  )}
                </button>
              )}

              {selectedEvent && canCreate && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-6 py-5 bg-error/10 text-error rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-error/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
