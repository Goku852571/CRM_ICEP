import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getEnrollments, getCourses, updateEnrollmentStatus, EnrollmentForm as Enrollment } from '../services/enrollmentService';
import {
  Plus,
  Search,
  Download,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Clock,
  School,
  UserPlus,
  Copy,
  CheckCircle2,
  XCircle,
  Eye,
  Link,
  ExternalLink,
  X,
  ShieldCheck,
  ShieldOff,
  TrendingUp,
  Activity,
  Zap,
  Ticket,
  Users,
  PieChart,
  Target
} from 'lucide-react';
import EnrollmentFormModal from '../components/EnrollmentFormModal';
import EnrollmentDetailModal from '../components/EnrollmentDetailModal';
import { useAuth } from '@/shared/hooks/useAuth';
import { showSuccess, showError, showConfirmDanger } from '@/shared/utils/alerts';
import { getEnrollmentValidationSetting, updateEnrollmentValidationSetting } from '../services/settingsService';

const PAGE_SIZE = 10;

// Status label map matching the API
const STATUS_LABELS: Record<string, string> = {
  pending_send: 'Por Enviar',
  sent: 'Enviado',
  completed: 'Completado',
  in_review: 'En Revisión',
  approved: 'Aprobado',
  incomplete: 'Incompleto',
  void: 'Anulado',
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'approved':
    case 'completed':
      return { bg: 'bg-tertiary-fixed/20', text: 'text-on-tertiary-container', dot: 'bg-on-tertiary-container', label: STATUS_LABELS[status] };
    case 'sent':
    case 'in_review':
      return { bg: 'bg-secondary-container', text: 'text-on-secondary-container', dot: 'bg-secondary', label: STATUS_LABELS[status] };
    case 'void':
    case 'incomplete':
      return { bg: 'bg-error/10', text: 'text-error', dot: 'bg-error', label: STATUS_LABELS[status] };
    case 'pending_send':
    default:
      return { bg: 'bg-surface-container-high', text: 'text-on-surface-variant', dot: 'bg-outline', label: STATUS_LABELS[status] || status };
  }
};

