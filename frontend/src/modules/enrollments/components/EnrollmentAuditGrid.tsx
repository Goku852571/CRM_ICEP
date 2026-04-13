import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download, RefreshCw, Filter, CheckCircle2, AlertCircle,
  Edit3, Check, X, Receipt, Building2, CreditCard, TrendingDown,
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

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportDetailedReport({ start_date: filters.start_date, end_date: filters.end_date });
    } finally {
      setIsExporting(false);
    }
  };

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

      {/* ── Table ── */}
      <div className="bg-white rounded-3xl border border-outline-variant/15 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : enrollments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-6 rounded-full bg-surface-container-high mb-4"><Receipt size={40} className="text-gray-300" /></div>
            <p className="font-headline font-bold text-gray-400 text-xl">Sin registros en el período</p>
            <p className="text-xs text-gray-300 mt-1 uppercase tracking-widest font-bold">Ajusta el rango de fechas o los filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead>
                <tr className="border-b border-outline-variant/10 bg-surface-container-low/40">
                  {[
                    'N°', 'Fecha', 'Asesor', 'Estudiante', 'Ciudad',
                    'Curso', 'Facturación', 'Banco', 'Concepto',
                    'Valor Venta', 'Total Pagado', 'Saldo', 'Estado',
                  ].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-on-surface-variant/50 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e, i) => {
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
                      {/* N° */}
                      <td className="px-4 py-3 text-[11px] font-black text-on-surface-variant/40">{i + 1}</td>

                      {/* Fecha */}
                      <td className="px-4 py-3 text-xs font-semibold text-on-surface-variant whitespace-nowrap">
                        {new Date(e.created_at).toLocaleDateString('es-CO')}
                      </td>

                      {/* Asesor */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary shrink-0">
                            {e.advisor?.name?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <span className="text-xs font-semibold whitespace-nowrap">{e.advisor?.name ?? '—'}</span>
                        </div>
                      </td>

                      {/* Estudiante */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-on-surface truncate max-w-[140px]">{e.student_name ?? '—'}</p>
                        <p className="text-[10px] text-on-surface-variant/50">{e.student_email ?? ''}</p>
                      </td>

                      {/* Ciudad */}
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{e.student_city ?? '—'}</td>

                      {/* Curso */}
                      <td className="px-4 py-3 text-xs font-semibold text-on-surface max-w-[120px] truncate">{e.course?.name ?? '—'}</td>

                      {/* Facturación (editable) */}
                      <td className="px-4 py-3">
                        <EditableCell enrollmentId={e.id} field="requires_billing" value={e.requires_billing} type="boolean" />
                      </td>

                      {/* Banco (editable) */}
                      <td className="px-4 py-3">
                        <EditableCell enrollmentId={e.id} field="bank_name" value={e.bank_name} type="text" />
                      </td>

                      {/* Concepto de pago */}
                      <td className="px-4 py-3">
                        <EditableCell
                          enrollmentId={e.id}
                          field="payment_concept"
                          value={e.payment_concept}
                          type="select"
                          options={[
                            { value: 'enrollment', label: 'Matrícula' },
                            ...(Array.from({ length: e.course?.installments_count ?? 3 }, (_, i) => ({
                              value: `installment_${i + 1}`,
                              label: `Cuota ${i + 1}`,
                            }))),
                            { value: 'full', label: 'Pago Completo' },
                          ]}
                        />
                      </td>

                      {/* Valor Venta (editable) */}
                      <td className="px-4 py-3">
                        <EditableCell enrollmentId={e.id} field="sale_value" value={e.sale_value} type="number" />
                      </td>

                      {/* Total Pagado (editable) */}
                      <td className="px-4 py-3">
                        <EditableCell enrollmentId={e.id} field="total_paid" value={e.total_paid} type="number" />
                      </td>

                      {/* Saldo (calculado) */}
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'text-xs font-black',
                          balanceNegative ? 'text-red-600' : (e.balance_due === 0 ? 'text-emerald-600' : 'text-amber-600')
                        )}>
                          {fmt(e.balance_due)}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full whitespace-nowrap ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-on-surface-variant/40 text-center uppercase tracking-widest font-bold">
        Haz clic en cualquier valor subrayado para editarlo directamente. El saldo se recalcula automáticamente.
      </p>
    </div>
  );
}
