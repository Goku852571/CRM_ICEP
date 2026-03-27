import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getPublicEnrollment, submitPublicEnrollment } from '../services/enrollmentService';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';

const formSchema = z.object({
  student_name: z.string().min(3, 'Ingresa tu nombre completo'),
  student_email: z.string().email('Ingresa un correo válido'),
  student_phone: z.string().min(7, 'Ingresa tu número de contacto'),
  student_id_number: z.string().min(5, 'Ingresa tu identificación'),
  student_city: z.string().min(3, 'Ingresa tu ciudad de residencia'),
});

type FormValues = z.infer<typeof formSchema>;

export default function PublicEnrollmentForm() {
  const { uuid } = useParams<{ uuid: string }>();
  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const fetchEnrollment = async () => {
      try {
        const data = await getPublicEnrollment(uuid!);
        setEnrollment(data.data);
        // Pre-fill fields if the advisor already put them
        reset({
          student_name: data.data.student_name || '',
          student_email: data.data.student_email || '',
          student_phone: data.data.student_phone || '',
        });
      } catch (error: any) {
        setErrorMsg('El enlace no es válido o ha expirado.');
      } finally {
        setLoading(false);
      }
    };
    if (uuid) fetchEnrollment();
  }, [uuid, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      setErrorMsg('');
      await submitPublicEnrollment(uuid!, data);
      setIsSuccess(true);
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Ocurrió un error al procesar tu matrícula');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 font-medium">Validando enlace seguro...</p>
      </div>
    );
  }

  if (errorMsg && !isSuccess && !enrollment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
          <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 border-none">Enlace Inválido</h1>
          <p className="text-gray-500">{errorMsg}</p>
          <div className="pt-6">
             <p className="text-xs text-gray-400">Si crees que esto es un error, contacta a tu asesor.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess || enrollment?.status === 'completed' || enrollment?.status === 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center space-y-6 animate-in zoom-in-95 duration-500 border border-green-50">
          <div className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex flex-col items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 size={48} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight font-primary">¡Proceso Completado!</h1>
          <p className="text-gray-600 text-lg">Tu matrícula para el curso <span className="font-bold text-gray-900 block mt-2 text-xl">{enrollment?.course?.name}</span> ha sido registrada.</p>
          <div className="bg-gray-50 p-4 rounded-2xl text-sm text-gray-500 mt-6 border border-gray-100">
             Tu asesor revisará la información y se pondrá en contacto contigo pronto. Puedes cerrar esta ventana.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 sm:p-8 font-primary">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full flex overflow-hidden animate-in fade-in duration-700">
        
        {/* Left Side: Course Info */}
        <div className="w-1/3 bg-blue-600 p-10 text-white flex flex-col justify-between hidden md:flex relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500 rounded-full opacity-50 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-700 rounded-full opacity-50 blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="bg-white/20 p-3 rounded-2xl w-max mb-8 backdrop-blur-md border border-white/20">
               <BookOpen size={32} />
            </div>
            <h2 className="text-sm font-bold tracking-widest uppercase text-blue-200 mb-2">Formulario de Matrícula</h2>
            <h1 className="text-3xl font-extrabold leading-tight mb-4">{enrollment?.course?.name}</h1>
            <p className="text-blue-100 text-lg leading-relaxed">Completa tus datos personales para finalizar tu proceso de registro y asegurar tu lugar.</p>
          </div>

          <div className="relative z-10 border-t border-blue-500/50 pt-6 mt-12">
             <p className="text-sm text-blue-200 line-clamp-3">Este enlace es único y seguro. Tus datos serán tratados de acuerdo con nuestra política de privacidad orientada a instituciones educativas.</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-2/3 p-8 sm:p-12 relative bg-white">
          <div className="md:hidden mb-8 text-center">
            <h2 className="text-sm font-bold tracking-widest uppercase text-blue-600 mb-1">Matrícula Estudiantil</h2>
            <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{enrollment?.course?.name}</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Tus Datos Personales</h2>
            <p className="text-gray-500 mt-1">Por favor, verifica que la información sea correcta.</p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-100 mb-6 flex items-center gap-3">
              <AlertCircle size={20} />
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Nombre Completo <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  {...register('student_name')}
                  placeholder="Ej: Juan Pérez Márquez"
                  className={`w-full border-2 rounded-xl p-3 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium text-gray-900 ${errors.student_name ? 'border-red-300 focus:border-red-500 bg-red-50/50' : 'border-gray-100 focus:border-blue-500 bg-gray-50 hover:bg-gray-100/50'}`}
                />
                {errors.student_name && <span className="text-xs text-red-500 font-bold mt-1.5 block">{errors.student_name.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Identificación (DNI/Cédula) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  {...register('student_id_number')}
                  placeholder="Número de documento"
                  className={`w-full border-2 rounded-xl p-3 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium text-gray-900 ${errors.student_id_number ? 'border-red-300 focus:border-red-500 bg-red-50/50' : 'border-gray-100 focus:border-blue-500 bg-gray-50 hover:bg-gray-100/50'}`}
                />
                {errors.student_id_number && <span className="text-xs text-red-500 font-bold mt-1.5 block">{errors.student_id_number.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Correo Electrónico <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  {...register('student_email')}
                  placeholder="tucorreo@ejemplo.com"
                  className={`w-full border-2 rounded-xl p-3 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium text-gray-900 ${errors.student_email ? 'border-red-300 focus:border-red-500 bg-red-50/50' : 'border-gray-100 focus:border-blue-500 bg-gray-50 hover:bg-gray-100/50'}`}
                />
                {errors.student_email && <span className="text-xs text-red-500 font-bold mt-1.5 block">{errors.student_email.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Teléfono / Celular <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  {...register('student_phone')}
                  placeholder="+52 123 456 7890"
                  className={`w-full border-2 rounded-xl p-3 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium text-gray-900 ${errors.student_phone ? 'border-red-300 focus:border-red-500 bg-red-50/50' : 'border-gray-100 focus:border-blue-500 bg-gray-50 hover:bg-gray-100/50'}`}
                />
                {errors.student_phone && <span className="text-xs text-red-500 font-bold mt-1.5 block">{errors.student_phone.message}</span>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Ciudad de Residencia <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  {...register('student_city')}
                  placeholder="Ej: Ciudad de México, Monterrey..."
                  className={`w-full border-2 rounded-xl p-3 outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium text-gray-900 ${errors.student_city ? 'border-red-300 focus:border-red-500 bg-red-50/50' : 'border-gray-100 focus:border-blue-500 bg-gray-50 hover:bg-gray-100/50'}`}
                />
                {errors.student_city && <span className="text-xs text-red-500 font-bold mt-1.5 block">{errors.student_city.message}</span>}
              </div>

            </div>

            <div className="pt-8 mt-8 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition transform hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-600/30 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {isSubmitting ? 'Procesando Matrícula...' : 'Confirmar Registro y Enviar'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
