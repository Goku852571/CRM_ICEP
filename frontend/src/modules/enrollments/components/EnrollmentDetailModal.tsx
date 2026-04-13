import { useState, useEffect, useCallback, useRef } from 'react';
import { getEnrollment, updateEnrollmentStatus, confirmPayment, EnrollmentForm } from '../services/enrollmentService';
import { X, Clock, User, Link as LinkIcon, AlertCircle, MapPin, CreditCard, Mail, Phone, Calendar, ShieldCheck, CheckCircle2, Zap, Copy, ExternalLink, Upload, Image, ThumbsUp, ThumbsDown, Eye } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { showSuccess, showError } from '@/shared/utils/alerts';
import PaymentVoucherModal from './PaymentVoucherModal';

interface Props {
  enrollmentId: number;
  onClose: () => void;
  onUpdate: () => void;
}

const StatusMap: Record<string, { label: string; color: string }> = {
  pending_send: { label: 'Por Enviar Link', color: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Esperando al Cliente', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Formulario Llenado', color: 'bg-orange-100 text-orange-800 animate-pulse' },
  payment_pending: { label: 'Verificando Pago ⏳', color: 'bg-[#7a142c]/10 text-[#7a142c] font-black' },
  payment_confirmed: { label: 'Pago Confirmado ✓', color: 'bg-[#20325e]/10 text-[#20325e] font-black' },
  in_review: { label: 'Matrícula Solicitada ⏳', color: 'bg-amber-100 text-amber-800 font-black' },
  approved: { label: 'Matriculado ✓', color: 'bg-emerald-100 text-emerald-800 font-black' },
  incomplete: { label: 'Datos Incompletos', color: 'bg-red-100 text-red-800' },
  void: { label: 'Anulado', color: 'bg-gray-900 text-white' },
};

