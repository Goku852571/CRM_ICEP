import { useState, useEffect, useCallback, useRef } from 'react';
import { getTicket, updateTicketStatus, replyToTicket, Ticket, History, TicketReply, TicketResource } from '../services/ticketService';
import { X, Clock, User, AlertCircle, FileText, Activity, Paperclip, Send, File, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { showError } from '@/shared/utils/alerts';

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
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
  waiting_approval: { label: 'Esperando Aprob.', color: 'bg-purple-100 text-purple-800' },
  changes_requested: { label: 'Cambios Solicitados', color: 'bg-orange-100 text-orange-800' }
};

export default function TicketDetailModal({ ticketId, onClose, onUpdate }: Props) {
  const { user, hasPermission } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusReason, setStatusReason] = useState('');
  const [showStatusConfirm, setShowStatusConfirm] = useState<string | null>(null);

  const [replyMessage, setReplyMessage] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [sendingReply, setSendingReply] = useState(false);
  const [requestApproval, setRequestApproval] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewResource, setPreviewResource] = useState<TicketResource | null>(null);

  const fetchTicket = useCallback(async () => {
    try {
      const data = await getTicket(ticketId);
      setTicket(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // Always call the latest version from interval/event listeners
  const fetchTicketRef = useRef(fetchTicket);
  useEffect(() => { fetchTicketRef.current = fetchTicket; }, [fetchTicket]);

  useEffect(() => {
    fetchTicket();

    // Auto-refresh every 15s while modal is open → keeps status, replies, history live
    const intervalId = setInterval(() => fetchTicketRef.current(), 15000);

    // Also refresh immediately on ticket-change events (e.g. another user changed status)
    const handleChange = () => fetchTicketRef.current();
    window.addEventListener('crm:tickets-changed', handleChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('crm:tickets-changed', handleChange);
    };
  }, [fetchTicket]);



  const handleStatusChange = async (newStatus: string) => {
    if (!statusReason) {
      showError('Atención', 'Debes ingresar un motivo para el cambio de estado');
      return;
    }
    
    try {
      await updateTicketStatus(ticketId, newStatus, statusReason);
      setShowStatusConfirm(null);
      setStatusReason('');
      // Notify the board and any listeners that a ticket changed
      window.dispatchEvent(new CustomEvent('crm:tickets-changed'));
      onUpdate();
      await fetchTicket();
    } catch (error) {
      showError('Error', 'No se pudo cambiar el estado');
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() && replyFiles.length === 0) return;
    
    try {
      setSendingReply(true);
      await replyToTicket(ticketId, replyMessage, replyFiles);
      
      if (requestApproval) {
        await updateTicketStatus(ticketId, 'waiting_approval', 'Solicitud de aprobación enviada con la respuesta.');
        setRequestApproval(false);
      }

      setReplyMessage('');
      setReplyFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Notify board and listeners
      window.dispatchEvent(new CustomEvent('crm:tickets-changed'));
      await fetchTicket();
      onUpdate();

    } catch (error) {
      showError('Error', 'No se pudo enviar la respuesta');
    } finally {
      setSendingReply(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReplyFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setReplyFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const threadedItems = [
    ...(ticket?.histories?.map(h => ({ type: 'history' as const, data: h, date: new Date(h.created_at).getTime() })) || []),
    ...(ticket?.replies?.map(r => ({ type: 'reply' as const, data: r, date: new Date(r.created_at).getTime() })) || [])
  ].sort((a, b) => b.date - a.date);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 p-4 md:p-8 animate-in fade-in duration-300 backdrop-blur-md">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] flex flex-col animate-in zoom-in-95 duration-500 overflow-hidden border border-white/20">
        
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b shrink-0 bg-white/50 backdrop-blur-sm relative z-10">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-black text-primary/40 bg-primary/5 px-3 py-1 rounded-full uppercase tracking-widest border border-primary/10">
                  Ticket #{ticket.id.toString().padStart(4, '0')}
                </span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black font-headline text-gray-900 tracking-tight">{ticket.title}</h2>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-4 bg-gray-50 text-gray-400 hover:text-white hover:bg-red-500 rounded-2xl transition duration-300 group shadow-sm hover:shadow-lg active:scale-95"
          >
            <X size={24} strokeWidth={3} className="group-hover:rotate-90 transition duration-300" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-24">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Estado Actual</span>
              <span className={`inline-flex w-fit items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-tight ${StatusMap[ticket.status].color}`}>
                {StatusMap[ticket.status].label}
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-24">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Prioridad</span>
              <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${ticket.priority === 'urgent' ? 'bg-orange-500' : ticket.priority === 'priority' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                 <span className="text-sm font-bold capitalize text-gray-700">{ticket.priority}</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-24">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Responsable</span>
              <div className="flex items-center gap-3">
                {ticket.assignee ? (
                   <>
                     <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/20 shadow-sm bg-gray-50 flex items-center justify-center shrink-0">
                       {ticket.assignee.avatar ? (
                         <img src={ticket.assignee.avatar.startsWith('http') ? ticket.assignee.avatar : `/api/v1${ticket.assignee.avatar}`} alt="" className="w-full h-full object-cover" />
                       ) : (
                         <span className="text-xs font-black text-primary">{ticket.assignee.name.charAt(0)}</span>
                       )}
                     </div>
                     <span className="text-xs font-bold text-gray-700 line-clamp-1">{ticket.assignee.name}</span>
                   </>
                ) : (
                   <span className="text-xs font-bold text-gray-300 italic">No asignado aún</span>
                )}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-24">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Solicitante</span>
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-xs font-black text-blue-600 shrink-0">
                   {ticket.requester?.avatar ? (
                      <img src={ticket.requester.avatar.startsWith('http') ? ticket.requester.avatar : `/api/v1${ticket.requester.avatar}`} alt="" className="w-full h-full rounded-full object-cover" />
                   ) : ticket.requester?.name.charAt(0)}
                 </div>
                 <span className="text-xs font-bold text-gray-700 line-clamp-1">{ticket.requester?.name}</span>
              </div>
            </div>
          </div>

          {/* Issue Description */}
          <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
               <FileText size={120} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-4">Descripción del Problema</h3>
            <p className="text-lg font-medium leading-relaxed relative z-10">
              {ticket.description}
            </p>
            
            {ticket.resources && ticket.resources.length > 0 && (
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-3">
                {ticket.resources.map(res => (
                  <button 
                    key={`main-res-${res.id}`} 
                    onClick={() => setPreviewResource(res)}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 p-3 rounded-2xl text-xs font-bold text-white transition backdrop-blur-sm"
                  >
                    {res.mime_type.startsWith('image/') ? <ImageIcon size={14} /> : <File size={14} />}
                    {res.file_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions (Status Change) */}
          {(hasPermission('tickets.edit') || ticket.assignee_id === user?.id || ticket.requester_id === user?.id) && (
            <div className="bg-surface-container-low border border-outline-variant/10 p-6 rounded-[2.5rem] shadow-sm">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <Activity size={14} strokeWidth={3} /> Centro de Control
                  </h3>
                  {!showStatusConfirm && (
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                      Acciones Disponibles
                    </span>
                  )}
               </div>
              
              {!showStatusConfirm ? (
                <div className="flex flex-wrap gap-3">
                  {/* Special buttons for Requesters when waiting approval */}
                  {ticket.status === 'waiting_approval' && ticket.requester_id === user?.id && (
                    <>
                      <button 
                        onClick={() => { setShowStatusConfirm('closed'); setStatusReason('Tarea aceptada y finalizada por el solicitante.'); }}
                        className="px-6 py-3 text-[11px] font-black uppercase tracking-widest rounded-2xl bg-green-500 text-white shadow-lg shadow-green-200 border-2 border-white hover:scale-105 active:scale-95 transition"
                      >
                        ✅ Aceptar y Finalizar Tarea
                      </button>
                      <button 
                        onClick={() => setShowStatusConfirm('changes_requested')}
                        className="px-6 py-3 text-[11px] font-black uppercase tracking-widest rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200 border-2 border-white hover:scale-105 active:scale-95 transition"
                      >
                        ⚠️ Solicitar Cambios / Negar
                      </button>
                    </>
                  )}

                  {/* Standard status buttons if not handled above */}
                  {!(ticket.status === 'waiting_approval' && ticket.requester_id === user?.id) && 
                    Object.keys(StatusMap).filter(k => k !== ticket.status).map(status => (
                      <button 
                        key={status} 
                        onClick={() => setShowStatusConfirm(status)}
                        className={`px-5 py-3 text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${StatusMap[status].color} border-2 border-white`}
                      >
                        Mover a {StatusMap[status].label}
                      </button>
                    ))
                  }
                </div>
              ) : (
                <div className="bg-white p-6 rounded-3xl border-2 border-primary/10 shadow-xl animate-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-3 h-3 rounded-full ${StatusMap[showStatusConfirm].color.split(' ')[0]}`}></div>
                    <p className="text-sm font-bold text-gray-800">
                      Confirmar cambio a <span className="text-primary">{StatusMap[showStatusConfirm].label}</span>
                    </p>
                  </div>
                  
                  <textarea 
                    value={statusReason}
                    onChange={e => setStatusReason(e.target.value)}
                    placeholder="Escribe el motivo del cambio (ej: Tarea completada, requiere ajustes...)"
                    className="w-full border-None bg-gray-50 rounded-2xl p-4 text-sm outline-none focus:ring-4 focus:ring-primary/5 transition-all mb-4 min-h-[100px] resize-none"
                    autoFocus
                  />
                  
                  <div className="flex justify-end items-center gap-4">
                    <button 
                      onClick={() => {setShowStatusConfirm(null); setStatusReason('')}} 
                      className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => handleStatusChange(showStatusConfirm)}
                      disabled={!statusReason}
                      className="px-8 py-4 bg-primary text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition disabled:opacity-50"
                    >
                      Actualizar Estado
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Thread / History */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Clock size={16} /> Conversación y Actividad
            </h3>
            
            <div className="space-y-6 pl-4 border-l-2 border-gray-100 mb-8">
              {threadedItems.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay historial activo.</p>
              ) : (
                threadedItems.map((item, index) => {
                  if (item.type === 'history') {
                    const history = item.data;
                    return (
                      <div key={`hist-${history.id}`} className="relative">
                        <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-gray-300 border-2 border-white"></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm">{history.user?.name || 'Sistema'}</span>
                            <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">{new Date(history.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">
                            <span className="font-medium text-gray-500">Cambio registrado:</span>{' '}
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
                    );
                  } else {
                    const reply = item.data;
                    return (
                      <div key={`rep-${reply.id}`} className="relative group">
                        <div className="absolute -left-[23px] top-4 h-3 w-3 rounded-full bg-blue-600 border-2 border-white shadow-sm ring-4 ring-blue-50"></div>
                        <div className="bg-white border border-gray-100 p-5 rounded-3xl rounded-tl-none shadow-sm hover:shadow-md transition duration-300">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                               {(reply.user as any).avatar ? (
                                 <img src={(reply.user as any).avatar.startsWith('http') ? (reply.user as any).avatar : `/api/v1${(reply.user as any).avatar}`} className="w-8 h-8 rounded-full object-cover border border-blue-50 shadow-sm" alt="" />
                               ) : (
                                 <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black border border-primary/5">
                                   {reply.user?.name.charAt(0)}
                                 </div>
                               )}
                               <div>
                                 <span className="font-black text-gray-900 text-xs block leading-none mb-1">{reply.user?.name}</span>
                                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{new Date(reply.created_at).toLocaleString()}</span>
                               </div>
                            </div>
                            <div className="text-[10px] font-black text-primary/40 uppercase tracking-widest hidden group-hover:block">Respuesta</div>
                          </div>
                          
                          <p className="text-sm text-gray-600 leading-relaxed font-body">
                            {reply.message}
                          </p>
                          
                          {reply.resources && reply.resources.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-gray-50">
                              {reply.resources.map(res => (
                                <button 
                                  key={res.id} 
                                  onClick={() => setPreviewResource(res)}
                                  className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-transparent p-2 rounded-xl text-[10px] font-black text-gray-500 transition uppercase tracking-tight"
                                >
                                  {res.mime_type.startsWith('image/') ? <ImageIcon size={12} className="text-blue-500" /> : <File size={12} className="text-red-500" />}
                                  {res.file_name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                })
              )}
            </div>

            {/* Reply Form */}
            {ticket.status !== 'closed' && ticket.status !== 'cancelled' && (
              <form onSubmit={handleReplySubmit} className="bg-surface-container-lowest border border-outline-variant/10 rounded-[2.5rem] p-6 shadow-2xl shadow-primary/5 relative sticky bottom-0">
                <textarea 
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                  placeholder="Escribe tu mensaje aquí..."
                  className="w-full text-sm font-medium outline-none resize-none min-h-[100px] bg-transparent"
                />
                
                {replyFiles.length > 0 && (
                   <div className="flex flex-wrap gap-2 mb-4 p-3 bg-white/50 rounded-2xl border border-gray-100">
                     {replyFiles.map((f, i) => (
                       <span key={i} className="flex items-center gap-2 text-[10px] font-black uppercase bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm">
                         {f.name} 
                         <button type="button" onClick={() => removeFile(i)} className="text-error hover:scale-110 transition ml-1"><X size={12} strokeWidth={3}/></button>
                       </span>
                     ))}
                   </div>
                )}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                   <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                       <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                       <button type="button" onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-primary p-3 rounded-2xl hover:bg-primary/5 transition border border-transparent">
                         <Paperclip size={20} />
                       </button>
                     </div>

                     {ticket.assignee_id === user?.id && ticket.status !== 'waiting_approval' && (
                        <label className="flex items-center gap-2 cursor-pointer group">
                           <input 
                             type="checkbox" 
                             checked={requestApproval} 
                             onChange={e => setRequestApproval(e.target.checked)}
                             className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                           />
                           <span className="text-[10px] font-black uppercase text-gray-500 group-hover:text-primary transition">Solicitar Aprobación</span>
                        </label>
                     )}
                   </div>
                   <button 
                     type="submit" 
                     disabled={sendingReply || (!replyMessage.trim() && replyFiles.length === 0)}
                     className="bg-primary hover:scale-105 active:scale-95 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-lg shadow-primary/20 disabled:opacity-50 transition"
                   >
                     {sendingReply ? <Activity size={16} className="animate-spin" /> : <Send size={16} strokeWidth={3} />}
                     {requestApproval ? 'Enviar y Solicitar Aprobación' : 'Enviar Respuesta'}
                   </button>
                </div>
              </form>
            )}
          </div>
          
        </div>
      </div>

      {/* Resource Preview Modal */}
      {previewResource && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 sm:p-10 animate-in fade-in">
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <button 
              onClick={() => setPreviewResource(null)}
              className="absolute top-4 right-4 z-10 text-white bg-black/50 p-2 rounded-full hover:bg-red-500 transition border border-white/20"
            >
              <X size={24} />
            </button>
            
            <a href={previewResource.url} target="_blank" rel="noreferrer" className="absolute top-4 right-20 z-10 text-white bg-black/50 px-4 py-2 rounded-full hover:bg-blue-600 transition border border-white/20 text-sm font-bold flex items-center gap-2">
               Abrir en nueva pestaña
            </a>

            {previewResource.mime_type.startsWith('image/') ? (
              <img src={previewResource.url} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl relative z-0" />
            ) : (
              <iframe src={previewResource.url} className="w-full h-full max-w-5xl rounded-lg bg-white shadow-2xl relative z-0" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
