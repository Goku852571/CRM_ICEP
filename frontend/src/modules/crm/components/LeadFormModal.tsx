import { useState, useEffect } from 'react';
import { X, Search, Phone, Mail, User, BookOpen, MapPin, Briefcase, Globe, Plus, ChevronRight } from 'lucide-react';
import { createLead, Lead } from '../services/leadService';
import { getCourses } from '@/modules/enrollments/services/enrollmentService';
import { showSuccess, showError } from '@/shared/utils/alerts';
import { useAuth } from '@/shared/hooks/useAuth';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function LeadFormModal({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<{ id: number; name: string }[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    id_number: '',
    profession: '',
    country: '',
    course_interest_id: '',
    source: 'manual',
    status: 'new'
  });

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await getCourses();
        setCourses(res.data);
      } catch (err) {
        console.error('Error fetching courses', err);
      }
    };
    fetchCourses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      showError('Error', 'Nombre y Teléfono son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        status: formData.status as any,
        course_interest_id: formData.course_interest_id ? parseInt(formData.course_interest_id) : null,
        email: formData.email || null,
        city: formData.city || null,
        id_number: formData.id_number || null,
        profession: formData.profession || null,
        country: formData.country || null,
      };

      await createLead(payload);
      showSuccess('Éxito', 'Lead creado correctamente');
      onSuccess();
    } catch (err) {
      showError('Error', 'No se pudo crear el lead en el servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b shrink-0 bg-surface-container-lowest">
          <div>
            <h2 className="text-xl font-headline font-bold text-primary flex items-center gap-2">
              <Plus className="text-secondary" /> Registro de Nuevo Lead
            </h2>
            <p className="text-xs font-medium text-on-surface-variant/70 mt-0.5">Asegúrese de capturar la mayor cantidad de información posible</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-xl transition text-on-surface-variant">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form id="lead-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1 flex items-center gap-2">
                <User size={12} /> Nombre Completo *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej: Juan Pérez"
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-primary tracking-widest px-1 flex items-center gap-2">
                <Phone size={12} /> Teléfono / WhatsApp *
              </label>
              <input
                type="text"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="+593 9..."
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest px-1 flex items-center gap-2">
                <Mail size={12} /> Correo Electrónico
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="correo@ejemplo.com"
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>

            {/* Course Interest */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest px-1 flex items-center gap-2">
                <BookOpen size={12} /> Curso de Interés
              </label>
              <select
                name="course_interest_id"
                value={formData.course_interest_id}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none"
              >
                <option value="">-- Seleccionar Curso --</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>
            </div>

            {/* ID Number */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest px-1 flex items-center gap-2">
                Identificación
              </label>
              <input
                type="text"
                name="id_number"
                value={formData.id_number}
                onChange={handleChange}
                placeholder="Cédula o Pasaporte"
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>

            {/* Profession */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest px-1 flex items-center gap-2">
                <Briefcase size={12} /> Profesión
              </label>
              <input
                type="text"
                name="profession"
                value={formData.profession}
                onChange={handleChange}
                placeholder="Ej: Abogado, Estudiante..."
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest px-1 flex items-center gap-2">
                <MapPin size={12} /> Ciudad
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Ej: Quito, Guayaquil..."
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>

            {/* Country */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-on-surface-variant tracking-widest px-1 flex items-center gap-2">
                <Globe size={12} /> País
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Ej: Ecuador"
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="p-4 bg-secondary-container/10 border border-secondary-container/20 rounded-2xl">
             <p className="text-[10px] font-black text-on-secondary-container/60 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <User size={10} strokeWidth={3} /> Asignación Automática
             </p>
             <p className="text-xs font-bold text-on-secondary-container italic">
                Este lead se asignará automáticamente a: <span className="text-primary">{user?.name}</span>
             </p>
          </div>

        </form>

        {/* Footer */}
        <div className="p-6 border-t shrink-0 flex justify-end gap-4 bg-surface-container-lowest">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-high transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="lead-form"
            disabled={loading}
            className="px-8 py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition disabled:opacity-50 flex items-center gap-3"
          >
            {loading ? 'CREANDO...' : 'REGISTRAR LEAD'}
            <ChevronRight size={18} strokeWidth={3} />
          </button>
        </div>

      </div>
    </div>
  );
}