export default function EnrollmentDetailModal({ enrollmentId, onClose, onUpdate }: Props) {
  const { hasPermission, hasRole, user } = useAuth();
  const [enrollment, setEnrollment] = useState<EnrollmentForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusConfirm, setStatusConfirm] = useState<string | null>(null);
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showVoucherPreview, setShowVoucherPreview] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const data = await getEnrollment(enrollmentId);
      setEnrollment(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  const fetchDetailRef = useRef(fetchDetail);
  useEffect(() => { fetchDetailRef.current = fetchDetail; }, [fetchDetail]);

  useEffect(() => {
    fetchDetail();
    const intervalId = setInterval(() => fetchDetailRef.current(), 15000);
    const handleChange = () => fetchDetailRef.current();
    window.addEventListener('crm:enrollments-changed', handleChange);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('crm:enrollments-changed', handleChange);
    };
  }, [fetchDetail]);

  const broadcast = () => window.dispatchEvent(new CustomEvent('crm:enrollments-changed'));

  const handleStatusChange = async (newStatus: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await updateEnrollmentStatus(enrollmentId, newStatus, statusNotes);
      setStatusConfirm(null);
      setStatusNotes('');
      broadcast();
      onUpdate();
      await fetchDetail();
    } catch {
      showError('Error', 'No se pudo cambiar el estado del expediente.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmPayment = async (action: 'confirm' | 'reject') => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await confirmPayment(enrollmentId, action, action === 'reject' ? rejectNotes : undefined);
      showSuccess(
        action === 'confirm' ? '✅ Pago Confirmado' : '❌ Pago Rechazado',
        action === 'confirm'
          ? 'El asesor puede proceder a solicitar la matrícula.'
          : 'El asesor fue notificado para reintentar el pago.'
      );
      setShowRejectConfirm(false);
      setRejectNotes('');
      broadcast();
      onUpdate();
      await fetchDetail();
    } catch {
      showError('Error', 'No se pudo procesar la acción de pago.');
    } finally {
      setIsUpdating(false);
    }
  };

  // payment_requested_to can be either a User object (when the relation is loaded)
  // OR a raw integer FK — handle both cases
  const requestedToId = (() => {
    const raw = (enrollment as any)?.payment_requested_to;
    if (raw && typeof raw === 'object') return Number(raw.id);   // full User object
    return Number(raw);                                           // raw integer FK
  })();

  const isJefeOfThisPayment = !!enrollment && !!user && requestedToId === Number((user as any).id);
  const canConfirmPayment = enrollment?.status === 'payment_pending' && isJefeOfThisPayment;

  const voucherUrl = enrollment?.payment_voucher_path
    ? `${window.location.origin}/api/v1/storage/${enrollment.payment_voucher_path}`
    : null;

  if (loading || !enrollment) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white p-8 rounded-2xl flex flex-col items-center gap-4 shadow-2xl">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary" />
          <p className="text-on-surface-variant font-medium text-sm">Cargando expediente...</p>
        </div>
      </div>
    );
  }

  const status = enrollment.status;
  const publicLink = `${window.location.origin}/enrollment/${enrollment.uuid}`;
  const statusInfo = StatusMap[status] ?? { label: status, color: 'bg-gray-100 text-gray-800' };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
        <div
          className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-8 py-6 border-b bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm ${status === 'approved' ? 'bg-emerald-100 text-emerald-600' : status === 'payment_pending' ? 'bg-[#7a142c]/10 text-[#7a142c]' : status === 'payment_confirmed' ? 'bg-[#20325e]/10 text-[#20325e]' : 'bg-primary/5 text-primary'}`}>
                <ShieldCheck size={30} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 bg-surface-container px-2 py-0.5 rounded">
                    ID: {enrollment.uuid.split('-')[0]}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
                <h2 className="text-2xl font-black font-headline text-primary leading-tight">Expediente de Matrícula</h2>
                <p className="text-sm font-medium text-on-surface-variant/60">{enrollment.course?.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-surface-container-low text-on-surface-variant hover:bg-error/10 hover:text-error rounded-2xl transition-all active:scale-90">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="grid grid-cols-1 gap-8">

              {/* Link section */}
              <div className="bg-primary/5 border border-primary/10 p-5 rounded-3xl flex flex-col sm:flex-row items-center gap-4 hover:border-primary/20 transition-all">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                    <LinkIcon size={12} /> Link de Autogestión para el Cliente
                  </p>
                  <p className="text-sm font-mono text-primary/70 truncate bg-white/50 px-3 py-2 rounded-xl border border-primary/5">{publicLink}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => { navigator.clipboard.writeText(publicLink); showSuccess('Copiado', 'Enlace copiado al portapapeles'); }} className="flex-1 sm:flex-none h-12 px-6 rounded-2xl bg-white border-2 border-primary/10 text-primary font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm">
                    <Copy size={16} /> Copiar
                  </button>
                  <button onClick={() => window.open(publicLink, '_blank')} className="h-12 w-12 rounded-2xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center shadow-sm border-2 border-transparent" title="Abrir formulario">
                    <ExternalLink size={20} />
                  </button>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Datos personales */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm"><User size={20} /></div>
                    <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em]">Información del Aspirante</h3>
                  </div>
                  <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 space-y-5 shadow-sm">
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-1.5">Nombre Completo</p>
                      <p className="font-black text-primary text-xl">{enrollment.student_name || 'Pendiente de llenar'}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 pt-4 border-t border-outline-variant/5">
                      {[
                        { icon: <CreditCard size={18} />, label: 'Identificación', value: enrollment.student_id_number },
                        { icon: <Mail size={18} />, label: 'Correo', value: enrollment.student_email },
                        { icon: <Phone size={18} />, label: 'Teléfono', value: enrollment.student_phone },
                        { icon: <MapPin size={18} />, label: 'Ubicación', value: enrollment.student_city },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center gap-4 group">
                          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant/40 group-hover:bg-primary/10 group-hover:text-primary transition-colors">{row.icon}</div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase">{row.label}</p>
                            <p className="text-xs font-black text-on-surface truncate">{row.value || '—'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Traza */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shadow-sm"><Clock size={20} /></div>
                    <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em]">Traza del Proceso</h3>
                  </div>
                  <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 space-y-5 shadow-sm">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">{enrollment.advisor?.name?.charAt(0)}</div>
                      <div>
                        <p className="text-[9px] font-black text-on-surface-variant/40 uppercase leading-none mb-1">Asesor Responsable</p>
                        <p className="text-sm font-black text-primary">{enrollment.advisor?.name}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl border border-outline-variant/5">
                        <p className="text-[9px] font-black text-on-surface-variant/40 uppercase mb-1">Creado el</p>
                        <p className="text-xs font-black text-on-surface">{new Date(enrollment.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className={`p-4 rounded-2xl border border-outline-variant/5 ${enrollment.completed_at ? 'bg-emerald-50' : ''}`}>
                        <p className={`text-[9px] font-black uppercase mb-1 ${enrollment.completed_at ? 'text-emerald-600' : 'text-on-surface-variant/40'}`}>Formulario Listo</p>
                        <p className={`text-xs font-black ${enrollment.completed_at ? 'text-emerald-700' : 'text-on-surface/40'}`}>
                          {enrollment.completed_at ? new Date(enrollment.completed_at).toLocaleDateString() : 'Pendiente'}
                        </p>
                      </div>
                    </div>
                    <div className="pt-4">
                      <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-3 px-1">Historial Reciente</p>
                      <div className="space-y-3 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                        {enrollment.histories?.slice(0, 4).map((h: any) => (
                          <div key={h.id} className="flex gap-3 text-[11px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/30 mt-1 shrink-0" />
                            <p className="text-on-surface-variant/80 italic line-clamp-2">
                              {h.user?.name || 'Cliente'} → <span className="font-bold text-primary">{StatusMap[h.new_status]?.label ?? h.new_status}</span>
                              {h.notes && <span className="text-on-surface-variant/50"> — {h.notes}</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── PAYMENT VOUCHER INFO (visible when payment_pending or after) ─── */}
              {['payment_pending', 'payment_confirmed', 'in_review', 'approved'].includes(status) && enrollment.bank_transaction_id && (
                <div className={`p-6 rounded-3xl border-2 space-y-4 transition-all duration-500 ${status === 'payment_pending' ? 'bg-[#7a142c]/5 border-[#7a142c]/10' : 'bg-[#20325e]/5 border-[#20325e]/10'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shadow-sm ${status === 'payment_pending' ? 'bg-[#7a142c]/10 text-[#7a142c]' : 'bg-[#20325e]/10 text-[#20325e]'}`}><CreditCard size={20} /></div>
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${status === 'payment_pending' ? 'text-[#7a142c]/60' : 'text-[#20325e]/60'}`}>Comprobante de Pago</p>
                      <p className={`text-sm font-black ${status === 'payment_pending' ? 'text-[#7a142c]' : 'text-[#20325e]'}`}>N° Transacción: <span className="font-mono">{enrollment.bank_transaction_id}</span></p>
                    </div>
                    {status === 'payment_confirmed' && <span className="sm:ml-auto w-fit px-3 py-1 rounded-full bg-[#20325e] text-white text-[10px] font-black uppercase shadow-sm">Verificado ✓</span>}
                    {status === 'payment_pending' && <span className="sm:ml-auto w-fit px-3 py-1 rounded-full bg-[#7a142c] text-white text-[10px] font-black uppercase shadow-sm animate-pulse">En Revisión...</span>}
                  </div>

                  {/* Jefe asignado */}
                  {enrollment.paymentRequestedTo && (
                    <div className={`flex items-center gap-3 text-sm ${status === 'payment_pending' ? 'text-[#7a142c]/80' : 'text-[#20325e]/80'}`}>
                      <User size={14} className="shrink-0" />
                      <span className="font-medium">
                        {status === 'payment_confirmed' ? 'Verificado por:' : 'Enviado para verificación a:'}{' '}
                        <strong>{(enrollment.paymentConfirmedBy ?? enrollment.paymentRequestedTo as any)?.name}</strong>
                      </span>
                    </div>
                  )}

                  {/* Vista previa del comprobante */}
                  {voucherUrl && (
                    <div>
                      <button onClick={() => setShowVoucherPreview(!showVoucherPreview)} className={`flex items-center gap-2 text-xs font-black transition-all mb-3 ${status === 'payment_pending' ? 'text-[#7a142c] hover:opacity-70' : 'text-[#20325e] hover:opacity-70'}`}>
                        <Eye size={14} /> {showVoucherPreview ? 'Ocultar' : 'Ver'} Comprobante
                      </button>
                      {showVoucherPreview && (
                        <div className={`rounded-2xl overflow-hidden border-2 shadow-lg animate-in fade-in duration-300 ${status === 'payment_pending' ? 'border-[#7a142c]/20' : 'border-[#20325e]/20'}`}>
                          {enrollment.payment_voucher_path?.endsWith('.pdf') ? (
                            <a href={voucherUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-4 bg-white transition-all ${status === 'payment_pending' ? 'hover:bg-[#7a142c]/5 text-[#7a142c]' : 'hover:bg-[#20325e]/5 text-[#20325e]'}`}>
                              <CreditCard size={20} /> <span className="text-sm font-bold">Ver PDF del Comprobante</span>
                            </a>
                          ) : (
                            <img src={voucherUrl} alt="Comprobante de pago" className="w-full max-h-72 object-contain bg-white p-2" />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── ACTION BANNER ─── */}
              {status === 'completed' && (
                <div className="relative overflow-hidden p-8 rounded-[2rem] bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl shadow-amber-200 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                      <h4 className="text-xl font-black mb-2 flex items-center gap-3"><Upload /> Siguiente Paso</h4>
                      <p className="text-sm opacity-90 max-w-sm">El formulario está completo. Sube el comprobante de pago para que el jefe lo verifique.</p>
                    </div>
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="group w-full md:w-auto h-16 px-10 rounded-2xl bg-white text-amber-600 font-black text-lg shadow-2xl hover:bg-amber-50 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                    >
                      <CreditCard size={22} /> SUBIR COMPROBANTE
                    </button>
                  </div>
                </div>
              )}

              {status === 'payment_pending' && canConfirmPayment && (
                <div className="relative overflow-hidden p-6 sm:p-8 rounded-[2rem] bg-gradient-to-br from-[#7a142c] to-[#921a35] text-white shadow-xl shadow-[#7a142c]/20 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                      <h4 className="text-lg sm:text-xl font-black mb-2 flex items-center justify-center md:justify-start gap-3">
                        <ShieldCheck /> Verificación de Pago
                      </h4>
                      <p className="text-xs sm:text-sm opacity-90 max-w-sm">
                        Confirmación exclusiva para el Jefe asignado. Revisa los datos bancarios y el comprobante para proceder.
                      </p>
                    </div>
                    <div className="flex flex-col gap-4 w-full md:w-auto">
                      {/* Información de Pago para el Jefe */}
                      <div className="bg-white/10 p-4 rounded-xl border border-white/20 backdrop-blur-sm">
                        <p className="text-[10px] font-black uppercase mb-1 opacity-70">N° Transacción</p>
                        <p className="font-mono text-base sm:text-lg font-black">{enrollment.bank_transaction_id}</p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        {!showRejectConfirm ? (
                          <>
                            <button
                              onClick={() => setShowRejectConfirm(true)}
                              disabled={isUpdating}
                              className="w-full sm:w-auto h-12 sm:h-14 px-6 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-black transition-all flex items-center justify-center gap-2 border-2 border-white/30 text-sm"
                            >
                              <ThumbsDown size={18} /> Rechazar
                            </button>
                            <button
                              onClick={() => handleConfirmPayment('confirm')}
                              disabled={isUpdating}
                              className="w-full sm:w-auto flex-1 h-12 sm:h-14 px-8 rounded-2xl bg-white text-[#7a142c] font-black shadow-2xl hover:bg-red-50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap"
                            >
                              {isUpdating ? <div className="h-5 w-5 border-4 border-white/20 border-t-white rounded-full animate-spin" /> : <><ThumbsUp size={18} /> CONFIRMAR PAGO</>}
                            </button>
                          </>
                        ) : (
                          <div className="w-full space-y-3 animate-in slide-in-from-right duration-300">
                            <input type="text" value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} placeholder="Motivo del rechazo (opcional)..." className="w-full h-12 px-4 rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-white/50 outline-none text-sm font-medium" autoFocus />
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button onClick={() => setShowRejectConfirm(false)} className="w-full sm:flex-1 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all">Cancelar</button>
                              <button onClick={() => handleConfirmPayment('reject')} disabled={isUpdating} className="w-full sm:flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                {isUpdating ? '...' : <><ThumbsDown size={16} /> Confirmar Rechazo</>}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {status === 'payment_pending' && !canConfirmPayment && (
                <div className="p-6 rounded-2xl bg-[#7a142c]/5 border border-[#7a142c]/20 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-[#7a142c]/10 flex items-center justify-center text-[#7a142c] animate-pulse shrink-0"><Clock size={20} /></div>
                  <div>
                    <p className="font-black text-[#7a142c] text-sm">Verificación de Pago Pendiente</p>
                    <p className="text-xs text-[#7a142c]/70 mt-0.5">
                      Tu comprobante ha sido enviado a <strong>
                        {typeof (enrollment as any).payment_requested_to === 'object'
                          ? (enrollment as any).payment_requested_to?.name
                          : (enrollment as any).paymentRequestedTo?.name || 'un Jefe'}
                      </strong> para su revisión.
                    </p>
                    <div className="flex items-center gap-2 mt-2 bg-[#7a142c]/10 w-fit px-3 py-1.5 rounded-full">
                      <div className="w-5 h-5 rounded-full bg-[#7a142c]/40 flex items-center justify-center text-[10px] text-white font-bold overflow-hidden">
                        {(typeof (enrollment as any).payment_requested_to === 'object'
                          ? (enrollment as any).payment_requested_to?.name
                          : (enrollment as any).paymentRequestedTo?.name || 'J')?.charAt(0)}
                      </div>
                      <span className="text-[10px] font-black text-[#7a142c] uppercase tracking-tight">
                        Asignado a: {typeof (enrollment as any).payment_requested_to === 'object'
                          ? (enrollment as any).payment_requested_to?.name
                          : (enrollment as any).paymentRequestedTo?.name || 'Revisión en curso'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {status === 'payment_confirmed' && (
                <div className="relative overflow-hidden p-8 rounded-[2rem] bg-gradient-to-br from-[#20325e] to-[#2a4078] text-white shadow-xl shadow-[#20325e]/20 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <h4 className="text-xl font-black mb-2 flex items-center gap-3"><CheckCircle2 /> Pago Verificado</h4>
                      <p className="text-sm opacity-90 max-w-sm">El pago fue confirmado. Ahora puedes solicitar formalmente la matrícula al administrador.</p>
                    </div>
                    <button
                      onClick={() => handleStatusChange('in_review')}
                      disabled={isUpdating}
                      className="group w-full md:w-auto h-16 px-10 rounded-2xl bg-white text-[#20325e] font-black text-lg shadow-2xl hover:bg-blue-50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isUpdating ? <div className="h-6 w-6 border-4 border-white/20 border-t-[#20325e] rounded-full animate-spin" /> : <><Zap size={22} fill="currentColor" /> SOLICITAR MATRÍCULA</>}
                    </button>
                  </div>
                </div>
              )}

              {status === 'in_review' && (hasRole('admin') || hasRole('jefe')) && (
                <div className="relative overflow-hidden p-8 rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-white shadow-xl shadow-primary/20 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <h4 className="text-xl font-black mb-2 flex items-center gap-3"><ShieldCheck /> Aprobar Matrícula</h4>
                      <p className="text-sm opacity-80 max-w-sm">El asesor ha solicitado la matrícula. Revisa y aprueba para finalizar el proceso.</p>
                    </div>
                    <button
                      onClick={() => handleStatusChange('approved')}
                      disabled={isUpdating}
                      className="group w-full md:w-auto h-16 px-10 rounded-2xl bg-white text-primary font-black text-lg shadow-2xl hover:bg-opacity-90 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isUpdating ? <div className="h-6 w-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /> : <><CheckCircle2 className="group-hover:translate-x-1 transition-transform" /> APROBAR MATRÍCULA</>}
                    </button>
                  </div>
                </div>
              )}

              {/* Admin controls */}
              {hasPermission('enrollments.approve') && (
                <div className="pt-6 border-t border-outline-variant/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] flex items-center gap-2">
                      <AlertCircle size={14} /> Gestión Administrativa
                    </h3>
                    {statusConfirm && <button onClick={() => setStatusConfirm(null)} className="text-[10px] font-bold text-error uppercase">Cancelar</button>}
                  </div>
                  {!statusConfirm ? (
                    <div className="flex flex-wrap gap-2">
                      {['pending_send', 'sent', 'incomplete', 'void'].map(s => (
                        <button key={s} onClick={() => setStatusConfirm(s)} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-surface-container hover:bg-primary/10 hover:text-primary transition-all border border-transparent active:scale-95">
                          {StatusMap[s].label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-end gap-3 bg-surface-container-low p-4 rounded-2xl border border-primary/10">
                        <div className="flex-1">
                          <label className="block text-[9px] font-black text-primary uppercase mb-2 ml-1">Notas del cambio</label>
                          <input type="text" value={statusNotes} onChange={e => setStatusNotes(e.target.value)} placeholder="Motivo del cambio de estado..." className="w-full h-12 px-4 rounded-xl bg-white border border-outline-variant/20 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm font-medium" autoFocus />
                        </div>
                        <button onClick={() => handleStatusChange(statusConfirm)} disabled={isUpdating} className="h-12 px-6 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-lg hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50">
                          {isUpdating ? '...' : 'Confirmar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Voucher Sub-modal */}
      {showPaymentModal && (
        <PaymentVoucherModal
          enrollmentId={enrollmentId}
          studentName={enrollment.student_name}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={async () => {
            setShowPaymentModal(false);
            broadcast();
            onUpdate();
            await fetchDetail();
          }}
        />
      )}

      {/* Full-screen voucher viewer */}
      {showVoucherPreview && voucherUrl && !enrollment.payment_voucher_path?.endsWith('.pdf') && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4" onClick={() => setShowVoucherPreview(false)}>
          <img src={voucherUrl} alt="Comprobante" className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain" />
          <button onClick={() => setShowVoucherPreview(false)} className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all">
            <X size={24} />
          </button>
        </div>
      )}
    </>
  );
}
