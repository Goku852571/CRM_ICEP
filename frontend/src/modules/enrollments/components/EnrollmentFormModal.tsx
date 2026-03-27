import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Course, createEnrollment } from '../services/enrollmentService';
import { useAuth } from '@/shared/hooks/useAuth';
import { X } from 'lucide-react';

const formSchema = z.object({
  course_id: z.string().min(1, 'Debes seleccionar un curso'),
  student_name: z.string().optional(),
  student_email: z.string().email('Email inválido').optional().or(z.literal('')),
  student_phone: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  courses: Course[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EnrollmentFormModal({ courses, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setApiError('');
      // Clean up empty strings
      const payload = {
        ...data,
        course_id: parseInt(data.course_id),
        advisor_id: user?.id,
      };
      if (!payload.student_email) delete payload.student_email;
      if (!payload.student_name) delete payload.student_name;
      if (!payload.student_phone) delete payload.student_phone;

      await createEnrollment(payload);
      onSuccess();
    } catch (error: any) {
      setApiError(error.response?.data?.message || 'Error al crear el formulario');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold font-primary text-gray-900">Generar Enlace de Matrícula</h2>
            <p className="text-xs text-gray-500 mt-1">Crea un formulario único para el estudiante</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-xl transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {apiError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100">
              {apiError}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Curso a Matricular <span className="text-red-500">*</span></label>
            <select
              {...register('course_id')}
              className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-100 transition-colors ${errors.course_id ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
            >
              <option value="">Selecciona un curso...</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.course_id && <span className="text-xs text-red-500 font-medium mt-1 inline-block">{errors.course_id.message}</span>}
          </div>

          <div className="pt-2 border-t border-gray-100">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Datos Iniciales (Opcional)</h3>
             <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Estudiante</label>
                  <input
                    type="text"
                    {...register('student_name')}
                    placeholder="Ej: Juan Pérez"
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      {...register('student_email')}
                      placeholder="Correo electrónico"
                      className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-colors text-sm ${errors.student_email ? 'border-red-500' : 'border-gray-200'}`}
                    />
                    {errors.student_email && <span className="text-xs text-red-500 font-medium mt-1 inline-block">{errors.student_email.message}</span>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                    <input
                      type="text"
                      {...register('student_phone')}
                      placeholder="Número whatsapp"
                      className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors text-sm"
                    />
                  </div>
                </div>
             </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isSubmitting ? 'Generando...' : 'Generar Enlace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