// Per-row action menu
function RowMenu({ enrollment, onStatusChange, onReview }: { enrollment: Enrollment; onStatusChange: () => void; onReview: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const copyLink = () => {
    const link = `${window.location.origin}/enrollment/${enrollment.uuid}`;
    navigator.clipboard.writeText(link);
    showSuccess('Enlace Copiado', 'El link de matrícula fue copiado al portapapeles.');
    setOpen(false);
  };

  const openPublicForm = () => {
    window.open(`/enrollment/${enrollment.uuid}`, '_blank');
    setOpen(false);
  };

  const changeStatus = async (newStatus: string) => {
    try {
      await updateEnrollmentStatus(enrollment.id, newStatus);
      showSuccess('Estado Actualizado', `El expediente fue marcado como "${STATUS_LABELS[newStatus]}".`);
      onStatusChange();
    } catch {
      showError('Error', 'No se pudo actualizar el estado.');
    }
    setOpen(false);
  };

  const voidEnrollment = async () => {
    const confirmed = await showConfirmDanger('¿Anular este expediente?', 'El estudiante no podrá completar el formulario de matrícula.');
    if (!confirmed) return;
    await changeStatus('void');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-3 opacity-0 group-hover:opacity-100 bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-xl transition-all translate-x-4 group-hover:translate-x-0"
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 bg-surface-container-lowest rounded-2xl shadow-2xl shadow-primary/10 border border-outline-variant/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-outline-variant/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 px-2">
              Acciones del Expediente
            </p>
          </div>
          <div className="p-2 space-y-1">
            <button
              onClick={() => { onReview(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black text-primary hover:bg-primary/5 transition-all text-left"
            >
              <Eye size={16} /> REVISAR EXPEDIENTE
            </button>

            <div className="h-px bg-outline-variant/10 my-1" />

            <button onClick={copyLink} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-all text-left">
              <Copy size={16} className="text-on-primary-container" /> Copiar Enlace
            </button>
            <button onClick={openPublicForm} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition-all text-left">
              <ExternalLink size={16} className="text-on-primary-container" /> Abrir Formulario Público
            </button>

            <div className="h-px bg-outline-variant/10 my-1" />

            {enrollment.status !== 'approved' && (
              <button onClick={() => changeStatus('approved')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-tertiary-container hover:bg-tertiary-fixed/10 transition-all text-left">
                <CheckCircle2 size={16} /> Marcar como Aprobado
              </button>
            )}
            {enrollment.status !== 'in_review' && (
              <button onClick={() => changeStatus('in_review')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-on-secondary-container hover:bg-secondary-container/40 transition-all text-left">
                <Eye size={16} /> Poner en Revisión
              </button>
            )}
            {enrollment.status !== 'void' && (
              <button onClick={voidEnrollment} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-error hover:bg-error/5 transition-all text-left">
                <XCircle size={16} /> Anular Expediente
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EnrollmentListPage() {
  const { hasPermission, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | null>(null);
  const [validationEnabled, setValidationEnabled] = useState(false);
  const [isUpdatingValidation, setIsUpdatingValidation] = useState(false);

  useEffect(() => {
    const fetchSetting = async () => {
      const res = await getEnrollmentValidationSetting();
      setValidationEnabled(res.enabled);
    };
    fetchSetting();
  }, []);

  const toggleValidation = async () => {
    setIsUpdatingValidation(true);
    try {
      const newVal = !validationEnabled;
      await updateEnrollmentValidationSetting(newVal);
      setValidationEnabled(newVal);
      showSuccess('Validación Actualizada', `La verificación de datos ahora está ${newVal ? 'Habilitada' : 'Deshabilitada'}.`);
    } catch (e) {
      showError('Error', 'No se pudo actualizar la configuración.');
    } finally {
      setIsUpdatingValidation(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['enrollments', searchTerm, statusFilter, page],
    queryFn: () => getEnrollments({ search: searchTerm, status: statusFilter, page, per_page: PAGE_SIZE }),
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses-for-enrollment'],
    queryFn: getCourses,
  });

  const enrollments: Enrollment[] = data?.data || [];
  const courses = coursesData?.data || [];
  const totalPages = data?.meta?.last_page || 1;
  const totalResults = data?.meta?.total || enrollments.length;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['enrollments'] });
  };

  const exportCSV = () => {
    if (!enrollments.length) {
      showError('Sin datos', 'No hay matrículas para exportar con los filtros actuales.');
      return;
    }
    const headers = ['ID', 'Estudiante', 'Email', 'Teléfono', 'Curso', 'Estado', 'Fecha Registro'];
    const rows = enrollments.map(e => [
      e.id,
      e.student_name || 'Sin nombre',
      e.student_email || '',
      e.student_phone || '',
      e.course?.name || '',
      STATUS_LABELS[e.status] || e.status,
      new Date(e.created_at).toLocaleDateString('es-ES'),
    ]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matriculas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Exportado', 'El archivo CSV fue descargado correctamente.');
  };

  // counts for bento grid
  const pendingCount = enrollments.filter(e => e.status === 'pending_send' || e.status === 'sent').length;
  const incompleteCount = enrollments.filter(e => e.status === 'incomplete').length;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Hero Header Section */}
      <div className="max-w-4xl">
        <h1 className="font-headline font-extrabold text-primary text-4xl md:text-5xl lg:text-5xl mb-3 tracking-tight leading-[1.1]">
          Expedientes de Matrícula
        </h1>
        <p className="text-on-surface-variant font-body text-base md:text-lg leading-relaxed opacity-80">
          Supervisión integral de registros académicos, validaciones de identidad y flujo de aprobación ICEP.
        </p>
      </div>

      {/* Stats Bento Grid - Dashboard Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Matrículas Totales', val: totalResults, icon: Activity, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'Pendientes de Envío', val: pendingCount, icon: Zap, color: 'text-on-primary-container', bg: 'bg-secondary-container' },
          { label: 'Expedientes Incompletos', val: incompleteCount, icon: Ticket, color: 'text-error', bg: 'bg-error/5' },
          { label: 'Efectividad de Pago', val: '94%', icon: Target, color: 'text-on-tertiary-fixed', bg: 'bg-tertiary-fixed/30' },
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
                    style={{ height: `${h * 4}px`, transitionDelay: `${i * 50}ms` }}
                  />
                ))}
              </div>
              <div className={`text-[10px] font-black flex items-center px-3 py-1 rounded-full bg-surface-container-low text-primary`}>
                <TrendingUp size={12} className="mr-1" />
                +1.5%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Control Strip */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4">
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-8 py-5 rounded-2xl bg-primary text-white font-headline font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={20} strokeWidth={3} /> Nueva Matrícula
          </button>

          {hasRole('admin') && (
            <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 leading-none mb-1">Verificación Estricta</p>
                <p className="text-[9px] font-bold text-on-surface-variant/20 uppercase tracking-widest leading-none">Solo Super Admin</p>
              </div>
              <button
                onClick={toggleValidation}
                disabled={isUpdatingValidation}
                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${validationEnabled ? 'bg-tertiary-fixed shadow-lg shadow-tertiary-fixed/20' : 'bg-outline-variant/30'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${validationEnabled ? 'left-7' : 'left-1'}`} />
                {validationEnabled ? (
                  <ShieldCheck size={8} className="absolute left-8 top-2 text-white" />
                ) : (
                  <ShieldOff size={8} className="absolute left-2 top-2 text-on-surface-variant/40" />
                )}
              </button>
            </div>
          )}
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-6 py-5 bg-white border border-outline-variant/30 text-primary font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-surface-container-low transition-all active:scale-95 shadow-sm"
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/30" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre, email o curso..."
            className="w-full pl-14 pr-6 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-bold text-black placeholder:text-on-surface-variant/20 focus:ring-4 focus:ring-primary/5 transition-all"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar flex-wrap">
        <button
          onClick={() => { setStatusFilter(''); setPage(1); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === ''
            ? 'bg-primary text-white shadow-xl shadow-primary/20'
            : 'bg-surface-container-low text-on-surface-variant/60 hover:bg-surface-container-high'
            }`}
        >
          <Filter size={14} />
          Todas
        </button>
        {[
          { value: 'pending_send', label: 'Por Enviar' },
          { value: 'sent', label: 'Enviados' },
          { value: 'in_review', label: 'En Revisión' },
          { value: 'approved', label: 'Aprobados' },
          { value: 'completed', label: 'Completados' },
          { value: 'incomplete', label: 'Incompletos' },
          { value: 'void', label: 'Anulados' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setStatusFilter(value); setPage(1); }}
            className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === value
              ? 'bg-primary text-white shadow-xl shadow-primary/20'
              : 'bg-surface-container-low text-on-surface-variant/60 hover:bg-surface-container-high'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main List Table */}

      {/* Main List Table */}
      <div className="bg-surface-container-low/50 rounded-[2.5rem] p-1.5 overflow-hidden ghost-border shadow-2xl shadow-black/5">
        <div className="bg-white rounded-[2rem] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/30">
                <th className="px-8 py-6 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Estudiante</th>
                <th className="px-8 py-6 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Curso Matriculado</th>
                <th className="px-8 py-6 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Fecha Registro</th>
                <th className="px-8 py-6 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Estado</th>
                <th className="px-8 py-6 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-6"><div className="h-16 bg-surface-container-low rounded-2xl" /></td>
                  </tr>
                ))
              ) : enrollments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-surface-container-low rounded-3xl flex items-center justify-center opacity-40">
                        <School size={32} className="text-on-surface-variant" />
                      </div>
                      <p className="font-headline font-bold text-xl text-primary">Sin Resultados</p>
                      <p className="text-sm text-on-surface-variant/60">No se encontraron matrículas con los filtros actuales.</p>
                      <button onClick={() => { setStatusFilter(''); setSearchTerm(''); }} className="mt-2 text-[10px] font-black uppercase tracking-widest text-on-primary-container underline underline-offset-8">
                        Limpiar Filtros
                      </button>
                    </div>
                  </td>
                </tr>
              ) : enrollments.map((en: Enrollment) => {
                const statusStyle = getStatusStyle(en.status);
                return (
                  <tr key={en.id} className="hover:bg-surface-container-low/30 transition-all duration-300 group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full primary-gradient flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-sm transition-transform group-hover:scale-105 shrink-0">
                          {en.student_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-primary text-sm tracking-tight truncate">{en.student_name || 'Sin nombre'}</p>
                          <p className="text-[11px] font-medium text-on-surface-variant/60 lowercase truncate">{en.student_email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div>
                        <p className="font-bold text-primary text-sm tracking-tight line-clamp-1">{en.course?.name || '—'}</p>
                        <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-0.5">{en.course?.code || 'GEN'}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-tighter">
                        {new Date(en.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <div className={`flex items-center gap-2 px-4 py-2 ${statusStyle.bg} ${statusStyle.text} w-fit rounded-full shadow-sm`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} animate-pulse`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{statusStyle.label}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => setSelectedEnrollmentId(en.id)}
                          className="p-3 bg-surface-container-low text-on-surface-variant/60 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                          title="Ver Detalle"
                        >
                          <Eye size={18} />
                        </button>
                        <RowMenu
                          enrollment={en}
                          onStatusChange={handleRefresh}
                          onReview={() => setSelectedEnrollmentId(en.id)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-8 py-6 bg-surface-container-low/20 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-outline-variant/10">
            <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.2em] text-center sm:text-left">
              Mostrando {enrollments.length} de {totalResults} registros — Página {page} de {totalPages}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-3 rounded-2xl border border-outline-variant/20 bg-white text-on-surface-variant hover:bg-primary hover:text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-11 h-11 rounded-2xl text-xs font-black transition-all active:scale-95 ${page === pageNum
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'border border-outline-variant/20 bg-white text-on-surface-variant hover:bg-surface-container-low'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="p-3 rounded-2xl border border-outline-variant/20 bg-white text-on-surface-variant hover:bg-primary hover:text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EnrollmentFormModal
        isOpen={isModalOpen}
        courses={courses}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['enrollments'] });
        }}
      />

      {selectedEnrollmentId && (
        <EnrollmentDetailModal
          enrollmentId={selectedEnrollmentId}
          onClose={() => setSelectedEnrollmentId(null)}
          onUpdate={handleRefresh}
        />
      )}
    </div>
  );
}
