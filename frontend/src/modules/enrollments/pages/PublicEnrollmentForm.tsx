import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicEnrollment, submitPublicEnrollment } from '../services/enrollmentService';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CheckCircle2, AlertCircle, BookOpen, User, Mail, Phone, CreditCard, MapPin, ArrowRight, Loader2, ShieldCheck, School, Globe, Check, ChevronDown } from 'lucide-react';
import { getEnrollmentValidationSetting } from '../services/settingsService';

const COUNTRIES = [
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', prefix: '+593' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', prefix: '+51' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', prefix: '+57' },
  { code: 'US', name: 'EE.UU.', flag: '🇺🇸', prefix: '+1' },
  { code: 'ES', name: 'España', flag: '🇪🇸', prefix: '+34' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', prefix: '+54' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', prefix: '+56' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', prefix: '+58' },
  { code: 'MX', name: 'México', flag: '🇲🇽', prefix: '+52' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴', prefix: '+591' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', prefix: '+595' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', prefix: '+598' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦', prefix: '+507' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', prefix: '+506' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', prefix: '+502' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', prefix: '+503' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', prefix: '+504' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', prefix: '+505' },
  { code: 'DO', name: 'R. Dominicana', flag: '🇩🇴', prefix: '+1' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦', prefix: '+1' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹', prefix: '+39' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷', prefix: '+33' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪', prefix: '+49' },
];

const validarCedulaEcuatoriana = (cedula: string) => {
  if (cedula.length !== 10) return false;
  const digits = cedula.split('').map(Number);
  const prov = digits[0] * 10 + digits[1];
  if (prov < 1 || prov > 24) return false;
  const last = digits.pop();
  let sum = 0;
  digits.forEach((d, i) => {
    let v = d * (i % 2 === 0 ? 2 : 1);
    if (v > 9) v -= 9;
    sum += v;
  });
  const check = (10 - (sum % 10)) % 10;
  return check === last;
};

const formSchema = z.object({
  student_name: z.string().min(3, 'Ingresa tu nombre completo'),
  student_id_number: z.string(),
  student_email: z.string().email('Ingresa un correo electrónico válido'),
  student_phone: z.string(),
  student_city: z.string().min(3, 'Ingresa tu ciudad de residencia'),
});

const strictSchema = formSchema.extend({
  student_id_number: z.string().refine(val => validarCedulaEcuatoriana(val), {
    message: 'Número de cédula ecuatoriana no válido',
  }),
  student_phone: z.string().regex(/^09\d{8}$/, {
    message: 'El número debe ser ecuatoriano de 10 dígitos y empezar con 09',
  }),
});

type FormValues = z.infer<typeof formSchema>;

// -------------- Field Component ----------------
function Field({
  label,
  icon: Icon,
  error,
  children,
}: {
  label: string;
  icon: React.ElementType;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-on-surface-variant/50">
        <Icon size={13} />
        {label}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-error font-bold flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls = (hasError?: boolean) =>
  `w-full h-12 bg-surface-container-high border-none rounded-2xl px-5 font-bold text-sm text-on-surface placeholder:text-on-surface-variant/25 focus:ring-2 focus:ring-tertiary-fixed transition-all outline-none ${
    hasError ? 'ring-2 ring-error/30' : ''
  }`;

// -------------- Main Page ----------------
export default function PublicEnrollmentForm() {
  const { uuid } = useParams<{ uuid: string }>();
  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const [isValidationEnabled, setIsValidationEnabled] = useState(false);
  const [isInternational, setIsInternational] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ 
      resolver: zodResolver(isValidationEnabled && !isInternational ? strictSchema : formSchema) 
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const [enrollmentRes, settingsRes] = await Promise.all([
          getPublicEnrollment(uuid!),
          getEnrollmentValidationSetting()
        ]);
        
        setIsValidationEnabled(settingsRes.enabled);
        const data = enrollmentRes.data;
        setEnrollment(data);
        reset({
          student_name:      data.student_name || '',
          student_email:     data.student_email || '',
          student_phone:     data.student_phone || '',
          student_id_number: data.student_id_number || '',
          student_city:      data.student_city || '',
        });
      } catch {
        setErrorMsg('El enlace no es válido o ha expirado.');
      } finally {
        setLoading(false);
      }
    };
    if (uuid) fetch();
  }, [uuid, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      setErrorMsg('');
      const payload = { ...data };
      if (isInternational) {
        payload.student_phone = `${selectedCountry.prefix} ${data.student_phone}`;
      }
      await submitPublicEnrollment(uuid!, payload);
      setIsSuccess(true);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Ocurrió un error al procesar tu matrícula. Intenta de nuevo.');
    }
  };

  // ---- Loading Screen ----
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center flex-col gap-6">
        <div className="w-16 h-16 rounded-3xl bg-surface-container-low flex items-center justify-center">
          <Loader2 size={28} className="text-on-primary-container animate-spin" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40">
          Verificando enlace seguro...
        </p>
      </div>
    );
  }

  // ---- Invalid Link Screen ----
  if (errorMsg && !enrollment) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface-container-lowest rounded-[2.5rem] p-10 text-center shadow-2xl shadow-primary/10 ghost-border space-y-6">
          <div className="w-20 h-20 bg-error/10 rounded-3xl flex items-center justify-center mx-auto">
            <AlertCircle size={36} className="text-error" />
          </div>
          <div>
            <h1 className="font-headline font-extrabold text-2xl text-primary mb-2">Enlace Inválido</h1>
            <p className="text-sm text-on-surface-variant">{errorMsg}</p>
          </div>
          <div className="p-4 bg-surface-container-low rounded-2xl text-xs text-on-surface-variant/60">
            Si crees que esto es un error, comunícate con tu asesor académico.
          </div>
        </div>
      </div>
    );
  }

  // ---- Success Screen ----
  if (isSuccess || enrollment?.status === 'completed' || enrollment?.status === 'approved') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-surface-container-lowest rounded-[2.5rem] p-12 text-center shadow-2xl shadow-primary/10 ghost-border space-y-8 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-tertiary-fixed/10 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-tertiary-fixed/20 border-4 border-tertiary-fixed/30">
            <CheckCircle2 size={40} className="text-on-tertiary-container" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-primary-container mb-3">
              Proceso Completado
            </p>
            <h1 className="font-headline font-extrabold text-3xl text-primary tracking-tight mb-3 leading-tight">
              ¡Registro Exitoso!
            </h1>
            <p className="text-on-surface-variant leading-relaxed">
              Tu solicitud de matrícula para el programa{' '}
              <span className="font-bold text-primary">{enrollment?.course?.name}</span>{' '}
              ha sido registrada exitosamente.
            </p>
          </div>
          <div className="p-6 bg-surface-container-low rounded-2xl text-sm text-on-surface-variant/70 leading-relaxed">
            Tu asesor académico revisará tu información y se pondrá en contacto contigo pronto. Puedes cerrar esta ventana.
          </div>
        </div>
      </div>
    );
  }

  // ---- Main Form ----
  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      
      {/* Top AppBar */}
      <header className="fixed top-0 w-full z-50 flex items-center gap-3 px-6 h-16 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="p-2 bg-primary-container rounded-xl">
          <School size={20} className="text-tertiary-fixed" />
        </div>
        <h1 className="font-headline font-bold tracking-tight text-lg text-primary">
          Formulario de Matrícula — ICEP
        </h1>
      </header>

      <main className="pt-24 pb-28 px-4 max-w-[640px] mx-auto">

        {/* Editorial Intro */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-black tracking-[0.2em] uppercase text-on-primary-container">
              Instituto de Capacitación
            </span>
            <div className="h-px flex-1 bg-outline-variant/20" />
          </div>
          <h2 className="font-headline text-4xl font-extrabold text-primary leading-tight mb-3">
            Proceso de<br />
            <span className="text-on-primary-container">Admisión Oficial</span>
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Completa cuidadosamente los siguientes campos para formalizar tu solicitud de matrícula en{' '}
            <span className="font-bold text-primary">{enrollment?.course?.name}</span>.
          </p>
        </section>

        {/* Progress Indicator */}
        <div className="bg-surface-container-low rounded-2xl p-4 flex justify-between items-center mb-8">
          {[
            { n: '1', label: 'Personal', active: true },
            { n: '2', label: 'Contacto', active: false },
            { n: '3', label: 'Confirmar', active: false },
          ].map(({ n, label, active }, i) => (
            <>
              <div key={n} className="flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  active ? 'bg-tertiary-fixed text-on-tertiary-fixed shadow-md shadow-tertiary-fixed/30' : 'bg-surface-container-high text-on-surface-variant/40'
                }`}>{n}</div>
                <span className={`text-[10px] font-black uppercase tracking-wider ${active ? 'text-on-tertiary-fixed-variant' : 'text-on-surface-variant/30'}`}>{label}</span>
              </div>
              {i < 2 && <div className={`h-0.5 flex-1 mx-2 ${active ? 'bg-tertiary-fixed/30' : 'bg-surface-container-high'}`} />}
            </>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {errorMsg && (
            <div className="flex items-center gap-3 p-4 bg-error/10 text-error rounded-2xl text-sm font-bold border border-error/10">
              <AlertCircle size={20} className="shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Block 1: Personal */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 ghost-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                <User size={20} className="text-tertiary-fixed" />
              </div>
              <h3 className="font-headline text-lg font-bold text-primary">Datos Personales</h3>
            </div>
            <div className="space-y-5">
              <Field label="Nombre Completo" icon={User} error={errors.student_name?.message}>
                <input
                  type="text"
                  {...register('student_name')}
                  placeholder="Ej. Juan Pérez Quispe"
                  className={inputCls(!!errors.student_name)}
                />
              </Field>
              <Field label="Documento de Identidad (Cédula Ecuatoriana)" icon={CreditCard} error={errors.student_id_number?.message}>
                <input
                  type="text"
                  {...register('student_id_number')}
                  placeholder={isValidationEnabled ? "Ej. 1723456789" : "N° de documento"}
                  className={inputCls(!!errors.student_id_number)}
                  maxLength={isValidationEnabled ? 10 : 20}
                />
                {isValidationEnabled && (
                   <p className="text-[9px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-tighter">
                      Validación de cédula real habilitada
                   </p>
                )}
              </Field>
            </div>
          </div>

          {/* Block 2: Contact */}
          <div className="bg-surface-container-low rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center">
                <Mail size={20} className="text-on-primary-container" />
              </div>
              <h3 className="font-headline text-lg font-bold text-primary">Información de Contacto</h3>
            </div>
            <div className="space-y-5">
              <Field label="Correo Electrónico" icon={Mail} error={errors.student_email?.message}>
                <input
                  type="email"
                  {...register('student_email')}
                  placeholder="tucorreo@ejemplo.com"
                  className={inputCls(!!errors.student_email)}
                />
              </Field>
              <Field label="Teléfono / WhatsApp" icon={Phone} error={errors.student_phone?.message}>
                <div className="flex flex-col gap-3">
                   <div className="flex items-center gap-4 px-2">
                       <label className="flex items-center gap-2 cursor-pointer group">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${!isInternational ? 'bg-primary border-primary' : 'border-outline-variant group-hover:border-primary'}`}>
                             {!isInternational && <Check size={12} className="text-white" />}
                          </div>
                          <input type="radio" checked={!isInternational} onChange={() => setIsInternational(false)} className="sr-only" />
                          <span className="text-[10px] font-bold uppercase tracking-tight text-on-surface-variant">Ecuador (09...)</span>
                       </label>
                       <label className="flex items-center gap-2 cursor-pointer group">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isInternational ? 'bg-tertiary-fixed border-tertiary-fixed' : 'border-outline-variant group-hover:border-primary'}`}>
                             {isInternational && <Check size={12} className="text-white" />}
                          </div>
                          <input type="radio" checked={isInternational} onChange={() => setIsInternational(true)} className="sr-only" />
                          <span className="text-[10px] font-bold uppercase tracking-tight text-on-surface-variant">Internacional 🌎</span>
                       </label>
                   </div>

                   <div className="flex gap-2">
                      {isInternational && (
                         <div className="relative">
                            <button
                               type="button"
                               onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                               className="flex items-center gap-2 h-12 bg-surface-container-high rounded-2xl px-4 min-w-[140px] border-none hover:bg-surface-container-highest transition-all group"
                            >
                               <span className="text-xl leading-none flex-shrink-0">{selectedCountry.flag}</span>
                               <span className="font-bold text-[11px] text-on-surface flex-1 text-left">{selectedCountry.prefix}</span>
                               <ChevronDown size={14} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''} text-on-surface-variant/40`} />
                            </button>

                            {isDropdownOpen && (
                               <>
                                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                                  <div className="absolute top-14 left-0 w-64 max-h-64 bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/10 z-50 overflow-y-auto no-scrollbar py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                     {COUNTRIES.map(c => (
                                        <button
                                           key={c.code}
                                           type="button"
                                           onClick={() => {
                                              setSelectedCountry(c);
                                              setIsDropdownOpen(false);
                                           }}
                                           className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-all text-left ${selectedCountry.code === c.code ? 'bg-primary/5' : ''}`}
                                        >
                                           <span className="text-xl leading-none">{c.flag}</span>
                                           <div className="flex-1 min-w-0">
                                              <p className="text-[10px] font-black uppercase tracking-tight text-on-surface">{c.name}</p>
                                              <p className="text-[9px] font-bold text-on-surface-variant/60">{c.prefix}</p>
                                           </div>
                                           {selectedCountry.code === c.code && <Check size={14} className="text-primary" />}
                                        </button>
                                     ))}
                                  </div>
                               </>
                            )}
                         </div>
                      )}
                      <input
                        type="tel"
                        {...register('student_phone')}
                        placeholder={isInternational ? "Número completo" : "Ej. 0987654321"}
                        className={inputCls(!!errors.student_phone)}
                      />
                   </div>
                   {isInternational && (
                      <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-tighter ml-2">
                         {selectedCountry.name} ({selectedCountry.prefix})
                      </p>
                   )}
                </div>
              </Field>
              <Field label="Ciudad de Residencia" icon={MapPin} error={errors.student_city?.message}>
                <input
                  type="text"
                  {...register('student_city')}
                  placeholder="Riobamba, Quito, Guayaquil..."
                  className={inputCls(!!errors.student_city)}
                />
              </Field>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 py-2 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-outline-variant/10 text-xs font-bold text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-on-tertiary-container" />
              SSL Seguro
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-outline-variant/10 text-xs font-bold text-on-surface-variant">
              <ShieldCheck size={14} className="text-on-tertiary-container" />
              Datos Protegidos
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-outline-variant/10 text-xs font-bold text-on-surface-variant">
              <BookOpen size={14} className="text-on-primary-container" />
              Enlace Único
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-tertiary-fixed text-on-tertiary-fixed font-headline font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-tertiary-fixed/25 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Procesando Matrícula...
                </>
              ) : (
                <>
                  Confirmar Registro
                  <ArrowRight size={20} />
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-on-surface-variant/40 mt-4 uppercase tracking-[0.15em] font-bold">
              Al enviar, aceptas los términos y política de privacidad de ICEP
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
