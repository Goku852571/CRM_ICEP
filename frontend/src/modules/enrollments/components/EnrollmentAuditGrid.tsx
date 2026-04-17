import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download, RefreshCw, Filter, CheckCircle2, AlertCircle,
  Edit3, Check, X, Receipt, Building2, CreditCard, TrendingDown, ChevronDown, Eye
} from 'lucide-react';
import {
  getEnrollmentAuditData,
  updateEnrollmentFinancials,
  exportDetailedReport,
  type EnrollmentForm,
  type AuditSummary,
} from '../../enrollments/services/enrollmentService';
import clsx from 'clsx';

// ── Types ────────────────────────────────────────────────────────────────────

interface AuditFilters {
  start_date: string;
  end_date: string;
  advisor_id?: number;
  status?: string;
}

interface EditingCell {
  id: number;
  field: keyof EnrollmentForm;
  value: string | boolean | number | null;
}

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_send:      { label: 'Pendiente',       color: 'bg-gray-100 text-gray-600' },
  sent:              { label: 'Enviado',          color: 'bg-blue-100 text-blue-700' },
  completed:         { label: 'Completado',       color: 'bg-indigo-100 text-indigo-700' },
  payment_pending:   { label: 'Pago Pendiente',   color: 'bg-amber-100 text-amber-700' },
  payment_confirmed: { label: 'Pago Confirmado',  color: 'bg-emerald-100 text-emerald-700' },
  in_review:         { label: 'En Revisión',      color: 'bg-purple-100 text-purple-700' },
  approved:          { label: 'Aprobado',         color: 'bg-green-100 text-green-700' },
  incomplete:        { label: 'Incompleto',       color: 'bg-rose-100 text-rose-700' },
  void:              { label: 'Anulado',          color: 'bg-red-100 text-red-700' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2 })}` : '—';

// ── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className={`rounded-2xl p-5 flex items-center gap-4 border ${color}`}>
      <div className="p-2.5 rounded-xl bg-white/60">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-70">{label}</p>
        <p className="text-xl font-headline font-black">{value}</p>
      </div>
    </div>
  );
}

// ── Inline editable cell ──────────────────────────────────────────────────────
function EditableCell({ enrollmentId, field, value, type = 'number', options }: {
  enrollmentId: number;
  field: string;
  value: string | number | boolean | null;
  type?: 'number' | 'text' | 'select' | 'boolean';
  options?: { value: string; label: string }[];
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value != null ? String(value) : '');

  const mutation = useMutation({
    mutationFn: (payload: Record<string, any>) => updateEnrollmentFinancials(enrollmentId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enrollment-audit'] }),
  });

  const save = useCallback(() => {
    let parsed: string | number | boolean | null = draft;
    if (type === 'number') parsed = draft === '' ? null : parseFloat(draft);
    if (type === 'boolean') parsed = draft === 'true';
    mutation.mutate({ [field]: parsed });
    setEditing(false);
  }, [draft, field, type, mutation]);

  const cancel = () => {
    setDraft(value != null ? String(value) : '');
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-[120px]">
        {type === 'select' && options ? (
          <select
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="flex-1 text-xs px-2 py-1 border border-primary/40 rounded-lg outline-none bg-white"
          >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : type === 'boolean' ? (
          <select
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="flex-1 text-xs px-2 py-1 border border-primary/40 rounded-lg outline-none bg-white"
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        ) : (
          <input
            autoFocus
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
            className="flex-1 text-xs px-2 py-1 border border-primary/40 rounded-lg outline-none w-24 bg-white"
          />
        )}
        <button onClick={save} className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors">
          <Check size={13} />
        </button>
        <button onClick={cancel} className="p-1 rounded-md text-red-500 hover:bg-red-50 transition-colors">
          <X size={13} />
        </button>
      </div>
    );
  }

  const displayValue = type === 'boolean'
    ? (value ? <span className="text-emerald-600 font-bold">SÍ</span> : <span className="text-gray-400">NO</span>)
    : type === 'number'
    ? (value != null ? fmt(value as number) : <span className="text-gray-300">—</span>)
    : (value || <span className="text-gray-300">—</span>);

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1.5 text-left hover:text-primary transition-colors"
    >
      <span className="text-xs font-semibold">{displayValue}</span>
      <Edit3 size={11} className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function EnrollmentAuditGrid() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const [filters, setFilters] = useState<AuditFilters>({
    start_date: firstDayOfMonth,
    end_date: todayStr,
  });
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['enrollment-audit', filters],
    queryFn: () => getEnrollmentAuditData(filters),
  });

  const enrollments: EnrollmentForm[] = data?.data ?? [];
  const summary: AuditSummary | undefined = data?.summary;

  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportDetailedReport({ start_date: filters.start_date, end_date: filters.end_date });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleCourse = (courseName: string) => {
    setExpandedCourses(prev => ({ ...prev, [courseName]: !prev[courseName] }));
  };

  const groupedEnrollments = enrollments.reduce((acc, current) => {
    const courseName = current.course?.name ?? 'Sin Curso';
    if (!acc[courseName]) acc[courseName] = [];
    acc[courseName].push(current);
    return acc;
  }, {} as Record<string, EnrollmentForm[]>);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-outline-variant/20 rounded-2xl px-4 py-2.5 shadow-sm">
          <Filter size={14} className="text-primary" />
          <input
            type="date"
            value={filters.start_date}
            onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))}
            className="text-xs font-bold border-none outline-none bg-transparent"
          />
          <span className="text-xs text-gray-300 font-bold">→</span>
          <input
            type="date"
            value={filters.end_date}
            onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))}
            className="text-xs font-bold border-none outline-none bg-transparent"
          />
        </div>

        <select
          value={filters.status ?? ''}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value || undefined }))}
          className="text-xs font-bold px-4 py-2.5 bg-white border border-outline-variant/20 rounded-2xl shadow-sm outline-none hover:border-primary/40 transition-colors cursor-pointer"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-outline-variant/20 rounded-2xl text-xs font-bold shadow-sm hover:border-primary/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin text-primary' : ''} />
          Actualizar
        </button>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-2xl text-xs font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 ml-auto"
        >
          <Download size={14} />
          {isExporting ? 'Exportando...' : 'Exportar Excel'}
        </button>
      </div>

      {/* ── Summary Cards ── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard label="Registros" value={String(summary.total_records)} icon={Receipt} color="bg-blue-50 text-blue-800 border-blue-100" />
          <SummaryCard label="Total Venta" value={fmt(summary.total_sale_value)} icon={CreditCard} color="bg-indigo-50 text-indigo-800 border-indigo-100" />
          <SummaryCard label="Total Pagado" value={fmt(summary.total_paid)} icon={CheckCircle2} color="bg-emerald-50 text-emerald-800 border-emerald-100" />
          <SummaryCard label="Saldo Pend." value={fmt(summary.total_balance_due)} icon={TrendingDown} color="bg-amber-50 text-amber-800 border-amber-100" />
          <SummaryCard label="Req. Factura" value={String(summary.billing_count)} icon={Building2} color="bg-purple-50 text-purple-800 border-purple-100" />
          <SummaryCard label="Pago Conf." value={String(summary.payment_confirmed)} icon={AlertCircle} color="bg-green-50 text-green-800 border-green-100" />
        </div>
      )}

      {/* ── Table Grouped by Course ── */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 bg-white rounded-3xl">
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : enrollments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl">
            <div className="p-6 rounded-full bg-surface-container-high mb-4"><Receipt size={40} className="text-gray-300" /></div>
            <p className="font-headline font-bold text-gray-400 text-xl">Sin registros en el período</p>
            <p className="text-xs text-gray-300 mt-1 uppercase tracking-widest font-bold">Ajusta el rango de fechas o los filtros</p>
          </div>
        ) : (
          Object.entries(groupedEnrollments).map(([courseName, items]) => {
            const isExpanded = expandedCourses[courseName] ?? true;
            return (
              <div key={courseName} className="bg-white rounded-3xl border border-outline-variant/15 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleCourse(courseName)}
                  className="w-full flex items-center justify-between p-5 bg-surface-container-lowest/50 hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="font-headline font-black text-primary text-lg">{courseName}</h3>
                      <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">{items.length} Expedientes</p>
                    </div>
                  </div>
                  <ChevronDown size={20} className={clsx('text-primary/50 transition-transform', isExpanded ? 'rotate-180' : '')} />
                </button>

                {isExpanded && (
                  <div className="overflow-x-auto border-t border-outline-variant/10">
                    <table className="w-full min-w-[1200px] text-left">
                      <thead>
                        <tr className="border-b border-outline-variant/10 bg-surface-container-low/40">
                          {[
                            'N°', 'Fecha', 'Asesor', 'Estudiante / Ciudad',
                            'Facturación', 'Banco', 'N° Transacción', 'Concepto',
                            'Valor Venta', 'Total Pagado', 'Saldo', 'Estado Global', 'Comprobantes'
                          ].map(h => (
                            <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-on-surface-variant/50 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((e, i) => {
                          const statusCfg = STATUS_CONFIG[e.status] ?? { label: e.status, color: 'bg-gray-100 text-gray-600' };
                          const balanceNegative = (e.balance_due ?? 0) < 0;
                          return (
                            <tr
                              key={e.id}
                              className={clsx(
                                'border-b border-outline-variant/5 hover:bg-primary/[0.02] transition-colors',
                                i % 2 === 0 ? 'bg-white' : 'bg-surface-container-lowest/40',
                              )}
                            >
                              <td className="px-4 py-3 text-[11px] font-black text-on-surface-variant/40 align-top">{i + 1}</td>
                              <td className="px-4 py-3 text-xs font-semibold text-on-surface-variant whitespace-nowrap align-top">
                                {new Date(e.created_at).toLocaleDateString('es-CO')}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary shrink-0">
                                    {e.advisor?.name?.charAt(0).toUpperCase() ?? '?'}
                                  </div>
                                  <span className="text-xs font-semibold whitespace-nowrap">{e.advisor?.name ?? '—'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <p className="text-xs font-bold text-on-surface truncate max-w-[140px] leading-tight">{e.student_name ?? '—'}</p>
                                <p className="text-[10px] text-on-surface-variant/50 mt-1">{e.student_city ?? 'Sin Ciudad'}</p>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <EditableCell enrollmentId={e.id} field="requires_billing" value={e.requires_billing} type="boolean" />
                              </td>
                              <td className="px-4 py-3 align-top">
                                <EditableCell enrollmentId={e.id} field="bank_name" value={e.bank_name} type="text" />
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex flex-col gap-1">
                                  {e.payments?.map(p => (
                                    <span key={p.id} className="text-[10px] font-mono text-on-surface-variant font-bold bg-surface-container px-1.5 py-0.5 rounded truncate max-w-[120px]" title={p.bank_transaction_id}>
                                      {p.bank_transaction_id}
                                    </span>
                                  ))}
                                  {(!e.payments || e.payments.length === 0) && <span className="text-gray-300">—</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="text-xs font-bold text-on-surface-variant whitespace-nowrap">{e.payment_concept || '—'}</div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <EditableCell enrollmentId={e.id} field="sale_value" value={e.sale_value} type="number" />
                              </td>
                              <td className="px-4 py-3 align-top text-xs font-bold text-emerald-600">
                                {fmt(e.total_paid)}
                              </td>
                              <td className="px-4 py-3 align-top">
                                <span className={clsx(
                                  'text-xs font-black',
                                  balanceNegative ? 'text-red-600' : (e.balance_due === 0 ? 'text-emerald-600' : 'text-amber-600')
                                )}>
                                  {fmt(e.balance_due)}
                                </span>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${statusCfg.color}`}>
                                  {statusCfg.label}
                                </span>
                              </td>
                              {/* Historial de Comprobantes (Vía Relación Payments) */}
                              <td className="px-4 py-3 align-top min-w-[200px]">
                                {e.payments && e.payments.length > 0 ? (
                                  <div className="space-y-2">
                                    {e.payments.map(p => (
                                      <div key={p.id} className="flex flex-col gap-1 text-[10px] bg-surface-container-low p-2 rounded-lg border border-outline-variant/10">
                                        <div className="flex items-center justify-between font-black text-on-surface">
                                          <span>Cuota {p.installment_number}: {fmt(p.amount)}</span>
                                          <span className={clsx(
                                              p.status === 'confirmed' ? 'text-emerald-600' : p.status === 'rejected' ? 'text-red-600' : 'text-amber-600'
                                          )}>
                                            {p.status === 'confirmed' ? '✓' : p.status === 'rejected' ? '✕' : '⏳'}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between font-mono text-on-surface-variant/70">
                                          <span>{p.bank_transaction_id}</span>
                                          {p.payment_voucher_path && (
                                              <button type="button" onClick={(ev) => { ev.stopPropagation(); setVoucherPreview(`${window.location.origin}/api/v1/storage/${p.payment_voucher_path}`); }} className="text-primary hover:underline flex items-center gap-1 cursor-pointer">
                                                <Eye size={10} /> PDF/Img
                                              </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] italic text-on-surface-variant/40">Sin abonos</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="text-[10px] text-on-surface-variant/40 text-center uppercase tracking-widest font-bold">
        Haz clic en cualquier valor subrayado para editarlo directamente. El saldo se recalcula automáticamente.
      </p>

      {voucherPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setVoucherPreview(null)}>
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 bg-surface-container border-b border-outline-variant/10">
              <h3 className="font-headline font-black text-primary">Vista Previa de Comprobante</h3>
              <button type="button" onClick={() => setVoucherPreview(null)} className="p-2 text-on-surface-variant hover:bg-white rounded-xl transition-colors shadow-sm">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-surface-container-lowest">
              {voucherPreview.toLowerCase().endsWith('.pdf') ? (
                <iframe src={voucherPreview} className="w-full h-[70vh] rounded-xl border border-outline-variant/10" title="PDF Preview" />
              ) : (
                <img src={voucherPreview} alt="Comprobante" className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
