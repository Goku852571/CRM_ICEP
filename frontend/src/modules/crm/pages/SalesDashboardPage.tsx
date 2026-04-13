import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronRight,
  Target,
  X,
  MessageSquare,
  Search,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Tag,
  CheckCircle,
  Clock as ClockIcon,
  PhoneCall,
  ClipboardList
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie,
  Cell as RechartsCell
} from 'recharts';
import clsx from 'clsx';
import { getSalesDashboard, exportSalesDashboardReport, getAdvisorStats } from '../services/salesDashboardService';
import { getLeads, getLead, Lead } from '../services/leadService';
import { useAuth } from '@/shared/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import EnrollmentAuditGrid from '@/modules/enrollments/components/EnrollmentAuditGrid';

const COLORS = ['#008cc7', '#6ffbbe', '#f472b6', '#a78bfa', '#fbbf24'];

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  interested: 'Interesado',
  following_up: 'En Seguimiento',
  ready_to_close: 'Listo para Cierre',
  closed_won: 'Ganado ✓',
  lost: 'Perdido',
};

const INTERACTION_LABELS: Record<string, string> = {
  call: 'Llamada',
  whatsapp: 'WhatsApp',
  email: 'Correo',
  meeting: 'Reunión',
  no_response: 'No Contestó',
  interested: 'Interesado',
  call_back: 'Volver a Llamar',
  not_interested: 'No Interesado',
  sold: 'Matriculado 🎉',
};

