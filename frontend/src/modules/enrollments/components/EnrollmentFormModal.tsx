import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Course, createEnrollment } from '../services/enrollmentService';
import { useAuth } from '@/shared/hooks/useAuth';
import { X, UserPlus, Mail, Phone, BookOpen, Loader2, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { showSuccess, showError } from '@/shared/utils/alerts';

const formSchema = z.object({
  course_id: z.string().min(1, 'Debes seleccionar un curso'),
  student_name: z.string().optional(),
  student_email: z.string().email('Email inválido').optional().or(z.literal('')),
  student_phone: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  isOpen: boolean;
  courses: Course[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EnrollmentFormModal({ isOpen, courses, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      course_id: '',
      student_name: '',
      student_email: '',
      student_phone: '',
    }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      // Clean up empty strings
      const payload: any = {
        ...data,
        course_id: parseInt(data.course_id),
        advisor_id: user?.id,
      };
      if (!payload.student_email) delete payload.student_email;
      if (!payload.student_name) delete payload.student_name;
      if (!payload.student_phone) delete payload.student_phone;

      await createEnrollment(payload);
      showSuccess('Enlace Generado', 'El formulario de matrícula ha sido creado correctamente.');
      reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'No se pudo generar el enlace de matrícula.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-primary/20 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-xl shadow-2xl shadow-primary/20 overflow-hidden flex flex-col ghost-border animate-in zoom-in-95 duration-500">
        
        {/* Header Section */}
        <div className="px-10 py-8 bg-surface-container-low/30 border-b border-outline-variant/5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-tertiary-fixed text-on-tertiary-fixed rounded-2xl shadow-lg shadow-black/5">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="font-headline font-extrabold text-primary text-xl leading-none mb-1">
                Generar Enlace de Matrícula
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                Apertura de Expediente Académico Único
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-white border border-outline-variant/10 rounded-2xl text-on-surface-variant hover:bg-surface-container-high transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-10 space-y-8 overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-outline-variant/20">
          
          {/* Main Course Selection */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] flex items-center gap-2">
              <BookOpen size={14} /> Oferta Académica Destino
            </h3>
            <div className="relative group">
              <select
                {...register('course_id')}
                className={`w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-bold appearance-none focus:ring-4 focus:ring-primary/5 transition-all ${errors.course_id ? 'ring-2 ring-error/20' : ''}`}
              >
                <option value="">Selecciona el programa académico...</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/30">
                <ArrowRight size={18} className="rotate-90" />
              </div>
            </div>
            {errors.course_id && <p className="text-error text-[10px] font-black uppercase tracking-widest mt-2">{errors.course_id.message}</p>}
          </div>

          <div className="h-px bg-outline-variant/10" />

          {/* Student Intelligence Section */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] flex items-center gap-2">
              <Sparkles size={14} /> Inteligencia de Prospecto (Opcional)
            </h3>
            
            <div className="grid gap-6">
              <div className="relative group">
                <span className="absolute left-5 top-[18px] text-on-surface-variant/30 group-focus-within:text-primary transition-colors">
                  <UserPlus size={18} />
                </span>
                <input
                  type="text"
                  {...register('student_name')}
                  placeholder="Nombre Completo del Postulante"
                  className="w-full pl-14 pr-6 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-bold placeholder:text-on-surface-variant/20 focus:ring-4 focus:ring-primary/5 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative group">
                  <span className="absolute left-5 top-[18px] text-on-surface-variant/30 group-focus-within:text-primary transition-colors">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    {...register('student_email')}
                    placeholder="Email de Contacto"
                    className={`w-full pl-14 pr-6 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-bold placeholder:text-on-surface-variant/20 focus:ring-4 focus:ring-primary/5 transition-all ${errors.student_email ? 'ring-2 ring-error/20' : ''}`}
                  />
                  {errors.student_email && <p className="text-error text-[10px] font-black uppercase tracking-widest mt-2">{errors.student_email.message}</p>}
                </div>

                <div className="relative group">
                  <span className="absolute left-5 top-[18px] text-on-surface-variant/30 group-focus-within:text-primary transition-colors">
                    <Phone size={18} />
                  </span>
                  <input
                    type="text"
                    {...register('student_phone')}
                    placeholder="Teléfono/WhatsApp"
                    className="w-full pl-14 pr-6 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-bold placeholder:text-on-surface-variant/20 focus:ring-4 focus:ring-primary/5 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Institutional Note */}
          <div className="p-6 bg-tertiary-fixed/5 rounded-3xl border border-dashed border-tertiary-fixed/20 flex gap-4 items-start">
             <CheckCircle2 size={20} className="text-tertiary-fixed shrink-0 mt-1" />
             <p className="text-[10px] font-medium text-on-surface-variant opacity-60 leading-relaxed uppercase tracking-tight">
               Al generar el enlace, se creará un registro de seguimiento en estado "Pendiente". El asesor académico será notificado una vez que el estudiante complete el formulario.
             </p>
          </div>
        </form>

        <div className="p-10 bg-surface-container-low/30 border-t border-outline-variant/5 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-8 py-5 bg-white ghost-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-high transition-all active:scale-95"
          >
            Abortar
          </button>
          <button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="flex-1 px-8 py-5 bg-primary rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>Autorizar Expediente Academia</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
