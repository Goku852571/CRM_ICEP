import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getTickets, getAreas, Ticket, Area } from '../services/ticketService';
import { Plus, Filter, MoreVertical, Clock, AlertCircle } from 'lucide-react';
import TicketFormModal from '../components/TicketFormModal';
import TicketDetailModal from '../components/TicketDetailModal';
import { useAuth } from '@/shared/hooks/useAuth';

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
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    area_id: '',
    status: '',
    priority: ''
  });

  const location = useLocation();
  const fetchData = async () => {
    setLoading(true);
    try {
      const [ticketsResponse, areasResponse] = await Promise.all([
        getTickets(filters),
        getAreas()
      ]);
      setTickets(ticketsResponse.data);
      setAreas(areasResponse.data);
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Check for deep link from notification state
    if (location.state?.selectedTicketId) {
      setSelectedTicketId(location.state.selectedTicketId);
    }
  }, [filters, location.state]);

  const handleOpenDetail = (id: number) => {
    setSelectedTicketId(id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-primary">Módulo de Tickets</h1>
          <p className="text-sm text-gray-500">Gestión y atención de tickets internos</p>
        </div>
        {hasPermission('tickets.create') && (
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition shadow-sm font-medium"
          >
            <Plus size={18} />
            Nuevo Ticket
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-gray-500 font-medium text-sm">
          <Filter size={18} /> Filtros:
        </div>
        <select 
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          value={filters.status}
          onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))}
        >
          <option value="">Todos los Estados</option>
          <option value="open">Abierto</option>
          <option value="in_progress">En Progreso</option>
          <option value="paused">Pausado</option>
          <option value="closed">Cerrado</option>
        </select>
        
        <select 
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          value={filters.priority}
          onChange={(e) => setFilters(prev => ({...prev, priority: e.target.value}))}
        >
          <option value="">Todas las Prioridades</option>
          <option value="normal">Normal</option>
          <option value="urgent">Urgente</option>
          <option value="priority">Alta Prioridad</option>
        </select>
        
        <select 
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-100"
          value={filters.area_id}
          onChange={(e) => setFilters(prev => ({...prev, area_id: e.target.value}))}
        >
          <option value="">Todas las Áreas</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
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
                            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded truncate max-w-[120px]">
                              {ticket.area?.name}
                            </span>
                            
                            {ticket.assignee ? (
                              <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold" title={ticket.assignee.name}>
                                {ticket.assignee.name.charAt(0)}
                              </div>
                            ) : (
                              <div className="h-6 w-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400" title="Sin asignar">
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
          onClose={() => setIsFormOpen(false)} 
          onSuccess={() => { setIsFormOpen(false); fetchData(); }} 
        />
      )}
      
      {selectedTicketId && (
        <TicketDetailModal 
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}
