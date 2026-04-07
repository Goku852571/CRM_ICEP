import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  X, Phone, Mail, MapPin, Tag, Clock, MessageSquare, 
  PhoneCall, Send, Link2, Copy, CheckCircle, Loader2, User
} from 'lucide-react';
import { getLead, addLeadInteraction, Lead } from '../services/leadService';
import { createEnrollment } from '@/modules/enrollments/services/enrollmentService';
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

export default function LeadDetailDrawer({ leadId, onClose, onUpdated }: Props) {
  const { user, hasRole } = useAuth();
  const [interactType, setInteractType] = useState<'call' | 'whatsapp' | 'email' | 'meeting'>('call');
  const [interactResult, setInteractResult] = useState('no_response');
  const [interactNotes, setInteractNotes] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => { setIsOpen(true); }, []);

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
    mutationFn: () => createEnrollment({ lead_id: leadId }),
    onSuccess: (res) => {
      setGeneratedLink(res.data.form_url);
      showSuccess('Link generado', 'El enlace de matrícula está listo para enviar.');
      refetch();
      onUpdated();
    },
  });

  if (!lead || isLoading) return null;

  const isReadyToClose = lead?.status === 'ready_to_close';
  const isWon = lead?.status === 'closed_won';
  const isReadOnly = hasRole('admin') || hasRole('jefe');

  const submitInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    interactionMutation.mutate({
      type: interactType,
      result: interactResult,
      notes: interactNotes,
    });
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <>
      <div 
        className={clsx(
          "fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 z-[90]",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={() => { setIsOpen(false); setTimeout(onClose, 300); }}
      />
      
      <div 
        className={clsx(
          "fixed top-0 right-0 h-full w-full max-w-lg bg-surface shadow-2xl transition-transform duration-300 ease-out z-[100] flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex-none p-5 border-b border-outline-variant/15 flex items-start justify-between bg-surface/50">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                {lead.student_id ? (
                <span className="text-[10px] bg-primary font-mono text-on-primary px-2 py-0.5 rounded shadow-sm tracking-widest font-bold">
                  {lead.student_id}
                </span>
              ) : (
                <span className="text-[10px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded font-mono font-bold">
                  {lead.uuid.split('-')[0].toUpperCase()}
                </span>
              )}
              <span className={clsx('text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider', statusColors[lead.status] || 'bg-gray-100 text-gray-700')}>
                {STATUS_LABELS[lead.status.toLowerCase()] || lead.status}
              </span>
              {isReadOnly && (
                <span className="text-[9px] font-black bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse shadow-sm">
                  Modo Auditoría
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-headline font-extrabold text-primary truncate">{lead.name}</h2>
            {lead.advisor?.name && (
              <div className="flex items-center gap-1.5 mt-1 text-on-surface-variant/70 italic text-xs">
                <User size={12} /> Asesor: {lead.advisor.name}
              </div>
            )}
          </div>
          <button 
            onClick={() => { setIsOpen(false); setTimeout(onClose, 300); }}
            className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
          >
            <X size={20} className="text-on-surface-variant" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-surface-container-lowest">

          {/* 🔥 BANNER CIERRE - Generar Link de Matrícula (Solo para asesores o no-read-only si se desea, pero aqui restringimos x rol) */}
          {isReadyToClose && !isReadOnly && (
            <section className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-100 rounded-xl">
                  <Link2 className="text-orange-600" size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-headline font-bold text-orange-900 line-height-tight">Listo para Matrícula</h4>
                  <p className="text-xs text-orange-800/80 mb-3">Este contacto ha llegado a la fase final. Genera el enlace para que complete su formulario.</p>
                  
                  {!generatedLink ? (
                    <button 
                      onClick={() => enrollmentMutation.mutate()}
                      disabled={enrollmentMutation.isPending}
                      className="bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors shadow-md disabled:opacity-50"
                    >
                      {enrollmentMutation.isPending ? 'Generando...' : 'Generar Link de Matrícula'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                       <button 
                          onClick={copyToClipboard}
                          className={clsx(
                            "flex-1 flex justify-between items-center px-3 py-2 rounded-xl text-xs font-bold transition-all",
                            copiedLink ? "bg-emerald-600 text-white" : "bg-white border border-orange-200 text-orange-700"
                          )}
                       >
                          {copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}
                          {copiedLink ? <CheckCircle size={14} /> : <Copy size={14} />}
                       </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {isWon && (
            <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
               <div className="p-2 bg-emerald-100 rounded-xl">
                  <CheckCircle className="text-emerald-600" size={20} />
               </div>
               <div>
                  <h4 className="font-headline font-bold text-emerald-900">¡Venta Ganada!</h4>
                  <p className="text-xs text-emerald-800/80">Este contacto ya está matriculado formalmente.</p>
               </div>
            </section>
          )}

          {/* Datos del Cliente */}
          <section className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-3 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 flex items-center gap-1"><Phone size={11} /> Teléfono</span>
              <p className="font-bold text-sm text-on-surface">{lead.phone}</p>
            </div>
            <div className="bg-surface-container-low p-3 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 flex items-center gap-1"><Mail size={11} /> Email</span>
              <p className="font-semibold text-sm text-on-surface truncate" title={lead.email || ''}>{lead.email || 'No registrado'}</p>
            </div>
            <div className="bg-surface-container-low p-3 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 flex items-center gap-1"><MapPin size={11} /> Ciudad</span>
              <p className="font-semibold text-sm text-on-surface">{lead.city || 'N/A'}</p>
            </div>
            <div className="bg-surface-container-low p-3 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 flex items-center gap-1"><Tag size={11} /> Curso</span>
              <p className="font-bold text-sm text-primary truncate">{lead.course?.name || 'Sin asignar'}</p>
            </div>
          </section>

          <div className="h-px bg-outline-variant/15 w-full" />

          {/* Registrar Seguimiento - OCULTO PARA ADMIN/JEFE */}
          {!isReadOnly && (
            <section className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-tertiary-fixed" />
            <h3 className="text-sm font-headline font-extrabold text-primary mb-3 flex items-center gap-2 ml-2">
              <MessageSquare size={15} className="text-tertiary-fixed-variant" />
              Registrar Seguimiento
            </h3>
            <form onSubmit={submitInteraction} className="space-y-3 ml-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Medio</label>
                  <select
                    value={interactType} onChange={e => setInteractType(e.target.value as any)}
                    className="w-full text-xs font-medium bg-surface-container-lowest border-none rounded-xl p-2.5 focus:ring-2 focus:ring-tertiary-fixed"
                  >
                    <option value="call">📞 Llamada</option>
                    <option value="whatsapp">📱 WhatsApp</option>
                    <option value="email">📧 Correo</option>
                    <option value="meeting">🤝 Reunión</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Resultado</label>
                  <select
                    value={interactResult} onChange={e => setInteractResult(e.target.value)}
                    className="w-full text-xs font-medium bg-surface-container-lowest border-none rounded-xl p-2.5 focus:ring-2 focus:ring-tertiary-fixed"
                  >
                    <option value="no_response">{INTERACTION_LABELS.no_response}</option>
                    <option value="interested">{INTERACTION_LABELS.interested}</option>
                    <option value="call_back">{INTERACTION_LABELS.call_back}</option>
                    <option value="not_interested">{INTERACTION_LABELS.not_interested}</option>
                  </select>
                </div>
              </div>
              <textarea
                value={interactNotes} onChange={e => setInteractNotes(e.target.value)}
                placeholder="Detalles de la conversación, compromisos, observaciones..."
                className="w-full text-sm font-medium bg-surface-container-lowest border-none rounded-xl p-3 focus:ring-2 focus:ring-tertiary-fixed min-h-[75px] resize-none"
              />
              <div className="flex justify-end">
                <button 
                  type="submit"
                  disabled={interactionMutation.isPending || !interactNotes.trim()}
                  className="bg-tertiary-fixed text-on-tertiary-fixed px-5 py-2 rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {interactionMutation.isPending ? 'Guardando...' : 'Guardar'} <Send size={13} />
                </button>
              </div>
            </form>
          </section>
          )}

          {/* Historial */}
          <section>
            <h3 className="text-sm font-headline font-extrabold text-primary mb-3">Historial de Actividad</h3>
            {(!lead.interactions || lead.interactions.length === 0) ? (
              <p className="text-sm text-on-surface-variant italic bg-surface-container-low p-4 rounded-xl text-center">
                No hay seguimientos registrados aún.
              </p>
            ) : (
              <div className="space-y-3">
                {lead.interactions.map((interaction) => (
                  <div key={interaction.id} className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10 flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                      {interaction.type === 'call' && <PhoneCall size={14} />}
                      {interaction.type === 'whatsapp' && <MessageSquare size={14} />}
                      {interaction.type === 'email' && <Mail size={14} />}
                      {interaction.type === 'meeting' && <MapPin size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                        <span className="font-bold text-xs text-primary">{interaction.user?.name || 'Sistema'}</span>
                        <span className="text-[10px] font-medium text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded">
                          {formatDistanceToNow(new Date(interaction.interacted_at), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-tertiary-fixed-variant bg-tertiary-fixed/20 px-1.5 rounded mb-1.5">
                        {INTERACTION_LABELS[interaction.result.toLowerCase()] || interaction.result}
                      </span>
                      {interaction.notes && (
                        <p className="text-xs text-on-surface-variant leading-relaxed">{interaction.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </>
  );
}
