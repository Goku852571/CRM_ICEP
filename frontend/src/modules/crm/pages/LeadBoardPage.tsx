import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Plus, Search, Filter, Phone, Mail, Clock, 
  MapPin, CheckCircle2, ChevronRight, XCircle, Tag, Building2, User
} from 'lucide-react';
import { getLeads, updateLeadStatus, Lead } from '../services/leadService';
import LeadDetailModal from '../components/LeadDetailModal';
import ImportLeadsModal from '../components/ImportLeadsModal';
import LeadFormModal from '../components/LeadFormModal';
import { showSuccess, showError } from '@/shared/utils/alerts';
import { useAuth } from '@/shared/hooks/useAuth';
import { DownloadCloud } from 'lucide-react';
import clsx from 'clsx';

const COLUMNS = [
  { id: 'new', title: 'Nuevos', color: 'bg-blue-50/50', headerColor: 'text-blue-600', dot: 'bg-blue-500' },
  { id: 'contacted', title: 'Contactados', color: 'bg-indigo-50/50', headerColor: 'text-indigo-600', dot: 'bg-indigo-500' },
  { id: 'interested', title: 'Interesados', color: 'bg-purple-50/50', headerColor: 'text-purple-600', dot: 'bg-purple-500' },
  { id: 'following_up', title: 'Seguimiento', color: 'bg-amber-50/50', headerColor: 'text-amber-600', dot: 'bg-amber-500' },
  { id: 'ready_to_close', title: 'Cierre', color: 'bg-orange-50/50', headerColor: 'text-orange-600', dot: 'bg-orange-500' },
  { id: 'closed_won', title: 'Ganados', color: 'bg-emerald-50/50', headerColor: 'text-emerald-600', dot: 'bg-emerald-500' },
  { id: 'lost', title: 'Perdidos', color: 'bg-red-50/50', headerColor: 'text-red-600', dot: 'bg-red-500' },
];

