import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourses, deleteCourse, updateCourseStatus, Course } from '../services/courseService';
import CourseFormModal from '../components/CourseFormModal';
import CourseDetailModal from '../components/CourseDetailModal';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  BookOpen,
  Users,
  Clock,
  Layers,
  Search as SearchIcon,
  Filter,
  Sparkles,
  TrendingUp,
  Activity,
  Zap,
  Ticket
} from 'lucide-react';
import { showConfirmDanger, showSuccess, showError, showToast } from '@/shared/utils/alerts';
import { useAuth } from '@/shared/hooks/useAuth';

export default function CourseListPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['courses', searchTerm, statusFilter],
    queryFn: () => getCourses({ search: searchTerm, status: statusFilter }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      showSuccess('Eliminado', 'El curso ha sido eliminado correctamente.');
    },
    onError: () => showError('Error', 'No se pudo eliminar el curso.'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'active' | 'inactive' }) =>
      updateCourseStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      showToast('success', 'Estado del curso actualizado.');
    },
  });

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirmDanger(
      '¿Eliminar curso?',
      'Esta acción no se puede deshacer y podría afectar a las matrículas existentes.'
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (course: Course) => {
    setSelectedCourse(course);
    setIsFormModalOpen(true);
  };

  const handleViewDetails = (course: Course) => {
    setSelectedCourse(course);
    setIsDetailModalOpen(true);
  };

  const courses = data?.data || [];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Hero Header Section */}
      <div className="max-w-4xl">
        <h1 className="font-headline font-extrabold text-primary text-4xl md:text-5xl lg:text-6xl mb-3 tracking-tight leading-[1.1]">
          Catálogo de Cursos
        </h1>
        <p className="text-on-surface-variant font-body text-base md:text-lg leading-relaxed opacity-80">
          Gestiona y organiza el currículo académico institucional para el semestre actual.
        </p>
      </div>

      {/* Stats Bento Grid - Dashboard Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Cursos Totales', val: courses.length, icon: BookOpen, color: 'text-primary group-hover:text-white transition-colors duration-300', bg: 'bg-primary/5' },
          { label: 'Cursos Activos', val: courses.filter((c: Course) => c.status === 'active').length, icon: CheckCircle2, color: 'text-tertiary-fixed-dim', bg: 'bg-tertiary-fixed/5' },
          { label: 'En Pausa', val: courses.filter((c: Course) => c.status === 'inactive').length, icon: XCircle, color: 'text-error', bg: 'bg-error/5' },
          { label: 'Especializaciones', val: courses.filter((c: Course) => c.description?.toLowerCase().includes('especialización')).length, icon: Sparkles, color: 'text-on-secondary-container', bg: 'bg-secondary-container/20' },
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
                +2.4%
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4">
        {/* Search & Global Actions */}
        <div className="relative w-full md:w-[450px] group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
            <SearchIcon size={20} />
          </div>
          <input
            type="text"
            placeholder="Buscar por título, código o área..."
            className="w-full pl-14 pr-6 py-5 bg-surface-container-low border-none rounded-[2rem] focus:ring-4 focus:ring-primary/5 text-sm font-bold transition-all placeholder:text-on-surface-variant/20 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mr-2">
          <Filter size={14} />
          <span>Filtrar:</span>
        </div>
        <button
          onClick={() => setStatusFilter('')}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${statusFilter === '' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-dim'
            }`}
        >
          Todos
        </button>
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${statusFilter === 'active' ? 'bg-tertiary-fixed text-on-tertiary-fixed shadow-lg shadow-tertiary-fixed/20' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-dim'
            }`}
        >
          Activos
        </button>
        <button
          onClick={() => setStatusFilter('inactive')}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${statusFilter === 'inactive' ? 'bg-error text-white shadow-lg shadow-error/20' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-dim'
            }`}
        >
          Inactivos
        </button>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-surface-container-low h-[450px] rounded-3xl animate-pulse" />
          ))
        ) : courses.length > 0 ? (
          courses.map((course: Course) => (
            <div
              key={course.id}
              className="bg-surface-container-lowest group hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-3xl overflow-hidden ghost-border flex flex-col"
            >
              {/* Image Container */}
              <div className="h-56 relative overflow-hidden">
                <img
                  src={course.cover_image ? `/storage/${course.cover_image}` : 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=800'}
                  alt={course.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 right-4">
                  <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm border border-outline-variant/10">
                    <div className={`w-1.5 h-1.5 rounded-full ${course.status === 'active' ? 'bg-tertiary-fixed-dim' : 'bg-error'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface">
                      {course.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content Container */}
              <div className="p-8 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold text-on-primary-container bg-secondary-container px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    {course.code || 'EDU-BASE'}
                  </span>
                  <div className="flex items-center gap-1.5 text-on-surface-variant opacity-60">
                    <Users size={14} />
                    <span className="text-[11px] font-bold uppercase tracking-tighter">124 EST.</span>
                  </div>
                </div>

                <h3 className="font-headline text-2xl font-bold text-primary mb-4 group-hover:text-on-primary-container transition-colors leading-tight">
                  {course.name}
                </h3>

                <p className="text-sm text-on-surface-variant/70 line-clamp-2 mb-6 font-body leading-relaxed">
                  {course.description}
                </p>

                <div className="flex items-center gap-6 text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-widest mt-auto mb-8">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-primary/30" />
                    <span>16 SEMANAS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-primary/30" />
                    <span>PREGRADO</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-outline-variant/10">
                  <button
                    onClick={() => handleViewDetails(course)}
                    className="flex-1 py-3.5 rounded-xl border-2 border-outline-variant/20 text-primary font-bold text-xs uppercase tracking-widest hover:bg-surface-container-low transition-all active:scale-95"
                  >
                    Detalles
                  </button>
                  {hasPermission('courses.edit') && (
                    <button
                      onClick={() => handleEdit(course)}
                      className="p-3.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
                    >
                      <Edit size={18} />
                    </button>
                  )}
                  {hasPermission('courses.delete') && (
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="p-3.5 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-all active:scale-95"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full h-80 bg-surface-container-low/30 rounded-3xl border-2 border-dashed border-outline-variant/20 flex flex-col items-center justify-center text-center p-12">
            <div className="p-4 bg-white rounded-full shadow-sm mb-4">
              <BookOpen size={32} className="text-primary/30" />
            </div>
            <h3 className="font-headline font-bold text-xl text-primary mb-2">No se encontraron cursos</h3>
            <p className="text-on-surface-variant text-sm">Ajusta tus filtros de búsqueda o crea un nuevo curso.</p>
          </div>
        )}

        {/* Add Card Placeholder */}
        {hasPermission('courses.create') && (
          <button
            onClick={() => {
              setSelectedCourse(null);
              setIsFormModalOpen(true);
            }}
            className="bg-surface-container-low/50 border-2 border-dashed border-outline-variant/40 rounded-3xl flex flex-col items-center justify-center p-12 text-center group cursor-pointer hover:bg-surface-container-high/50 hover:border-primary/30 transition-all duration-300 min-h-[500px]"
          >
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl shadow-primary/5 mb-6 group-hover:scale-110 group-hover:rotate-90 transition-all duration-500">
              <Plus size={32} className="text-on-primary-container" />
            </div>
            <p className="font-headline font-extrabold text-2xl text-primary tracking-tight">Agregar Nuevo Curso</p>
            <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mt-4 max-w-[200px] leading-relaxed">
              Empieza a redactar un nuevo programa académico.
            </p>
          </button>
        )}
      </div>

      {/* Floating Action Button for Mobile */}
      {hasPermission('courses.create') && (
        <button
          onClick={() => {
            setSelectedCourse(null);
            setIsFormModalOpen(true);
          }}
          className="lg:hidden fixed bottom-8 right-8 w-16 h-16 bg-tertiary-fixed text-on-tertiary-fixed rounded-2xl shadow-2xl shadow-tertiary-fixed/40 flex items-center justify-center transition-all hover:scale-110 active:scale-90 z-50 animate-bounce"
        >
          <Plus size={32} />
        </button>
      )}

      {/* Modals */}
      {isFormModalOpen && (
        <CourseFormModal
          course={selectedCourse}
          canDelete={hasPermission('courses.delete')}
          onClose={() => setIsFormModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            setIsFormModalOpen(false);
          }}
        />
      )}

      {isDetailModalOpen && selectedCourse && (
        <CourseDetailModal
          courseId={selectedCourse.id}
          isJefe={hasPermission('courses.edit')}
          canEdit={hasPermission('courses.edit')}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedCourse(null);
          }}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
}
