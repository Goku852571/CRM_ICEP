import { useState } from 'react';
import { 
  X, FileText, Download, Calendar, 
  CheckCircle2, AlertCircle, Loader2 
} from 'lucide-react';
import { exportEnrollments } from '../../enrollments/services/enrollmentService';
import { showError } from '@/shared/utils/alerts';
import clsx from 'clsx';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface Props {
  onClose: () => void;
}

export default function EnrollmentReportModal({ onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<string>('');
  const [step, setStep] = useState<'form' | 'success'>('form');

  const handleDownload = async () => {
    try {
      setLoading(true);
      const data = await exportEnrollments({
        start_date: startDate,
        end_date: endDate,
        status: status || undefined
      });

      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `informe_matriculas_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setStep('success');
    } catch (error: any) {
      console.error('Error exporting enrollments:', error);
      showError('Error', 'No se pudo generar el informe. Por favor, intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm" onClick={onClose} />

      <div className="bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-lg relative z-10 font-body overflow-hidden border border-outline-variant/20 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container-lowest relative overflow-hidden">
          <div className="absolute top-0 right-[-10%] w-48 h-48 bg-tertiary-fixed/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
          <div className="relative z-10 text-center w-full">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <FileText className="text-primary" size={24} />
            </div>
            <h2 className="text-2xl font-headline font-extrabold text-primary">
              Generar Informe de Matrículas
            </h2>
            <p className="text-xs text-on-surface-variant font-medium mt-1 opacity-70">
              Extrae y consolida los datos de auditoría institucional
            </p>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-surface-variant text-on-surface-variant rounded-full transition-colors active:scale-95">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {step === 'form' ? (
            <div className="space-y-6">
              {/* Date Filters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={12} /> Fecha Inicio
                  </label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={12} /> Fecha Fin
                  </label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-wider">Estado de Matrícula</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Todos los estados</option>
                  <option value="pending_send">Pendiente de Envío</option>
                  <option value="sent">Enviado al Estudiante</option>
                  <option value="completed">Completado por Estudiante</option>
                  <option value="in_review">En Revisión</option>
                  <option value="approved">Aprobado / Matriculado</option>
                  <option value="void">Anulado</option>
                </select>
              </div>

              {/* Info Card */}
              <div className="p-4 bg-tertiary-fixed/10 border border-tertiary-fixed/20 rounded-2xl flex gap-3">
                <div className="p-2 bg-white rounded-lg self-start">
                  <AlertCircle size={16} className="text-tertiary-fixed-variant" />
                </div>
                <div className="text-xs text-on-tertiary-fixed font-medium leading-relaxed">
                  <p className="font-bold mb-0.5">Nota de Auditoría</p>
                  El informe se descargará en formato <span className="font-bold underline">CSV</span> compatible con Microsoft Excel y Google Sheets. Contiene datos personales y de contacto.
                </div>
              </div>

              {/* Download Button */}
              <button 
                onClick={handleDownload}
                disabled={loading}
                className={clsx(
                  "w-full py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100",
                  loading ? "cursor-wait" : ""
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Procesando datos...
                  </>
                ) : (
                  <>
                    <Download size={16} /> Descargar Informe Completo
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="py-10 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-tertiary-fixed/20 text-tertiary-fixed-variant rounded-full flex items-center justify-center mx-auto mb-6 scale-110">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-xl font-headline font-bold text-primary mb-2">¡Informe Generado!</h3>
              <p className="text-sm text-on-surface-variant max-w-[280px] mx-auto mb-8">
                El archivo ha sido preparado y la descarga debería haber comenzado automáticamente.
              </p>
              <button 
                onClick={onClose}
                className="px-10 py-3 rounded-full bg-surface-container-high text-on-surface font-bold text-xs uppercase tracking-widest hover:bg-surface-container-highest transition-colors"
              >
                Cerrar Ventana
              </button>
            </div>
          )}
        </div>

        {/* Footer info label */}
        <div className="p-4 bg-surface-container-low/50 text-center">
            <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.2em]">
                Sistema de Gestión Institucional v2.0
            </span>
        </div>
      </div>
    </div>
  );
}