export default function LeadBoardPage() {
  const { hasPermission, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [advisorFilter, setAdvisorFilter] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', { kanban: true }],
    queryFn: () => getLeads({ kanban: true }).then(res => res.data as Lead[]),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number, status: string }) => updateLeadStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      showSuccess('Estado Actualizado', 'El lead se movió correctamente en el flujo.');
    },
    onError: () => showError('Error al actualizar', 'No se pudo mover el lead. Intente recargar.í'),
  });

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId) return; // Same column

    const leadIdStr = draggableId.split('-')[1];
    const leadId = parseInt(leadIdStr);
    const newStatus = destination.droppableId;

    // PROTECTION: UI Check to prevent dragging back to 'new'
    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.status !== 'new' && newStatus === 'new') {
        showError('Operación no permitida', 'No se puede regresar un contacto a la fase Nuevo.');
        return;
    }

    updateStatusMutation.mutate({ id: leadId, status: newStatus });
  };

  // Filter leads client-side for kanban
  const uniqueCourses = Array.from(new Set(leads.map(l => l.course?.name).filter(Boolean)));
  const uniqueSources = Array.from(new Set(leads.map(l => l.source).filter(Boolean)));
  const uniqueAdvisors = Array.from(new Map(leads.filter(l => l.advisor).map(l => [l.advisor?.id, l.advisor])).values());

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.phone.includes(searchTerm) ||
                          lead.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter ? lead.source === sourceFilter : true;
    const matchesCourse = courseFilter ? lead.course?.name === courseFilter : true;
    const matchesAdvisor = advisorFilter ? lead.advisor_id?.toString() === advisorFilter : true;
    
    return matchesSearch && matchesSource && matchesCourse && matchesAdvisor;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-surface-container-lowest font-body">
      {/* Header Actions */}
      <div className="flex-none p-6 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest border-b border-outline-variant/15 z-10">
        <div>
          <h1 className="text-2xl font-headline font-bold text-primary flex items-center gap-3">
            Gestión Comercial (CRM)
            <span className="px-2.5 py-1 rounded-md bg-secondary-container/50 text-on-secondary-container text-xs font-bold tracking-widest uppercase">
              {leads.length} Leads
            </span>
          </h1>
          <p className="text-sm font-medium text-on-surface-variant flex items-center gap-1.5 mt-1">
             Pipelines de conversión, matrículas pendientes y oportunidades
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto custom-scrollbar no-scrollbar">
          <div className="relative flex-none w-48 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={14} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border-none bg-surface-container-high rounded-xl text-xs focus:ring-2 focus:ring-primary-fixed hover:bg-surface-variant transition-all font-medium text-on-surface"
            />
          </div>

          <select 
             className="flex-none py-2 px-3 border-none bg-surface-container-high rounded-xl text-[10px] sm:text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary-fixed hover:bg-surface-variant transition-all outline-none"
             value={sourceFilter}
             onChange={e => setSourceFilter(e.target.value)}
          >
             <option value="">Origen</option>
             {uniqueSources.map(s => (
               <option key={s as string} value={s as string}>
                 {s === 'import' ? 'Importación' : s === 'enrollment_form' ? 'Autoregistro' : s}
               </option>
             ))}
          </select>

          <select 
             className="flex-none py-2 px-3 border-none bg-surface-container-high rounded-xl text-[10px] sm:text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary-fixed max-w-[120px] sm:max-w-[200px] truncate hover:bg-surface-variant transition-all outline-none"
             value={courseFilter}
             onChange={e => setCourseFilter(e.target.value)}
          >
             <option value="">Curso</option>
             {uniqueCourses.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
          </select>

          {(hasRole('admin') || hasRole('jefe')) && (
            <select 
               className="flex-none py-2 px-3 border-none bg-surface-container-high rounded-xl text-[10px] sm:text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary-fixed max-w-[120px] sm:max-w-[200px] truncate hover:bg-surface-variant transition-all outline-none"
               value={advisorFilter}
               onChange={e => setAdvisorFilter(e.target.value)}
            >
               <option value="">Asesor</option>
               {uniqueAdvisors.map(adv => (
                 <option key={adv?.id} value={adv?.id?.toString()}>{adv?.name}</option>
               ))}
            </select>
          )}
          
          {(hasRole('admin') || hasRole('jefe')) && (
            <button 
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-2 rounded-xl font-bold text-sm hover:shadow-md transition-all"
            >
              <DownloadCloud size={18} />
              <span className="hidden sm:inline">Importar Contactos</span>
            </button>
          )}

          <button 
            onClick={() => setShowLeadForm(true)}
            className="flex items-center gap-2 bg-primary-container text-on-primary-container disabled:opacity-50 px-4 py-2 rounded-xl font-bold text-sm hover:shadow-md transition-all active:scale-95"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nuevo Lead</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar bg-surface/50 p-6 min-h-0 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex gap-2">
               <div className="w-3 h-3 rounded-full bg-primary-container animate-bounce [animation-delay:-0.3s]"></div>
               <div className="w-3 h-3 rounded-full bg-primary-container animate-bounce [animation-delay:-0.15s]"></div>
               <div className="w-3 h-3 rounded-full bg-primary-container animate-bounce"></div>
            </div>
          </div>
        )}

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex h-full gap-5 pb-4 w-max">
            {COLUMNS.map((column) => {
              const columnLeads = filteredLeads.filter(l => l.status === column.id);

              return (
                <div key={column.id} className="flex flex-col w-[320px] max-h-full rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm overflow-hidden flex-shrink-0">
                  
                  {/* Column Header */}
                  <div className={clsx("p-4 border-b border-outline-variant/10 flex items-center justify-between pointer-events-none select-none", column.color)}>
                    <div className="flex items-center gap-2">
                       <span className={clsx("w-2 h-2 rounded-full", column.dot)}></span>
                       <h3 className={clsx("font-headline font-bold text-sm uppercase tracking-wide", column.headerColor)}>
                         {column.title}
                       </h3>
                    </div>
                    <span className="bg-white/60 px-2 py-0.5 rounded text-xs font-bold text-on-surface-variant">
                      {columnLeads.length}
                    </span>
                  </div>

                  {/* Column Body / Droppable Area */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={clsx(
                            "min-h-[150px] transition-colors rounded-xl",
                            snapshot.isDraggingOver ? 'bg-surface-variant/30 ring-2 ring-primary-fixed/50 ring-inset' : ''
                          )}
                        >
                          {columnLeads.map((lead, index) => (
                            <Draggable key={`lead-${lead.id}`} draggableId={`lead-${lead.id}`} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => setSelectedLeadId(lead.id)}
                                  className={clsx(
                                    "bg-white p-4 rounded-xl border border-outline-variant/20 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing mb-3 group",
                                    snapshot.isDragging ? 'shadow-xl ring-2 ring-primary-fixed/50 rotate-2' : ''
                                  )}
                                  style={provided.draggableProps.style}
                                >
                                  {/* Source Badge */}
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                                      {lead.source === 'enrollment_form' ? (
                                        <span className="text-blue-600 bg-blue-50 px-1.5 rounded inline-flex items-center gap-1">🌐 Autoregistro</span>
                                      ) : (
                                        <span className="text-gray-500 bg-gray-50 px-1.5 rounded inline-flex items-center gap-1">👤 Manual</span>
                                      )}
                                    </span>
                                    <span className="text-[10px] bg-surface-container-high text-on-surface-variant px-1.5 rounded font-mono font-bold">
                                      {lead.student_id ? lead.student_id.slice(-6) : 'N/A'}
                                    </span>
                                  </div>

                                  <h4 className="font-bold text-on-surface leading-tight mb-1 group-hover:text-primary-compressed transition-colors">
                                    {lead.name}
                                  </h4>

                                  <div className="text-xs text-on-surface-variant space-y-1 mb-3">
                                    <div className="flex items-center gap-1.5">
                                      <Phone size={12} className="text-outline" /> {lead.phone}
                                    </div>
                                    {lead.course?.name && (
                                      <div className="flex items-center gap-1.5 line-clamp-1">
                                        <Tag size={12} className="text-outline shrink-0" /> <span className="truncate">{lead.course.name}</span>
                                      </div>
                                    )}
                                    {(hasRole('admin') || hasRole('jefe')) && lead.advisor?.name && (
                                      <div className="flex items-center gap-1.5 mt-2 pt-1 border-t border-dashed border-outline-variant/10 text-primary font-bold">
                                        <User size={12} className="shrink-0" /> <span className="truncate whitespace-nowrap text-[10px] uppercase tracking-tighter">Asesor: {lead.advisor.name}</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="pt-3 border-t border-outline-variant/10 flex items-center justify-between text-[11px] font-medium text-on-surface-variant/70">
                                     <div className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {/* Simple relative time (mock logic or actual) */}
                                        {new Date(lead.created_at).toLocaleDateString()}
                                     </div>
                                     <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        Detalles &rarr;
                                     </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Modal Details */}
      {selectedLeadId && (
        <LeadDetailModal 
          leadId={selectedLeadId} 
          onClose={() => setSelectedLeadId(null)} 
          onUpdated={() => queryClient.invalidateQueries({ queryKey: ['leads'] })}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportLeadsModal 
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            queryClient.invalidateQueries({ queryKey: ['leads'] });
          }}
        />
      )}

      {/* New Lead Form */}
      {showLeadForm && (
        <LeadFormModal
          onClose={() => setShowLeadForm(false)}
          onSuccess={() => {
            setShowLeadForm(false);
            queryClient.invalidateQueries({ queryKey: ['leads'] });
          }}
        />
      )}
    </div>
  );
}
