import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, CreditCard, User, AlertTriangle, CheckCircle, ChevronDown } from 'lucide-react';
import { submitPaymentVoucher, getJefes, Jefe, EnrollmentForm } from '../services/enrollmentService';
import { getSystemOptions, SystemOption } from '@/shared/services/systemOptionService';
import { showSuccess, showError } from '@/shared/utils/alerts';

interface Props {
  enrollment: EnrollmentForm;
  installmentNumber: number;
  paymentId?: number; // If provided, we are editing an existing payment
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentVoucherModal({ enrollment, installmentNumber, paymentId, onClose, onSuccess }: Props) {
  const [jefes, setJefes] = useState<Jefe[]>([]);
  const [banks, setBanks] = useState<SystemOption[]>([]);
  const [selectedJefe, setSelectedJefe] = useState<Jefe | null>(null);
  const [jefeDropdownOpen, setJefeDropdownOpen] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [paymentConcept] = useState(`Cuota ${installmentNumber}`);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  
  // New financial states
  const [amount, setAmount] = useState<string>(enrollment.course?.installment_value ? String(enrollment.course.installment_value) : '');
  const [bankName, setBankName] = useState<string>(enrollment.bank_name || '');
  const [saleValue, setSaleValue] = useState<string>(enrollment.course?.enrollment_value ? String(enrollment.course.enrollment_value) : '');
  const [requiresBilling, setRequiresBilling] = useState<boolean>(false);
  
  const isInitialSetup = !enrollment.sale_value && installmentNumber === 1; // First payment defines the sale value
  
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!paymentId;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditMode && enrollment.payments) {
      const p = enrollment.payments.find(p => p.id === paymentId);
      if (p) {
        setTransactionId(p.bank_transaction_id);
        setAmount(String(p.amount));
        setBankName(p.bank_name || '');
      }
    }
  }, [isEditMode, paymentId, enrollment.payments]);

  useEffect(() => {
    getJefes().then(setJefes).catch(console.error);
    getSystemOptions('banks').then(data => setBanks(data.data || [])).catch(console.error);
  }, []);

  const handleFile = (f: File) => {
    setFile(f);
    setError(null);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setFilePreview(null); // PDF — no image preview
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!transactionId.trim()) { setError('Ingresa el número de transacción bancaria.'); return; }
    if (!paymentConcept) { setError('Selecciona el concepto del pago.'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Ingresa el monto del pago.'); return; }
    if (!bankName.trim() && isInitialSetup) { setError('El Banco es obligatorio.'); return; }
    if (isInitialSetup && (!saleValue || isNaN(Number(saleValue)))) { setError('Ingresa el valor de venta total.'); return; }
    
    if (isInitialSetup && enrollment.course?.min_price && Number(saleValue) < enrollment.course.min_price) {
        setError(`El valor de venta no puede ser menor a la Inversión Mínima permitida ($${enrollment.course.min_price}).`); return;
    }

    if (!file) { setError('Debes adjuntar el comprobante de pago.'); return; }
    if (!selectedJefe) { setError('Selecciona el jefe que verificará el pago.'); return; }

    setIsSubmitting(true);
    if (isEditMode) {
      try {
        await import('../services/enrollmentService').then(m => m.updateEnrollmentPayment(
          enrollment.id,
          paymentId!,
          {
            bank_transaction_id: transactionId.trim(),
            amount: Number(amount),
            bank_name: bankName.trim() || undefined
          }
        ));
        showSuccess('Pago Actualizado', 'Los datos del pago han sido modificados correctamente.');
        onSuccess();
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Error al actualizar el pago.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      await submitPaymentVoucher(
        enrollment.id,
        {
          bank_transaction_id: transactionId.trim(),
          payment_concept: paymentConcept,
          payment_voucher: file!,
          installment_number: installmentNumber,
          payment_requested_to: selectedJefe!.id,
          amount: Number(amount),
          sale_value: isInitialSetup ? Number(saleValue) : undefined,
          requires_billing: isInitialSetup ? requiresBilling : undefined,
          bank_name: bankName.trim() || undefined
        }
      );

      showSuccess('¡Comprobante enviado!', `El jefe ${selectedJefe.name} recibirá la notificación de verificación.`);
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.errors?.bank_transaction_id?.[0]
        ?? err?.response?.data?.message
        ?? 'Error al enviar el comprobante.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <CreditCard size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Registrar Cuota {installmentNumber}</h2>
              <p className="text-amber-100 text-sm font-medium">{enrollment.student_name || 'Estudiante'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">

          {/* Error alert */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl animate-in slide-in-from-top-2">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Número de Transacción */}
          <div>
            <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-2 ml-1">
              Número de Transacción Bancaria *
            </label>
            <div className="relative">
              <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
              <input
                type="text"
                value={transactionId}
                onChange={e => { setTransactionId(e.target.value); setError(null); }}
                placeholder="Ej: TXN-2026-0041234"
                className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-outline-variant/20 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none transition-all font-mono text-sm bg-surface-container-lowest"
              />
            </div>
            <p className="text-[10px] text-on-surface-variant/40 mt-1 ml-1">Este número debe ser único. Si ya existe en el sistema, no se aceptará.</p>
          </div>

          {/* Concepto de Pago y Monto */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-2 ml-1">
                Concepto del Pago
              </label>
              <div className="w-full h-14 px-4 flex items-center rounded-2xl border-2 border-outline-variant/10 bg-surface-container-low font-bold text-sm text-primary">
                {paymentConcept}
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-2 ml-1">
                Monto del Pago *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-on-surface-variant/40">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setError(null); }}
                  placeholder="Ej: 50.00"
                  className="w-full h-14 pl-8 pr-4 rounded-2xl border-2 border-outline-variant/20 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none transition-all font-mono font-bold text-sm bg-surface-container-lowest"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Banco */}
            <div>
              <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-2 ml-1">
                Banco Emisor del Pago {isInitialSetup && '*'}
              </label>
              <div className="relative">
                <select
                  value={bankName}
                  onChange={e => { setBankName(e.target.value); setError(null); }}
                  className="w-full h-14 px-4 rounded-2xl border-2 border-outline-variant/20 focus:border-amber-400 outline-none transition-all font-bold text-sm bg-surface-container-lowest appearance-none"
                >
                  <option value="">Selecciona Banco...</option>
                  {banks.map(bank => (
                    <option key={bank.id} value={bank.name}>{bank.name}</option>
                  ))}
                  {/* Fallback in case specific manual entry is needed or if list is empty */}
                  {banks.length === 0 && <option value="Otro">Otro / Manual</option>}
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
              </div>
            </div>

            {/* Requires Billing */}
            {isInitialSetup && (
              <div>
                <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-2 ml-1">
                  Requerirá Facturación *
                </label>
                <div className="relative">
                  <select
                    value={requiresBilling ? 'true' : 'false'}
                    onChange={e => { setRequiresBilling(e.target.value === 'true'); setError(null); }}
                    className="w-full h-14 px-4 rounded-2xl border-2 border-outline-variant/20 focus:border-amber-400 outline-none transition-all font-bold text-sm bg-surface-container-lowest appearance-none"
                  >
                    <option value="false">NO (Solo Recibo)</option>
                    <option value="true">SÍ (Recordar Facturar)</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Valor de Venta (Solo Inicial) */}
          {isInitialSetup && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm animate-in zoom-in-95">
              <label className="block text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2 ml-1">
                Valor Total de Venta de Matrícula *
              </label>
              <div className="relative mb-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-amber-600/50">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={saleValue}
                  onChange={e => { setSaleValue(e.target.value); setError(null); }}
                  placeholder="Ej: 500.00"
                  className="w-full h-16 pl-9 pr-4 rounded-2xl border-2 border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-200 outline-none transition-all font-mono font-black text-lg bg-surface-container-lowest text-amber-900"
                />
              </div>
              <div className="flex items-start gap-2 bg-white/50 p-2 rounded-xl border border-amber-200/50">
               <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
               <p className="text-[10px] text-amber-800 font-medium">Este valor se registrará como el total del acuerdo. No podrá ser menor al precio de Inversión Mínima definido para este curso.</p>
              </div>
            </div>
          )}

          {/* Zona de subida de archivo */}
          <div>
            <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-2 ml-1">
              Comprobante de Pago (Imagen o PDF) *
            </label>
            <div
              ref={dropRef}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 cursor-pointer text-center transition-all duration-300 
                ${isDragging ? 'border-amber-400 bg-amber-50 scale-[1.02]' : 'border-outline-variant/30 hover:border-amber-300 hover:bg-amber-50/20'}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />

              {filePreview ? (
                <div className="space-y-3">
                  <img src={filePreview} alt="Vista previa" className="max-h-48 mx-auto rounded-xl object-contain shadow-md" />
                  <p className="text-sm font-bold text-amber-600">{file?.name}</p>
                  <p className="text-xs text-on-surface-variant/50">Haz clic para cambiar</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-16 w-16 rounded-2xl bg-amber-100 flex items-center justify-center">
                    <FileText size={32} className="text-amber-600" />
                  </div>
                  <p className="text-sm font-bold text-amber-600">{file.name}</p>
                  <p className="text-xs text-on-surface-variant/50">PDF adjunto — Haz clic para cambiar</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="h-16 w-16 rounded-2xl bg-surface-container flex items-center justify-center">
                    <Upload size={28} className="text-on-surface-variant/40" />
                  </div>
                  <div>
                    <p className="font-bold text-on-surface-variant">Arrastra o haz clic aquí</p>
                    <p className="text-sm text-on-surface-variant/50">JPG, PNG o PDF — máx 5 MB</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selector de Jefe */}
          <div>
            <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-2 ml-1">
              Enviar solicitud de verificación a *
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setJefeDropdownOpen(!jefeDropdownOpen)}
                className={`w-full h-14 px-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all outline-none
                  ${jefeDropdownOpen ? 'border-amber-400 ring-4 ring-amber-100' : 'border-outline-variant/20 hover:border-amber-300'}`}
              >
                {selectedJefe ? (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {selectedJefe.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-on-surface">{selectedJefe.name}</p>
                      <p className="text-[10px] text-on-surface-variant/50">{selectedJefe.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-on-surface-variant/50">
                    <User size={18} />
                    <span className="text-sm">Selecciona el jefe verificador...</span>
                  </div>
                )}
                <ChevronDown size={18} className={`text-on-surface-variant/40 transition-transform ${jefeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {jefeDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-outline-variant/10 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  {jefes.length === 0 ? (
                    <p className="p-4 text-sm text-on-surface-variant/50 text-center">No hay jefes disponibles.</p>
                  ) : jefes.map(jefe => (
                    <button
                      key={jefe.id}
                      type="button"
                      onClick={() => { setSelectedJefe(jefe); setJefeDropdownOpen(false); setError(null); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-all text-left"
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0">
                        {jefe.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-on-surface">{jefe.name}</p>
                        <p className="text-[10px] text-on-surface-variant/50">{jefe.email}</p>
                      </div>
                      {selectedJefe?.id === jefe.id && <CheckCircle size={16} className="ml-auto text-amber-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 h-14 rounded-2xl border-2 border-outline-variant/20 font-bold text-on-surface-variant hover:bg-surface-container transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 h-14 rounded-2xl bg-amber-500 text-white font-black shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Upload size={20} /> ENVIAR COMPROBANTE</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