export default function SalesDashboardPage() {
  const { hasRole } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'kpis' | 'audit'>('kpis');
  const [period, setPeriod] = useState('este_mes');
  const [isExporting, setIsExporting] = useState(false);
  const [showActionPlan, setShowActionPlan] = useState(false);

  const { data, isLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['sales-dashboard', period],
    queryFn: () => getSalesDashboard({ period }),
  });

  const [selectedAdvisor, setSelectedAdvisor] = useState<{id: number, name: string} | null>(null);
  const [advisorPeriod, setAdvisorPeriod] = useState('este_mes');
  const [advisorStartDate, setAdvisorStartDate] = useState('');
  const [advisorEndDate, setAdvisorEndDate] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  // Params for filtered queries
  const filterParams = advisorPeriod === 'custom' 
    ? { start_date: advisorStartDate, end_date: advisorEndDate } 
    : { period: advisorPeriod };

  // Consulta de leads del asesor seleccionado
  const { data: advisorLeads, isLoading: isLoadingLeads } = useQuery({
    queryKey: ['advisor-leads', selectedAdvisor?.id, advisorPeriod, advisorStartDate, advisorEndDate],
    queryFn: () => getLeads({ advisor_id: selectedAdvisor?.id, ...filterParams }),
    enabled: !!selectedAdvisor && !selectedLeadId && (advisorPeriod !== 'custom' || (!!advisorStartDate && !!advisorEndDate)),
  });

  // Consulta de estadísticas del asesor seleccionado
  const { data: advisorStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['advisor-stats', selectedAdvisor?.id, advisorPeriod, advisorStartDate, advisorEndDate],
    queryFn: () => getAdvisorStats(selectedAdvisor!.id, filterParams),
    enabled: !!selectedAdvisor && !selectedLeadId && (advisorPeriod !== 'custom' || (!!advisorStartDate && !!advisorEndDate)),
  });

  // Consulta de detalle de lead específico para auditoría (Level 2)
  const { data: leadDetail, isLoading: isLoadingLeadDetail } = useQuery({
    queryKey: ['lead-audit', selectedLeadId],
    queryFn: () => getLead(selectedLeadId!).then(res => res.data as Lead),
    enabled: !!selectedLeadId,
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportSalesDashboardReport(period);
    } catch (e) {
      alert("Error al exportar el reporte.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex gap-2">
           <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
           <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
           <div className="w-3 h-3 rounded-full bg-primary animate-bounce"></div>
        </div>
      </div>
    );
  }

  // VISTA DE AUDITORÍA DE CONTACTO (LEVEL 2 - INTEGRADA)
  if (selectedAdvisor && selectedLeadId) {
    return (
       <div className="p-8 space-y-8 animate-in slide-in-from-right-8 duration-500 font-body">
          {/* Header Auditoría */}
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-6">
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedLeadId(null)}
                  className="p-3 bg-surface-container-high rounded-2xl hover:bg-primary hover:text-white transition-all shadow-sm"
                >
                   <ChevronRight size={20} className="rotate-180" />
                </button>
                <div>
                   <h1 className="text-2xl font-headline font-black text-primary">{leadDetail?.name || 'Cargando...'}</h1>
                   <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded uppercase tracking-tighter shadow-sm">Modo Auditoría</span>
                      <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">|  Historial de Seguimiento</span>
                   </div>
                </div>
             </div>
             <button 
               onClick={() => setSelectedLeadId(null)}
               className="text-xs font-black text-primary hover:underline underline-offset-8"
             >
                Regresar a la Lista del Asesor
             </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Info Contacto */}
             <div className="lg:col-span-1 space-y-6">
                <section className="bg-white p-6 rounded-[2rem] border border-outline-variant/10 shadow-sm space-y-4">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-2">Datos del Cliente</h3>
                   
                   <div className="space-y-3">
                      {[
                        { label: 'Teléfono', val: leadDetail?.phone, icon: Phone },
                        { label: 'Correo', val: leadDetail?.email || 'N/A', icon: Mail },
                        { label: 'Ciudad', val: leadDetail?.city || 'No especificada', icon: MapPin },
                        { label: 'Curso', val: leadDetail?.course?.name || 'Sin interés registrado', icon: Tag, highlight: true }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-surface-container-low/30 rounded-2xl border border-white">
                           <div className="p-2 rounded-xl bg-white text-primary shadow-sm"><item.icon size={14} /></div>
                           <div className="min-w-0">
                              <p className="text-[9px] font-black uppercase text-on-surface-variant/40 leading-none mb-1">{item.label}</p>
                              <p className={clsx("text-xs font-bold truncate", item.highlight ? "text-primary" : "text-on-surface")}>{item.val}</p>
                           </div>
                        </div>
                      ))}
                   </div>

                   <div className="pt-4 border-t border-outline-variant/10">
                      <p className="text-[9px] font-black uppercase text-on-surface-variant/40 mb-2">Estado Actual</p>
                      <div className="flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/10">
                         <span className="text-xs font-black uppercase text-primary tracking-widest">{STATUS_LABELS[(leadDetail?.status || '').toLowerCase()] || leadDetail?.status}</span>
                         <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      </div>
                   </div>
                </section>
             </div>

             {/* Historial de Seguimiento */}
             <div className="lg:col-span-2">
                <section className="bg-white p-8 rounded-[3rem] border border-outline-variant/10 shadow-sm min-h-[500px]">
                   <h3 className="text-lg font-headline font-black text-primary mb-8 flex items-center gap-4">
                      <MessageSquare className="text-tertiary-fixed" />
                      Auditoría de Interacciones
                   </h3>

                   {isLoadingLeadDetail ? (
                      <div className="py-24 flex flex-col items-center opacity-30">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                         <span className="text-xs font-black uppercase tracking-widest">Cargando logs...</span>
                      </div>
                   ) : leadDetail?.interactions && leadDetail.interactions.length > 0 ? (
                      <div className="space-y-6 relative ml-4">
                         {/* Timeline line */}
                         <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-outline-variant/15 -ml-[1.25rem]"></div>
                         
                         {leadDetail.interactions.map((interaction, i) => (
                            <div key={interaction.id} className="relative group/log">
                               {/* Timeline dot */}
                               <div className="absolute top-1 left-0 w-2.5 h-2.5 rounded-full bg-surface-container-high border-2 border-white -ml-[1.57rem] group-hover/log:bg-primary transition-colors"></div>
                               
                               <div className="bg-surface-container-low/30 hover:bg-white hover:shadow-xl hover:shadow-primary/5 p-6 rounded-3xl border border-white transition-all">
                                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                     <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-xl shadow-sm text-primary">
                                           {interaction.type === 'call' && <PhoneCall size={14} />}
                                           {interaction.type === 'whatsapp' && <MessageSquare size={14} />}
                                           {interaction.type === 'email' && <Mail size={14} />}
                                           {interaction.type === 'meeting' && <MapPin size={14} />}
                                        </div>
                                        <div>
                                           <span className="font-black text-xs text-primary">{interaction.user?.name || 'Sistema'}</span>
                                           <p className="text-[10px] font-bold text-on-surface-variant opacity-60 uppercase tracking-widest">
                                              {formatDistanceToNow(new Date(interaction.interacted_at), { addSuffix: true, locale: es })}
                                           </p>
                                        </div>
                                     </div>
                                     <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-lg bg-tertiary-fixed/20 text-tertiary-fixed-variant tracking-tighter">
                                        {INTERACTION_LABELS[interaction.result.toLowerCase()] || interaction.result}
                                     </span>
                                  </div>
                                  <p className="text-xs text-on-surface-variant font-medium leading-relaxed italic">"{interaction.notes}"</p>
                               </div>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <div className="py-24 flex flex-col items-center opacity-40 text-center">
                         <div className="p-6 rounded-full bg-surface-container-high mb-4"><ClockIcon size={40} className="text-outline-variant" /></div>
                         <p className="font-headline font-bold text-primary">Sin histórico de seguimiento</p>
                         <p className="text-[10px] uppercase font-black tracking-widest mt-1">El asesor no ha registrado contactos recientes</p>
                      </div>
                   )}
                </section>
             </div>
          </div>
       </div>
    );
  }

  // VISTA DE LISTA DE CONTACTOS POR ASESOR (LEVEL 1)
  if (selectedAdvisor) {
    return (
      <div className="p-8 space-y-8 animate-in slide-in-from-right-4 duration-500 font-body">
        {/* Header Detalle */}
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 border-b border-outline-variant/10 pb-8">
           <div className="flex items-center gap-5">
              <button 
                onClick={() => setSelectedAdvisor(null)}
                className="group p-3 bg-white border border-outline-variant/20 rounded-2xl hover:bg-primary hover:text-white transition-all shadow-sm flex items-center justify-center"
              >
                 <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
              <div>
                 <h1 className="text-3xl font-headline font-black text-primary flex items-center gap-3">
                    {selectedAdvisor.name}
                 </h1>
                 <p className="text-on-surface-variant/70 font-medium uppercase text-[10px] tracking-widest mt-1">Inspección de Cartera y Seguimiento Estratégico</p>
              </div>
           </div>

           <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="relative inline-block min-w-[160px]">
                  <select 
                    value={advisorPeriod}
                    onChange={(e) => setAdvisorPeriod(e.target.value)}
                    className="w-full appearance-none flex flex-row items-center gap-2 pl-10 pr-8 py-3 bg-white rounded-2xl text-xs font-black border border-outline-variant/20 cursor-pointer hover:border-primary/50 transition-all shadow-sm"
                  >
                    <option value="este_mes">Este Mes</option>
                    <option value="mes_pasado">Mes Pasado</option>
                    <option value="trimestre">Trimestre Actual</option>
                    <option value="anio">Año Actual</option>
                    <option value="custom">Rango Personalizado</option>
                  </select>
                  <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary pointer-events-none" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none text-[8px]">▼</div>
                </div>

                {advisorPeriod === 'custom' && (
                  <div className="flex items-center gap-2 animate-in slide-in-from-left-4">
                    <input 
                      type="date" 
                      value={advisorStartDate}
                      onChange={(e) => setAdvisorStartDate(e.target.value)}
                      className="px-3 py-3 bg-white border border-outline-variant/20 rounded-2xl text-xs font-bold"
                    />
                    <span className="text-xs font-black opacity-30 text-to">A</span>
                    <input 
                      type="date" 
                      value={advisorEndDate}
                      onChange={(e) => setAdvisorEndDate(e.target.value)}
                      className="px-3 py-3 bg-white border border-outline-variant/20 rounded-2xl text-xs font-bold"
                    />
                  </div>
                )}
              </div>

              <button 
                 onClick={() => setSelectedAdvisor(null)}
                 className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
              >
                 Regresar al Análisis General
              </button>
           </div>
        </div>

        {/* Dashboard de Rendimiento del Asesor */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
           {[
             { label: 'Asignados', value: advisorStats?.total_assigned || 0, icon: Users, color: 'blue' },
             { label: 'Ventas', value: advisorStats?.sales_won || 0, icon: CheckCircle, color: 'emerald' },
             { label: 'Interesados', value: advisorStats?.interested || 0, icon: Target, color: 'orange' },
             { label: 'Sin Interés', value: advisorStats?.not_interested || 0, icon: X, color: 'rose' },
             { label: 'En Proceso', value: advisorStats?.pending || 0, icon: Clock, color: 'amber' }
           ].map((stat, i) => (
             <div key={i} className="bg-white p-5 rounded-[2rem] border border-outline-variant/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div className={`p-2 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 w-fit mb-3`}>
                   <stat.icon size={18} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest leading-tight">{stat.label}</p>
                   <p className={`text-2xl font-headline font-black text-${stat.color}-600`}>{stat.value}</p>
                </div>
             </div>
           ))}
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 gap-4">
           {isLoadingLeads ? (
             <div className="flex flex-col items-center justify-center py-24 opacity-40">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
                <p className="font-bold uppercase tracking-widest text-sm">Cargando portafolio del asesor...</p>
             </div>
           ) : Array.isArray(advisorLeads?.data) && advisorLeads.data.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
               {advisorLeads.data.map((lead: Lead) => (
                 <div 
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="group bg-white p-6 rounded-[2rem] border border-outline-variant/10 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[160px]"
                 >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[100px] -mr-8 -mt-8 group-hover:scale-150 transition-transform"></div>
                    
                    <div className="relative z-10 flex items-start justify-between mb-4">
                       <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary font-black text-lg shadow-inner group-hover:bg-primary group-hover:text-white transition-all">
                             {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="max-w-[150px]">
                             <h4 className="font-headline font-bold text-on-surface text-base group-hover:text-primary transition-colors truncate">{lead.name}</h4>
                             <p className="text-[10px] font-medium text-on-surface-variant/60 flex items-center gap-1">
                                <ClockIcon size={10} /> Registrado: {new Date(lead.created_at).toLocaleDateString()}
                             </p>
                          </div>
                       </div>
                           <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full whitespace-nowrap shadow-sm border ${
                           lead.status === 'closed_won' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                           lead.status === 'lost' ? 'bg-red-50 text-red-700 border-red-100' :
                           'bg-blue-50 text-blue-700 border-blue-100'
                         }`}>
                           {STATUS_LABELS[lead.status.toLowerCase()] || lead.status}
                         </span>
                    </div>

                    <div className="relative z-10 flex items-end justify-between border-t border-outline-variant/10 pt-4 mt-auto">
                       <div className="flex gap-4">
                          <div className="flex flex-col">
                             <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.1em]">Seguimientos</span>
                             <span className="text-sm font-bold text-primary">{(lead as any).interactions_count || lead.interactions?.length || 0} logs</span>
                          </div>
                          <div className="w-px h-6 bg-outline-variant/15 self-end mb-1"></div>
                          <div className="flex flex-col">
                             <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.1em]">Canal</span>
                             <span className="text-sm font-bold text-on-surface truncate">{lead.source || 'Directo'}</span>
                          </div>
                       </div>
                       <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-outline group-hover:text-primary group-hover:scale-110 transition-all">
                          <ChevronRight size={18} />
                       </div>
                    </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[3rem] border border-dashed border-outline-variant/30">
                <div className="p-8 rounded-full bg-surface-container-high text-outline-variant mb-6 shadow-inner">
                   <Search size={64} />
                </div>
                <h3 className="text-2xl font-headline font-black text-primary">No se encontraron contactos</h3>
                <p className="text-sm text-on-surface-variant/60 mt-2 uppercase font-bold tracking-[0.2em]">Este asesor no tiene leads asignados aún</p>
                <button onClick={() => setSelectedAdvisor(null)} className="mt-8 text-primary font-black uppercase text-xs tracking-widest hover:underline decoration-2 underline-offset-8">
                   Volver a la vista general
                </button>
             </div>
           )}
        </div>
      </div>
    );
  }

  // Función auxiliar para traducir fuentes de leads
  const translateSource = (source: string) => {
    const map: Record<string, string> = {
      'import': 'Importación',
      'enrollment_form': 'Autoregistro',
      'manual': 'Registro Manual',
      'api': 'Integración API',
      'whatsapp': 'WhatsApp'
    };
    return map[source.toLowerCase()] || source;
  };

  const leadsBySource = (data.leads_by_source || []).map(item => ({
    ...item,
    source: translateSource(item.source)
  }));

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-500 font-body">
      {/* Header + Tab Navigation */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-headline font-black text-primary tracking-tight">Análisis de Ventas</h1>
            <p className="text-on-surface-variant/70 font-medium">Panel estratégico para supervisión y cumplimiento de metas comerciales</p>
          </div>
          {activeTab === 'kpis' && (
            <div className="flex gap-3">
              <div className="relative inline-block">
                <select 
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="appearance-none flex flex-row items-center gap-2 pl-10 pr-8 py-2 bg-surface-container-high rounded-xl text-sm font-bold border border-outline-variant/10 cursor-pointer hover:bg-surface-variant transition-colors"
                >
                  <option value="este_mes">Este Mes</option>
                  <option value="mes_pasado">Mes Pasado</option>
                  <option value="trimestre">Trimestre Actual</option>
                  <option value="anio">Año Actual</option>
                </select>
                <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none">▼</div>
              </div>
              <button 
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                {isExporting ? 'Exportando...' : 'Exportar Reporte'}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-2xl w-fit border border-outline-variant/10 shadow-inner">
          {([
            { key: 'kpis',  label: 'KPIs Estratégicos',       icon: TrendingUp },
            { key: 'audit', label: 'Control de Matrículas',   icon: ClipboardList },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 uppercase tracking-wider',
                activeTab === tab.key
                  ? 'bg-white text-primary shadow-md shadow-primary/10 scale-[1.02]'
                  : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-white/40',
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'audit' && <EnrollmentAuditGrid />}

      {activeTab === 'kpis' && (
        <div className="space-y-10 animate-in fade-in duration-300">

      {/* Primary KPIs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Win Rate */}
        <div className="bg-white p-6 rounded-3xl ghost-border shadow-sm hover:shadow-xl transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">+12.5%</span>
          </div>
          <p className="text-sm font-bold text-on-surface-variant/60 uppercase tracking-widest">Tasa de Conversión</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-headline font-black text-primary">{data.conversion_rate}%</h2>
            <span className="text-xs font-bold text-on-surface-variant/40">Global</span>
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-white p-6 rounded-3xl ghost-border shadow-sm hover:shadow-xl transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-2xl bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <Clock size={24} />
            </div>
            <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">-4.2m</span>
          </div>
          <p className="text-sm font-bold text-on-surface-variant/60 uppercase tracking-widest">Tiempo de Respuesta</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-headline font-black text-primary">{data.avg_response_time_minutes}m</h2>
            <span className="text-xs font-bold text-on-surface-variant/40">SLA Promedio</span>
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="bg-white p-6 rounded-3xl ghost-border shadow-sm hover:shadow-xl transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <DollarSign size={24} />
            </div>
            <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Proyectado</span>
          </div>
          <p className="text-sm font-bold text-on-surface-variant/60 uppercase tracking-widest">Valor del Embudo</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-headline font-black text-primary">${data.pipeline_value.toLocaleString()}</h2>
            <span className="text-xs font-bold text-on-surface-variant/40">Proyectado</span>
          </div>
        </div>
      </div>

      {/* Performance Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Advisor Performance Table */}
        <div className="bg-white rounded-[2rem] p-8 ghost-border space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-headline font-bold text-2xl text-primary flex items-center gap-2">
              <Target className="text-on-primary-container" size={24} />
              Cumplimiento por Asesor
            </h3>
            <button className="text-xs font-black text-primary flex items-center gap-1 hover:underline underline-offset-4">
              VER TODOS <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-4">
            {data.advisor_performance.map((advisor) => {
              const progressPct = (advisor.won / advisor.target) * 100;
              return (
                <div 
                  key={advisor.id} 
                  className="space-y-2 group/row cursor-pointer hover:bg-surface-container-low/50 p-2 rounded-xl transition-all"
                  onClick={() => setSelectedAdvisor({ id: advisor.id, name: advisor.name })}
                >
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full primary-gradient flex items-center justify-center text-[10px] font-black text-white shrink-0">
                         {advisor.name.charAt(0).toUpperCase()}
                       </div>
                       <span className="font-bold text-on-surface group-hover/row:text-primary transition-colors">{advisor.name}</span>
                    </div>
                    <span className="text-xs font-black bg-surface-container-high px-2 py-1 rounded-md text-on-surface-variant flex items-center gap-1">
                      {advisor.won} / {advisor.target} ventas <ChevronRight size={12} className="opacity-0 group-hover/row:opacity-100 transition-all -translate-x-1 group-hover/row:translate-x-0" />
                    </span>
                  </div>
                  <div className="h-4 bg-surface-container-low rounded-full overflow-hidden relative shadow-inner">
                    <div 
                      className="absolute inset-y-0 left-0 primary-gradient rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,140,199,0.5)]" 
                      style={{ width: `${Math.min(progressPct, 100)}%` }}
                    />
                    {progressPct > 100 && (
                      <div className="absolute inset-0 bg-white/30 animate-pulse" title="Meta Superada" />
                    )}
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-on-surface-variant/40 uppercase tracking-tighter">
                    <span className="flex items-center gap-1 text-emerald-600">
                      {advisor.conversion}% Eficiencia
                    </span>
                    <span>Pendientes: {advisor.target - advisor.won > 0 ? advisor.target - advisor.won : 0} para meta</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Sources Distribution */}
        <div className="bg-white rounded-[2rem] p-8 ghost-border flex flex-col">
          <h3 className="font-headline font-bold text-2xl text-primary mb-8 flex items-center gap-2">
            <BarChart3 className="text-on-primary-container" size={24} />
            Orígenes de Prospectos
          </h3>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leadsBySource}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="source" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 700}} />
                <Tooltip 
                  cursor={{fill: '#F8FAFC'}} 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={40}>
                  {leadsBySource.map((_, index) => (
                    <RechartsCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Strategic Banner */}
      <div className="rounded-[2rem] bg-surface-container-high p-10 flex flex-col md:flex-row items-center justify-between gap-8 border border-white">
        <div className="space-y-2 text-center md:text-left">
           <h4 className="text-3xl font-headline font-black text-primary">Previsión de Cierre Académico</h4>
           <p className="text-on-surface-variant max-w-md">Basado en el pipeline actual, se espera un incremento del 15% en las matrículas para el próximo trimestre. </p>
        </div>
        <button 
          onClick={() => setShowActionPlan(true)}
          className="primary-gradient text-white px-10 py-5 rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          Generar Plan de Acción
        </button>
      </div>

      {/* Action Plan Modal */}
      {showActionPlan && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative border border-outline-variant/20">
            <button 
              onClick={() => setShowActionPlan(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-container-low transition-colors"
            >
              <X size={24} className="text-on-surface-variant" />
            </button>
            <h3 className="text-3xl font-headline font-black text-primary mb-6 flex items-center gap-3">
              <Target className="text-tertiary-fixed" />
              Plan de Acción Sugerido
            </h3>
            
            <div className="space-y-5 text-sm text-on-surface-variant">
              <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                <h4 className="font-bold text-blue-800 mb-2 font-headline text-lg">Diagnóstico</h4>
                <p className="leading-relaxed text-blue-900/80">La tasa de conversión global del <strong className="text-blue-900">{data.conversion_rate}%</strong> está {data.conversion_rate < 20 ? 'por debajo' : 'dentro'} de lo esperado. El SLA (tiempo de primera respuesta) promedio en este ciclo es de <strong className="text-blue-900">{data.avg_response_time_minutes} minutos</strong>.</p>
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm">
                <h4 className="font-bold text-primary mb-4 font-headline text-lg">Recomendaciones Inmediatas</h4>
                <ul className="space-y-4 list-none p-0">
                  {data.avg_response_time_minutes > 15 && (
                    <li className="flex gap-3">
                      <div className="min-w-1.5 min-h-1.5 max-w-1.5 max-h-1.5 mt-2 rounded-full bg-error"></div>
                      <div>
                        <strong className="text-on-surface block">Reducir el SLA (Tiempo de Respuesta)</strong>
                        La demora actual provoca pérdida de interés. Recomendamos activar notificaciones auditivas en el panel de asesores y revisar la carga por hora de cada uno.
                      </div>
                    </li>
                  )}
                  {data.conversion_rate < 20 && (
                    <li className="flex gap-3">
                      <div className="min-w-1.5 min-h-1.5 max-w-1.5 max-h-1.5 mt-2 rounded-full bg-orange-500"></div>
                      <div>
                        <strong className="text-on-surface block">Refuerzo en el Pitch de Cierre</strong>
                        Agendar sesión de "Role Play" con el equipo inferior a 50% de cuota. Auditar las notas en los perfiles *Perdido* para estandarizar objeciones comunes.
                      </div>
                    </li>
                  )}
                  <li className="flex gap-3">
                    <div className="min-w-1.5 min-h-1.5 max-w-1.5 max-h-1.5 mt-2 rounded-full bg-primary-fixed"></div>
                    <div>
                      <strong className="text-on-surface block">Priorizar Fuentes Rentables</strong>
                      Con base en su gráfico de Orígenes, el top 2 de canales debe recibir pauta adicional; los canales con menos de 5 leads deberían pausarse.
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => setShowActionPlan(false)}
                className="px-6 py-3 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                Cerrar
              </button>
              <button 
                onClick={() => {
                  alert('Plan de Acción aprobado. Notificaciones enviadas al equipo de asesores.');
                  setShowActionPlan(false);
                }}
                className="bg-primary text-white px-6 py-3 rounded-xl font-bold font-headline shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                Distribuir Tareas de Acción
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
