import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  X, Phone, Mail, MapPin, Tag, Clock, MessageSquare, 
  PhoneCall, Send, Link2, Copy, CheckCircle, Loader2, User,
  Calendar, Briefcase, ChevronRight, Activity, Info, Edit
} from 'lucide-react';
import { getLead, addLeadInteraction, Lead } from '../services/leadService';
import { createEnrollment } from '@/modules/enrollments/services/enrollmentService';
import LeadFormModal from './LeadFormModal';
import { useAuth } from '@/shared/hooks/useAuth';
import clsx from 'clsx';
import { showSuccess, showError } from '@/shared/utils/alerts';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  leadId: number;
  onClose: () => void;
  onUpdated: () => void;
}

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

const statusColors: Record<string, string> = {
  new: 'text-blue-700 bg-blue-100',
  contacted: 'text-indigo-700 bg-indigo-100',
  interested: 'text-purple-700 bg-purple-100',
  following_up: 'text-amber-700 bg-amber-100',
  ready_to_close: 'text-orange-700 bg-orange-100',
  closed_won: 'text-emerald-700 bg-emerald-100',
  lost: 'text-red-700 bg-red-100',
};

export default function LeadDetailModal({ leadId, onClose, onUpdated }: Props) {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'activity' | 'info'>('activity');
  const [interactType, setInteractType] = useState<'call' | 'whatsapp' | 'email' | 'meeting'>('call');
  const [interactResult, setInteractResult] = useState('no_response');
  const [interactNotes, setInteractNotes] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    // Animation trigger
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const { data: lead, isLoading, refetch } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => getLead(leadId).then(res => res.data as Lead),
  });

  const interactionMutation = useMutation({
    mutationFn: (data: any) => addLeadInteraction(leadId, data),
    onSuccess: () => {
      setInteractNotes('');
      setInteractResult('no_response');
      refetch();
      onUpdated();
      showSuccess('Seguimiento guardado', 'La interacción se registró correctamente.');
    },
    onError: () => showError('Error', 'No se pudo guardar la interacción.'),
  });

  const enrollmentMutation = useMutation({
    mutationFn: () => {
      if (!lead) throw new Error('No lead data');
      
      // Validation before sending to prevent 422
      if (!lead.course_interest_id) {
        throw new Error('Debe asignar un curso de interés al lead antes de generar el link.');
      }
      if (!lead.advisor_id) {
        throw new Error('El lead no tiene un asesor asignado.');
      }

      return createEnrollment({ 
        lead_id: leadId,
        advisor_id: lead.advisor_id,
        course_id: lead.course_interest_id,
        student_name: lead.name,
        student_email: lead.email,
        student_phone: lead.phone
      });
    },
    onSuccess: (res) => {
      setGeneratedLink(res.data.form_url);
      showSuccess('Link generado', 'El enlace de matrícula está listo para enviar.');
      refetch();
      onUpdated();
    },
    onError: (error: any) => {
      console.error('Enrollment error:', error);
      const message = error.response?.data?.message || error.message || 'No se pudo generar el link de matrícula.';
      showError('Error de validación', message);
    }
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md">
        <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-primary font-bold animate-pulse">Cargando detalles...</p>
        </div>
      </div>
    );
  }

  if (!lead) return null;

  const isReadyToClose = lead.status === 'ready_to_close';
  const isWon = lead.status === 'closed_won';
  const isReadOnly = hasRole('admin') || hasRole('jefe');

  const submitInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    interactionMutation.mutate({
      type: interactType,
      result: interactResult,
      notes: interactNotes,
    });
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className={clsx(
      "fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 overflow-y-auto custom-scrollbar",
      isVisible ? "opacity-100" : "opacity-0"
    )}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />
      
      {/* Modal Container */}
      <div className={clsx(
        "relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden transition-all duration-300 transform h-[90vh] md:h-[85vh]",
        isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
      )}>
        
        {/* Close Button Mobile */}
        <button 
          onClick={handleClose}
          className="md:hidden absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur rounded-full shadow-lg"
        >
          <X size={20} className="text-slate-600" />
        </button>

        {/* LEFT COLUMN: Summary & Info */}
        <div className="md:w-80 flex-shrink-0 bg-slate-50/80 border-r border-slate-100 p-8 flex flex-col h-full overflow-y-auto custom-scrollbar">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest font-mono">
                {lead.student_id || lead.uuid.split('-')[0].toUpperCase()}
              </span>
              <span className={clsx(
                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                statusColors[lead.status] || 'bg-slate-100 text-slate-600'
              )}>
                {STATUS_LABELS[lead.status.toLowerCase()] || lead.status}
              </span>
            </div>
            
            <h2 className="text-2xl font-headline font-bold text-slate-900 leading-tight mb-2">
              {lead.name}
            </h2>
            
            {lead.advisor?.name && (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                  {lead.advisor.name.charAt(0)}
                </div>
                <span>{lead.advisor.name}</span>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Contacto</h4>
              <div className="space-y-3">
                <a href={`tel:${lead.phone}`} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 hover:border-primary/30 hover:shadow-sm transition-all group">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <Phone size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Teléfono</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{lead.phone}</p>
                  </div>
                </a>
                
                <a href={`mailto:${lead.email}`} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 hover:border-primary/30 hover:shadow-sm transition-all group">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <Mail size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Email</p>
                    <p className="text-sm font-bold text-slate-700 truncate" title={lead.email || ''}>{lead.email || 'No registrado'}</p>
                  </div>
                </a>

                {lead.city && (
                  <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                      <MapPin size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Ciudad</p>
                      <p className="text-sm font-bold text-slate-700 truncate">{lead.city}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Interés comercial</h4>
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <div className="flex items-center gap-2 mb-1">
                  <Tag size={12} className="text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase">Programa</span>
                </div>
                <p className="font-bold text-slate-800 leading-snug">{lead.course?.name || 'Sin asignar'}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase">
                <Calendar size={12} />
                <span>Registrado el {new Date(lead.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Tabs & Main Content */}
        <div className="flex-1 flex flex-col h-full bg-white relative">
          {/* Header Action / Close */}
          <div className="hidden md:flex absolute top-6 right-8 z-10 items-center gap-2">
            {!isReadOnly && !isWon && (
              <button 
                onClick={() => setShowEditModal(true)}
                className="p-2.5 bg-white text-primary hover:bg-primary hover:text-white rounded-2xl transition-all shadow-sm active:scale-95 border border-primary/20 flex items-center gap-2 px-4 font-bold text-xs"
              >
                <Edit size={16} />
                Editar Lead
              </button>
            )}
            <button 
              onClick={handleClose}
              className="p-2.5 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-2xl transition-all shadow-sm active:scale-95"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex-none px-8 pt-8 flex items-center gap-8 border-b border-slate-100">
            <button 
              onClick={() => setActiveTab('activity')}
              className={clsx(
                "pb-4 text-sm font-bold transition-all relative",
                activeTab === 'activity' ? "text-primary" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Actividad y Seguimiento
              {activeTab === 'activity' && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full shadow-[0_-4px_10px_rgba(var(--primary-rgb),0.3)]" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab('info')}
              className={clsx(
                "pb-4 text-sm font-bold transition-all relative",
                activeTab === 'info' ? "text-primary" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Información Adicional
              {activeTab === 'info' && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full shadow-[0_-4px_10px_rgba(var(--primary-rgb),0.3)]" />
              )}
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            
            {activeTab === 'activity' ? (
              <div className="max-w-3xl mx-auto space-y-8">
                
                {/* Sale / Enrollment Alert */}
                {(isReadyToClose || lead.enrollment) && !isReadOnly && (
                  <section className={clsx(
                    "rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border overflow-hidden relative group",
                    lead.enrollment ? "bg-emerald-50/50 border-emerald-100" : "bg-gradient-to-br from-amber-50 to-orange-50/50 border-orange-100"
                  )}>
                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-white/40 blur-3xl rounded-full" />
                    
                    <div className="flex md:items-center gap-6 relative">
                      <div className={clsx(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
                        lead.enrollment ? "bg-emerald-500 text-white" : "bg-orange-500 text-white"
                      )}>
                        {lead.enrollment ? <CheckCircle size={28} /> : <Link2 size={28} />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className={clsx(
                          "text-lg font-headline font-bold mb-1",
                          lead.enrollment ? "text-emerald-900" : "text-orange-900"
                        )}>
                          {lead.enrollment ? 'Matrícula en curso' : '¡Casi lo tenemos! Listo para Matrícula'}
                        </h4>
                        <p className={clsx(
                          "text-sm mb-4 leading-relaxed",
                          lead.enrollment ? "text-emerald-700/80" : "text-orange-700/80"
                        )}>
                          {lead.enrollment 
                            ? 'El enlace de matrícula personalizada está activo y pendiente de que el estudiante complete el formulario.' 
                            : 'El prospecto está listo para cerrar la venta. Genera un enlace único para que realice su inscripción.'}
                        </p>
                        
                        {!generatedLink && !lead.enrollment ? (
                          <button 
                            onClick={() => enrollmentMutation.mutate()}
                            disabled={enrollmentMutation.isPending}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-lg hover:shadow-orange-200 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                          >
                            {enrollmentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={16} />}
                            Generar Link de Matrícula
                          </button>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className={clsx(
                              "flex-1 p-3 rounded-2xl font-mono text-xs break-all bg-white border border-opacity-50",
                              lead.enrollment ? "border-emerald-200 text-emerald-800" : "border-orange-200 text-orange-800"
                            )}>
                              {generatedLink || `${window.location.origin}/enrollment/${lead.enrollment?.uuid}`}
                            </div>
                            <button 
                              onClick={() => copyToClipboard(generatedLink || `${window.location.origin}/enrollment/${lead.enrollment?.uuid}`)}
                              className={clsx(
                                "flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-md active:scale-95 shrink-0",
                                copiedLink 
                                  ? "bg-emerald-600 text-white" 
                                  : (lead.enrollment ? "bg-emerald-600 text-white" : "bg-orange-600 text-white")
                              )}
                            >
                              {copiedLink ? '¡Copiado!' : 'Copiar Link'}
                              {copiedLink ? <CheckCircle size={16} /> : <Copy size={16} />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {/* Form to add interaction */}
                {!isReadOnly && !isWon && (
                  <section className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                        <MessageSquare size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 font-headline">Registrar nueva interacción</h3>
                        <p className="text-[11px] text-slate-500 font-medium font-body">Registra llamadas, whatsapps o acuerdos</p>
                      </div>
                    </div>

                    <form onSubmit={submitInteraction} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Canal</label>
                          <div className="relative">
                            <select
                              value={interactType} onChange={e => setInteractType(e.target.value as any)}
                              className="w-full text-xs font-bold bg-white border-none rounded-2xl p-3.5 focus:ring-2 focus:ring-primary shadow-sm appearance-none outline-none"
                            >
                              <option value="call">📞 Llamada Telefónica</option>
                              <option value="whatsapp">📱 WhatsApp</option>
                              <option value="email">📧 Correo Electrónico</option>
                              <option value="meeting">🤝 Reunión Presencial</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronRight size={14} className="rotate-90" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Estado de la gestión</label>
                          <div className="relative">
                            <select
                              value={interactResult} onChange={e => setInteractResult(e.target.value)}
                              className="w-full text-xs font-bold bg-white border-none rounded-2xl p-3.5 focus:ring-2 focus:ring-primary shadow-sm appearance-none outline-none"
                            >
                              <option value="no_response">{INTERACTION_LABELS.no_response}</option>
                              <option value="interested">{INTERACTION_LABELS.interested}</option>
                              <option value="call_back">{INTERACTION_LABELS.call_back}</option>
                              <option value="not_interested">{INTERACTION_LABELS.not_interested}</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronRight size={14} className="rotate-90" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Notas de la gestión</label>
                        <textarea
                          value={interactNotes} onChange={e => setInteractNotes(e.target.value)}
                          placeholder="Escribe aquí los detalles de lo conversado o compromisos adquiridos..."
                          className="w-full text-sm font-medium bg-white border-none rounded-3xl p-4 focus:ring-2 focus:ring-primary shadow-sm min-h-[100px] resize-none placeholder:text-slate-300"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button 
                          type="submit"
                          disabled={interactionMutation.isPending || !interactNotes.trim()}
                          className="bg-primary text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                        >
                          {interactionMutation.isPending ? 'Guardando...' : 'Guardar Seguimiento'} 
                          <Send size={14} />
                        </button>
                      </div>
                    </form>
                  </section>
                )}

                {/* Timeline / History */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                       <Activity size={18} className="text-primary" />
                       Historial de Actividad
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full">
                      {lead.interactions?.length || 0} Eventos
                    </span>
                  </div>

                  {(!lead.interactions || lead.interactions.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-200 mb-4">
                        <MessageSquare size={32} />
                      </div>
                      <p className="text-sm text-slate-400 font-bold">Sin actividad registrada aún</p>
                      <p className="text-xs text-slate-300 mt-1">Empieza registrando una llamada o contacto inicial.</p>
                    </div>
                  ) : (
                    <div className="relative space-y-6 before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                      {lead.interactions.map((interaction) => (
                        <div key={interaction.id} className="relative flex gap-6 items-start group">
                          {/* Dot/Icon on Timeline */}
                          <div className={clsx(
                            "w-12 h-12 rounded-2xl flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-110 shrink-0",
                            interaction.type === 'call' ? "bg-blue-500 text-white" :
                            interaction.type === 'whatsapp' ? "bg-emerald-500 text-white" :
                            interaction.type === 'email' ? "bg-purple-500 text-white" : "bg-slate-500 text-white"
                          )}>
                            {interaction.type === 'call' && <PhoneCall size={18} />}
                            {interaction.type === 'whatsapp' && <MessageSquare size={18} />}
                            {interaction.type === 'email' && <Mail size={18} />}
                            {interaction.type === 'meeting' && <MapPin size={18} />}
                          </div>

                          <div className="flex-1 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm group-hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                              <div>
                                <span className="font-black text-xs text-slate-900 mr-2">{interaction.user?.name || 'Sistema'}</span>
                                <span className={clsx(
                                  "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg",
                                  interaction.result === 'interested' ? "bg-emerald-50 text-emerald-600" :
                                  interaction.result === 'no_response' ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-600"
                                )}>
                                  {INTERACTION_LABELS[interaction.result.toLowerCase()] || interaction.result}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                <Clock size={10} />
                                {formatDistanceToNow(new Date(interaction.interacted_at), { addSuffix: true, locale: es })}
                              </span>
                            </div>
                            {interaction.notes && (
                              <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50/50 p-4 rounded-2xl border border-slate-50 italic">
                                "{interaction.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Detalles del Sistema</h3>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Identificador Único</p>
                         <p className="font-mono text-xs font-bold text-primary">{lead.uuid}</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Origen del Lead</p>
                            <p className="font-bold text-slate-700 capitalize">{lead.source === 'enrollment_form' ? 'Formulario Web' : lead.source}</p>
                         </div>
                         <div className="px-3 py-1 bg-white rounded-xl shadow-sm">
                            {lead.source === 'enrollment_form' ? <Activity size={16} className="text-primary" /> : <User size={16} className="text-slate-400" />}
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Información de Seguimiento</h3>
                    
                    <div className="space-y-4">
                       <div className="p-4 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Última Actualización</p>
                          <p className="font-bold text-slate-700">{new Date(lead.updated_at).toLocaleString()}</p>
                       </div>

                       <div className="border border-slate-100 p-6 rounded-[2rem] flex flex-col items-center text-center">
                          <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
                             <Info size={32} />
                          </div>
                          <p className="text-sm font-bold text-slate-800 mb-1">¿Necesitas ayuda con este lead?</p>
                          <p className="text-xs text-slate-400 mb-4">Contacta con soporte si este registro presenta duplicidad o datos erróneos.</p>
                          <button className="text-[11px] font-black uppercase tracking-widest text-primary hover:text-primary-dark transition-colors">
                            Reportar Incidencia
                          </button>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer mobile actions */}
          <div className="md:hidden p-4 border-t border-slate-100 flex gap-3">
             <button 
               onClick={handleClose}
               className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm"
             >
               Cerrar
             </button>
          </div>
        </div>
      </div>

      {showEditModal && (
        <LeadFormModal
          lead={lead}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            refetch();
            onUpdated();
          }}
        />
      )}
    </div>
  );
}
