import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult, DragUpdate } from '@hello-pangea/dnd';
import { 
  Plus, Search, Filter, Phone, Mail, Clock, 
  MapPin, CheckCircle2, ChevronRight, XCircle, Tag, Building2, User,
  DownloadCloud, Settings2
} from 'lucide-react';
import { getLeads, updateLeadStatus, Lead } from '../services/leadService';
import LeadDetailModal from '../components/LeadDetailModal';
import ImportLeadsModal from '../components/ImportLeadsModal';
import LeadFormModal from '../components/LeadFormModal';
import LeadSweepManagerModal from '../components/LeadSweepManagerModal';
import { showSuccess, showError } from '@/shared/utils/alerts';
import { useAuth } from '@/shared/hooks/useAuth';
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
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [advisorFilter, setAdvisorFilter] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showSweepModal, setShowSweepModal] = useState(false);

  useEffect(() => {
    if (location.state?.selectedLeadId) {
      setSelectedLeadId(location.state.selectedLeadId);
      // Clean up state so it doesn't re-trigger on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // Accordion State
  const [expandedColumns, setExpandedColumns] = useState<string[]>(['new', 'contacted']);
  const [hoverExpandedColumn, setHoverExpandedColumn] = useState<string | null>(null);

  const toggleColumn = (id: string) => {
    setExpandedColumns(prev => {
      if (prev.includes(id)) {
        // Prevent collapsing if it's the very last one open to avoid empty screen
        if (prev.length === 1) return prev; 
        return prev.filter(col => col !== id);
      }
      const newExpanded = [...prev, id];
      // Max 2 columns open at the same time
      if (newExpanded.length > 2) {
        return newExpanded.slice(newExpanded.length - 2);
      }
      return newExpanded;
    });
  };

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

  const onDragStart = () => {
    setHoverExpandedColumn(null);
  };

  const onDragUpdate = (update: DragUpdate) => {
    if (update.destination) {
      setHoverExpandedColumn(update.destination.droppableId);
    } else {
      setHoverExpandedColumn(null);
    }
  };

  const onDragEnd = (result: DropResult) => {
    setHoverExpandedColumn(null);

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

    // PROTECTION: UI Check to prevent jumping to 'closed_won' without 'ready_to_close'
    if (lead && newStatus === 'closed_won' && lead.status !== 'ready_to_close') {
        showError('Proceso incompleto', 'Un lead debe pasar por la fase de Cierre antes de ser marcado como Ganado.');
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

        <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
          {/* Top row: Search and Actions */}
          <div className="flex flex-wrap items-center gap-3 w-full justify-end">
            <div className="relative flex-1 sm:flex-none sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={14} />
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border-none bg-surface-container-high rounded-xl text-xs focus:ring-2 focus:ring-primary-fixed hover:bg-surface-variant transition-all font-medium text-on-surface shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              {(hasRole('admin') || hasRole('jefe')) && (
                <button 
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-xl font-bold text-sm hover:shadow-md transition-all whitespace-nowrap"
                >
                  <DownloadCloud size={18} />
                  <span className="hidden lg:inline">Importar</span>
                </button>
              )}

              {hasRole('admin') && (
                <button 
                  onClick={() => setShowSweepModal(true)}
                  className="flex items-center gap-2 bg-surface-variant text-on-surface-variant px-4 py-2.5 rounded-xl font-bold text-sm hover:shadow-md hover:bg-surface-variant/80 transition-all whitespace-nowrap"
                >
                  <Settings2 size={18} />
                  <span className="hidden lg:inline">Ajustes & Barrido</span>
                </button>
              )}

              <button 
                onClick={() => setShowLeadForm(true)}
                className="flex items-center gap-2 bg-primary-container text-on-primary-container disabled:opacity-50 px-4 py-2.5 rounded-xl font-bold text-sm hover:shadow-md transition-all active:scale-95 whitespace-nowrap"
              >
                <Plus size={18} />
                <span className="hidden lg:inline">Nuevo Lead</span>
              </button>
            </div>
          </div>

          {/* Bottom row: Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full justify-end custom-scrollbar no-scrollbar">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-outline uppercase tracking-wider mr-2">
              <Filter size={12} />
              Filtrar por:
            </div>
            
            <select 
               className="flex-none py-1.5 px-3 border border-outline-variant/30 bg-white rounded-lg text-[10px] sm:text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary-fixed hover:bg-surface-variant transition-all outline-none shadow-sm cursor-pointer"
               value={sourceFilter}
               onChange={e => setSourceFilter(e.target.value)}
            >
               <option value="">Todos los Orígenes</option>
               {uniqueSources.map(s => (
                 <option key={s as string} value={s as string}>
                   {s === 'import' ? 'Importación' : s === 'enrollment_form' ? 'Autoregistro' : s}
                 </option>
               ))}
            </select>

            <select 
               className="flex-none py-1.5 px-3 border border-outline-variant/30 bg-white rounded-lg text-[10px] sm:text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary-fixed max-w-[150px] truncate hover:bg-surface-variant transition-all outline-none shadow-sm cursor-pointer"
               value={courseFilter}
               onChange={e => setCourseFilter(e.target.value)}
            >
               <option value="">Todos los Cursos</option>
               {uniqueCourses.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
            </select>

            {(hasRole('admin') || hasRole('jefe')) && (
              <select 
                 className="flex-none py-1.5 px-3 border border-outline-variant/30 bg-white rounded-lg text-[10px] sm:text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary-fixed max-w-[150px] truncate hover:bg-surface-variant transition-all outline-none shadow-sm cursor-pointer"
                 value={advisorFilter}
                 onChange={e => setAdvisorFilter(e.target.value)}
              >
                 <option value="">Todos los Asesores</option>
                 {uniqueAdvisors.map(adv => (
                   <option key={adv?.id} value={adv?.id?.toString()}>{adv?.name}</option>
                 ))}
              </select>
            )}

            {(searchTerm || sourceFilter || courseFilter || advisorFilter) && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setSourceFilter('');
                  setCourseFilter('');
                  setAdvisorFilter('');
                }}
                className="text-[10px] font-bold text-error hover:underline px-2 transition-all whitespace-nowrap"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 bg-surface-container-lowest p-6 min-h-0 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex gap-2">
               <div className="w-3 h-3 rounded-full bg-primary-container animate-bounce [animation-delay:-0.3s]"></div>
               <div className="w-3 h-3 rounded-full bg-primary-container animate-bounce [animation-delay:-0.15s]"></div>
               <div className="w-3 h-3 rounded-full bg-primary-container animate-bounce"></div>
            </div>
          </div>
        )}

        <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate} onDragStart={onDragStart}>
          <div className="flex h-full gap-3 pb-4 w-full">
            {COLUMNS.map((column) => {
              const columnLeads = filteredLeads.filter(l => l.status === column.id);
              const isExpanded = expandedColumns.includes(column.id) || hoverExpandedColumn === column.id;

              return (
                <div 
                  key={column.id} 
                  className={clsx(
                    "relative flex flex-col max-h-full rounded-2xl bg-surface-container-lowest border shadow-sm overflow-hidden flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group",
                    isExpanded 
                      ? 'flex-1 min-w-[280px] max-w-[380px] border-outline-variant/20' 
                      : 'w-14 cursor-pointer hover:bg-surface-container-low hover:border-primary/40 border-outline-variant/30'
                  )}
                >
                  
                  {/* Collapsed Overlay */}
                  {!isExpanded && (
                    <div 
                       onClick={() => toggleColumn(column.id)}
                       className="absolute inset-0 z-10 flex flex-col items-center py-5 space-y-6 bg-surface-container-lowest group-hover:bg-surface-container-low transition-colors"
                    >
                        <div className="flex items-center justify-center p-1.5 rounded-full ring-1 ring-outline-variant/30 bg-white group-hover:ring-primary/40 group-hover:shadow-sm transition-all">
                            <span className={clsx("w-3 h-3 rounded-full", column.dot)}></span>
                        </div>
                        <span className="bg-surface-container-high px-2 py-0.5 rounded text-[10px] font-bold text-on-surface-variant flex-shrink-0 border border-outline-variant/20 shadow-sm">
                            {columnLeads.length}
                        </span>
                        <div className="flex-1 flex justify-center mt-4">
                            <h3 className={clsx(
                                "font-headline font-bold text-[13px] uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 select-none whitespace-nowrap", 
                                column.headerColor,
                                "group-hover:text-primary transition-colors opacity-80 group-hover:opacity-100"
                            )}>
                                {column.title}
                            </h3>
                        </div>
                    </div>
                  )}

                  {/* Expanded Content View (Remains mounted but clipped/hidden when collapsed by absolute overlay) */}
                  <div className={clsx("flex flex-col h-full w-full min-w-[280px]", !isExpanded && "opacity-0 invisible")}>
                    {/* Column Header */}
                    <div 
                        className={clsx("p-4 border-b border-outline-variant/10 flex items-center justify-between select-none cursor-pointer hover:bg-black/5 transition-colors", column.color)}
                        onClick={() => toggleColumn(column.id)}
                        title="Haz clic para colapsar"
                    >
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
                              "min-h-[150px] transition-colors rounded-xl h-full pb-20",
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
                                      "bg-white p-4 rounded-xl border border-outline-variant/20 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing mb-3 group relative overflow-hidden",
                                      snapshot.isDragging ? 'shadow-2xl ring-2 ring-primary-fixed rotate-3 scale-105 z-50' : ''
                                    )}
                                    style={provided.draggableProps.style}
                                  >
                                    {/* Subtle left border line matching the status color */}
                                    <div className={clsx("absolute left-0 top-0 bottom-0 w-1", column.dot || "bg-outline-variant/20" )}></div>
                                    
                                    {/* Source Badge */}
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                                        {lead.source === 'enrollment_form' ? (
                                          <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Autoregistro</span>
                                        ) : (
                                          <span className="text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1">👤 Manual</span>
                                        )}
                                      </span>
                                      <span className="text-[10px] bg-surface-container-high text-on-surface-variant px-1.5 rounded font-mono font-bold tracking-tight">
                                        {lead.student_id ? lead.student_id.slice(-6) : 'N/A'}
                                      </span>
                                    </div>

                                    <h4 className="font-bold text-on-surface leading-tight mb-2 group-hover:text-primary transition-colors">
                                      {lead.name}
                                    </h4>

                                    <div className="text-xs text-on-surface-variant space-y-1.5 mb-3">
                                      <div className="flex items-center gap-1.5 text-on-surface">
                                        <Phone size={12} className="text-outline" /> <span className="font-medium">{lead.phone}</span>
                                      </div>
                                      {lead.course?.name && (
                                        <div className="flex items-center gap-1.5 line-clamp-1 bg-surface-container-lowest px-1.5 py-1 rounded-md border border-outline-variant/20">
                                          <Tag size={12} className="text-outline shrink-0" /> <span className="truncate font-medium text-[11px]">{lead.course.name}</span>
                                        </div>
                                      )}
                                      {(hasRole('admin') || hasRole('jefe')) && lead.advisor?.name && (
                                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-dashed border-outline-variant/20 text-primary-compressed font-bold/80">
                                          <User size={12} className="shrink-0 text-primary/50" /> <span className="truncate whitespace-nowrap text-[10px] tracking-tight">Vendedor: {lead.advisor.name}</span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="pt-3 flex items-center justify-between text-[10px] font-bold text-outline uppercase tracking-wider">
                                       <div className="flex items-center gap-1.5 opacity-60">
                                          <Clock size={12} />
                                          {new Date(lead.created_at).toLocaleDateString()}
                                       </div>
                                       <div className="opacity-0 group-hover:opacity-100 transition-opacity text-primary translate-x-1 group-hover:translate-x-0 transform duration-300">
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

      {/* Sweep Manager Modal */}
      {showSweepModal && (
        <LeadSweepManagerModal
          onClose={() => setShowSweepModal(false)}
          onSwept={() => setShowSweepModal(false)}
        />
      )}
    </div>
  );
}
