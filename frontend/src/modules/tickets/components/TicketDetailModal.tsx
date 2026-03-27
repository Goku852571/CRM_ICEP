import { useState, useEffect } from 'react';
import { getTicket, updateTicketStatus, Ticket, History } from '../services/ticketService';
import { X, Clock, User, AlertCircle, FileText, Activity } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';

interface Props {
  ticketId: number;
  onClose: () => void;
  onUpdate: () => void;
}

const StatusMap: Record<string, { label: string, color: string }> = {
  open: { label: 'Abierto', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'En Progreso', color: 'bg-yellow-100 text-yellow-800' },
  paused: { label: 'Pausado', color: 'bg-gray-100 text-gray-800' },
  closed: { label: 'Cerrado', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
};

export default function TicketDetailModal({ ticketId, onClose, onUpdate }: Props) {
  const { hasPermission } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusReason, setStatusReason] = useState('');
  const [showStatusConfirm, setShowStatusConfirm] = useState<string | null>(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const data = await getTicket(ticketId);
        setTicket(data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [ticketId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!statusReason) {
      alert('Debes ingresar un motivo para el cambio de estado');
      return;
    }
    
    try {
      await updateTicketStatus(ticketId, newStatus, statusReason);
      setShowStatusConfirm(null);
      setStatusReason('');
      onUpdate();
      
      // Reload ticket internally
      const data = await getTicket(ticketId);
      setTicket(data.data);
    } catch (error) {
      alert('Error al cambiar el estado');
    }
  };

  if (loading || !ticket) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white p-8 rounded-2xl flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500 font-medium animate-pulse">Cargando ticket...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white h-full sm:h-[calc(100vh-2rem)] w-full max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b shrink-0 bg-gray-50/50 sm:rounded-t-2xl">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-gray-400 bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
              TICK-{ticket.id.toString().padStart(4, '0')}
            </span>
            <h2 className="text-xl font-bold font-primary text-gray-900 line-clamp-1">{ticket.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white text-gray-400 hover:text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl transition">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">Estado</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${StatusMap[ticket.status].color}`}>
                {StatusMap[ticket.status].label}
              </span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">Prioridad</span>
              <span className="text-sm font-semibold capitalize text-gray-900">{ticket.priority}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">Área</span>
              <span className="text-sm font-semibold text-gray-900 truncate">{ticket.area?.name}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">Solicita</span>
              <span className="text-sm font-semibold text-gray-900 truncate">{ticket.requester?.name}</span>
            </div>
          </div>

          {/* Issue Description */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-3">
              <FileText size={16} /> Descripción del Problema
            </h3>
            <div className="bg-white border-2 border-dashed border-gray-200 p-5 rounded-2xl text-gray-700 leading-relaxed font-medium">
              {ticket.description}
            </div>
          </div>

          {/* Quick Actions (Status Change) */}
          {hasPermission('tickets.edit') && (
            <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl">
               <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-4">
                <Activity size={16} /> Panel de Acción Rápida
              </h3>
              
              {!showStatusConfirm ? (
                <div className="flex flex-wrap gap-2">
                  {Object.keys(StatusMap).filter(k => k !== ticket.status).map(status => (
                    <button 
                      key={status} 
                      onClick={() => setShowStatusConfirm(status)}
                      className={`px-4 py-2 text-sm font-bold rounded-xl transition ${StatusMap[status].color} hover:opacity-80 border-transparent hover:scale-105 transform duration-150`}
                    >
                      Mover a {StatusMap[status].label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm animate-in zoom-in-95 duration-200">
                  <p className="text-sm font-bold text-gray-700 mb-2">Motivo del cambio a <span className={`px-2 py-0.5 rounded text-xs ml-1 ${StatusMap[showStatusConfirm].color}`}>{StatusMap[showStatusConfirm].label}</span>:</p>
                  <input 
                    type="text" 
                    value={statusReason}
                    onChange={e => setStatusReason(e.target.value)}
                    placeholder="Ej: Problema resuelto, equipo contactado..."
                    className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all mb-3"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => {setShowStatusConfirm(null); setStatusReason('')}} className="px-4 py-2 text-sm text-gray-500 font-bold hover:bg-gray-50 rounded-lg">Cancelar</button>
                    <button 
                      onClick={() => handleStatusChange(showStatusConfirm)}
                      className="px-4 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition disabled:opacity-50"
                      disabled={!statusReason}
                    >
                      Confirmar Cambio
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History / Audit Log */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Clock size={16} /> Historial de Actividad
            </h3>
            
            <div className="space-y-6 pl-4 border-l-2 border-gray-100">
              {ticket.histories?.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay historial de cambios.</p>
              ) : (
                ticket.histories?.map((history: History, index) => (
                  <div key={history.id} className="relative">
                    <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-white"></div>
                    <div>
                      <div className="flex items-center gap-2">
                         <span className="font-bold text-gray-900 text-sm">{history.user?.name || 'Sistema'}</span>
                         <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">{new Date(history.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">
                        <span className="font-medium text-blue-600">{history.old_value || 'Iniciado'}</span> 
                        <span className="mx-2 text-gray-300">→</span> 
                        <span className="font-medium text-green-600">{history.new_value}</span>
                      </p>
                      {history.reason && (
                        <div className="mt-2 bg-gray-50 border border-gray-100 p-3 rounded-xl text-sm italic text-gray-600">
                          "{history.reason}"
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
