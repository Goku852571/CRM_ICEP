import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getTickets, getAreas, Ticket, Area } from '../services/ticketService';
import { Plus, Filter, MoreVertical, Clock, AlertCircle, TrendingUp, Activity, Zap, Ticket as TicketIcon, CheckCircle2 } from 'lucide-react';
import TicketFormModal from '../components/TicketFormModal';
import TicketDetailModal from '../components/TicketDetailModal';
import { useAuth } from '@/shared/hooks/useAuth';
import { getUsers, User as AppUser } from '@/modules/users/services/userService';

const StatusMap: Record<string, { label: string, color: string }> = {
  open: { label: 'Abierto', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En Progreso', color: 'bg-yellow-100 text-yellow-700' },
  paused: { label: 'Pausado', color: 'bg-gray-100 text-gray-700' },
  closed: { label: 'Cerrado', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' }
};

const PriorityMap: Record<string, { label: string, color: string, icon: any }> = {
  normal: { label: 'Normal', color: 'bg-gray-100 text-gray-600', icon: Clock },
  urgent: { label: 'Urgente', color: 'bg-orange-100 text-orange-600', icon: AlertCircle },
  priority: { label: 'Prioridad', color: 'bg-red-100 text-red-600', icon: AlertCircle }
};

export default function TicketListPage() {
  const { hasPermission } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);  // only true on FIRST load
  const [refreshing, setRefreshing] = useState(false); // silent background refresh indicator
  
  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    priority: ''
  });

  const location = useLocation();

  // silent=true → data updates in background without hiding the board
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [ticketsResponse, areasResponse, usersResponse] = await Promise.all([
        getTickets(filters),
        getAreas(),
        getUsers()
      ]);
      setTickets(ticketsResponse.data);
      setAreas(areasResponse.data);
      setUsers(usersResponse.data);
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  // Ref so interval/event handlers always call the latest fetchData
  const fetchDataRef = useRef(fetchData);
  useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);

  useEffect(() => {
    // Initial full load
    fetchData(false);

    // Deep-link from notification
    if (location.state?.selectedTicketId) {
      setSelectedTicketId(location.state.selectedTicketId);
    }

    // Silent refresh on ticket-change events (no board flicker)
    const handleExternalChange = () => fetchDataRef.current(true);
    window.addEventListener('crm:tickets-changed', handleExternalChange);

    // Poll every 10s silently — board stays visible
    const intervalId = setInterval(() => fetchDataRef.current(true), 10000);

    return () => {
      window.removeEventListener('crm:tickets-changed', handleExternalChange);
      clearInterval(intervalId);
    };
  }, [fetchData, location.state]);

  const handleOpenDetail = (id: number) => {
    setSelectedTicketId(id);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
      
      {/* Hero Header Section */}
      <div className="max-w-4xl">
        <h1 className="font-headline font-extrabold text-primary text-4xl md:text-5xl lg:text-6xl mb-3 tracking-tight leading-[1.1]">
          Centro de Soporte
        </h1>
        <p className="text-on-surface-variant font-body text-base md:text-lg leading-relaxed opacity-80">
          Gestión inteligente de incidencias, requerimientos y atención de tickets internos ICEP.
        </p>
        {/* Live-sync indicator */}
        {refreshing && (
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-primary/5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Sincronizando...</span>
          </div>
        )}
      </div>

      {/* Stats Bento Grid - Dashboard Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Tickets Totales', val: tickets.length, icon: TicketIcon, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'Abiertos / Pendientes', val: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length, icon: Activity, color: 'text-on-primary-container', bg: 'bg-secondary-container' },
          { label: 'Resueltos Hoy', val: tickets.filter(t => t.status === 'closed').length, icon: CheckCircle2, color: 'text-tertiary-fixed-dim', bg: 'bg-tertiary-fixed/5' },
          { label: 'Promedio de Respuesta', val: '1.2h', icon: Zap, color: 'text-error', bg: 'bg-error/5' },
        ].map((item, idx) => (
          <div 
            key={idx} 
            className="bg-surface-container-lowest rounded-2xl p-6 ghost-border flex flex-col justify-between h-44 group hover:bg-white hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
          >
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-xl ${item.bg} group-hover:bg-primary group-hover:text-white transition-colors duration-300`}>
                <item.icon size={22} className={item.color} />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-on-surface-variant/40 block mb-1">
                  {item.label}
                </span>
                <div className="text-3xl font-headline font-black text-primary tabular-nums">
                  {item.val}
                </div>
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div className="flex gap-1 items-end h-8">
                {[3, 5, 4, 7, 6].map((h, i) => (
                  <div 
                    key={i} 
                    className={`w-1.5 rounded-full transition-all duration-500 ${idx % 2 === 0 ? 'bg-primary/40' : 'bg-primary/60'}`} 
                    style={{ height: `${h * 4}px`, transitionDelay: `${idx * 50}ms` }}
                  />
                ))}
              </div>
              <div className={`text-[10px] font-black flex items-center px-3 py-1 rounded-full bg-surface-container-low text-primary`}>
                <TrendingUp size={12} className="mr-1" />
                +14%
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-4">
        {/* Filters */}
        <div className="bg-surface-container-low p-2 rounded-2xl border border-outline-variant/10 flex gap-2 flex-wrap items-center">
          <div className="flex items-center gap-2 text-on-surface-variant/60 font-black text-[10px] uppercase tracking-widest px-4">
            <Filter size={16} /> Filtros:
          </div>
          <select 
            className="bg-white border-none rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-primary/5 min-w-[150px]"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))}
          >
            <option value="">Todos los Estados</option>
            <option value="open">Abierto</option>
            <option value="in_progress">En Progreso</option>
            <option value="paused">Pausado</option>
            <option value="closed">Cerrado</option>
            <option value="cancelled">Cancelado</option>
          </select>
          
          <select 
            className="bg-white border-none rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-primary/5 min-w-[150px]"
            value={filters.priority}
            onChange={(e) => setFilters(prev => ({...prev, priority: e.target.value}))}
          >
            <option value="">Todas las Prioridades</option>
            <option value="normal">Normal</option>
            <option value="urgent">Urgente</option>
            <option value="priority">Alta Prioridad</option>
          </select>
        </div>

        {hasPermission('tickets.create') && (
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-primary text-white px-8 py-5 rounded-2xl hover:scale-105 active:scale-95 transition shadow-2xl shadow-primary/20 font-black text-xs uppercase tracking-widest"
          >
            <Plus size={20} strokeWidth={3} />
            Nuevo Ticket
          </button>
        )}
      </div>

      {/* Kanban / Task Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (

          <div className="flex gap-6 min-w-max h-full">
            {['open', 'in_progress', 'paused', 'closed'].map(statusKey => {
              const columnTickets = tickets.filter(t => t.status === statusKey);
              const columnLabel = StatusMap[statusKey].label;
              
              return (
                <div key={statusKey} className="w-80 flex flex-col bg-gray-50/50 rounded-2xl border border-gray-100 p-4 shrink-0">
                  <div className="flex justify-between items-center mb-4 px-1">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${StatusMap[statusKey].color.split(' ')[0]}`}></div>
                      {columnLabel}
                    </h3>
                    <span className="bg-white border text-xs font-bold px-2 py-0.5 rounded-full text-gray-500">
                      {columnTickets.length}
                    </span>
                  </div>
                  
                  <div className="flex-1 space-y-3 overflow-y-auto">
                    {columnTickets.map(ticket => {
                      const priority = PriorityMap[ticket.priority];
                      const PriorityIcon = priority.icon;
                      
                      return (
                        <div 
                          key={ticket.id} 
                          onClick={() => handleOpenDetail(ticket.id)}
                          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-blue-200 transition group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-gray-400">TICK-{ticket.id.toString().padStart(4, '0')}</span>
                            <div className="flex items-center gap-1">
                              {ticket.priority !== 'normal' && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${priority.color}`}>
                                  <PriorityIcon size={10} /> {priority.label}
                                </span>
                              )}
                            </div>
                          </div>
                          <h4 className="font-medium text-gray-900 leading-tight mb-2 group-hover:text-blue-600 transition">
                            {ticket.title}
                          </h4>
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex -space-x-2">
                               <div className="h-6 w-6 rounded-full bg-blue-50 border-2 border-white text-blue-700 flex items-center justify-center text-[8px] font-black shadow-sm" title={`Solicitante: ${ticket.requester?.name}`}>
                                 {ticket.requester?.name.charAt(0)}
                               </div>
                            </div>
                            
                            {ticket.assignee ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-gray-400">Asignado:</span>
                                {ticket.assignee.avatar ? (
                                  <img 
                                    src={ticket.assignee.avatar.startsWith('http') ? ticket.assignee.avatar : `/api/v1${ticket.assignee.avatar}`} 
                                    className="h-6 w-6 rounded-full object-cover border-2 border-white shadow-sm" 
                                    title={ticket.assignee.name}
                                    alt=""
                                  />
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm" title={ticket.assignee.name}>
                                    {ticket.assignee.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-6 w-6 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300" title="Sin asignar">
                                ?
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {columnTickets.length === 0 && (
                      <div className="text-center p-4 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                        No hay tickets
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isFormOpen && (
        <TicketFormModal 
          areas={areas}
          users={users}
          onClose={() => setIsFormOpen(false)} 
          onSuccess={() => { setIsFormOpen(false); fetchData(true); }} 
        />
      )}
      
      {selectedTicketId && (
        <TicketDetailModal 
          ticketId={selectedTicketId as number}
          onClose={() => setSelectedTicketId(null)}
          onUpdate={() => fetchData(true)}
        />
      )}

    </div>
  );
}
