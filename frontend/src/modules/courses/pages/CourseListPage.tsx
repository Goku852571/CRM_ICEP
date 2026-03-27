import { useState, useEffect } from 'react';
import { getCourses, Course, STATUS_MAP } from '../services/courseService';
import { useAuth } from '@/shared/hooks/useAuth';
import { Plus, Search, BookOpen, DollarSign, CalendarDays, Tag } from 'lucide-react';
import CourseFormModal from '../components/CourseFormModal';
import CourseDetailModal from '../components/CourseDetailModal';

export default function CourseListPage() {
    const { user } = useAuth();
    const isJefe = user?.roles?.some((r: any) => r.name.toLowerCase().includes('jefe') || r.name === 'admin');
    const canDelete = user?.roles?.some((r: any) => r.name === 'admin');

    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editCourse, setEditCourse] = useState<Course | null>(null);
    const [detailId, setDetailId] = useState<number | null>(null);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const data = await getCourses({ search, status: statusFilter });
            setCourses(data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCourses(); }, [search, statusFilter]);

    const handleEdit = (c: Course) => { setEditCourse(c); setFormOpen(true); };
    const handleNew  = () => { setEditCourse(null); setFormOpen(true); };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-primary">Módulo de Cursos</h1>
                    <p className="text-sm text-gray-500 mt-1">Gestión centralizada de la oferta académica de ICEP</p>
                </div>
                {isJefe && (
                    <button onClick={handleNew} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition font-medium shadow-md shadow-blue-500/20 whitespace-nowrap">
                        <Plus size={18} /> Nuevo Curso
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar curso..."
                        className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="">Todos los estados</option>
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
            ) : courses.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
                    <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
                    <p className="text-gray-400">No hay cursos creados aún.</p>
                    {isJefe && <button onClick={handleNew} className="mt-4 text-blue-600 font-bold hover:underline text-sm">+ Crear primer curso</button>}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {courses.map(course => {
                        const status = STATUS_MAP[course.status];
                        const coverUrl = course.cover_image
                            ? `/storage/${course.cover_image}`
                            : null;
                        return (
                            <div
                                key={course.id}
                                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer flex flex-col"
                                onClick={() => setDetailId(course.id)}
                            >
                                {/* Cover */}
                                <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden relative">
                                    {coverUrl ? (
                                        <img src={coverUrl} alt={course.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <BookOpen size={40} className="text-blue-200" />
                                        </div>
                                    )}
                                    <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full ${status.color}`}>
                                        {status.label}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="p-4 flex flex-col flex-1 gap-2">
                                    <h3 className="font-bold text-gray-900 leading-tight line-clamp-2 group-hover:text-blue-700 transition-colors">{course.name}</h3>
                                    {course.description && (
                                        <p className="text-xs text-gray-500 line-clamp-2">{course.description}</p>
                                    )}
                                    <div className="flex flex-col gap-1 mt-auto pt-3 border-t border-gray-50">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <DollarSign size={12} className="text-green-500 flex-shrink-0" />
                                            <span className="font-semibold text-gray-700">S/ {Number(course.price).toFixed(2)}</span>
                                        </div>
                                        {course.start_date && (
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <CalendarDays size={12} className="text-blue-500 flex-shrink-0" />
                                                <span>Inicio: {new Date(course.start_date).toLocaleDateString('es-PE')}</span>
                                            </div>
                                        )}
                                        {course.area && (
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <Tag size={12} className="text-purple-500 flex-shrink-0" />
                                                <span>{course.area.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions for jefe */}
                                {isJefe && (
                                    <div className="px-4 pb-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => handleEdit(course)} className="flex-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 py-2 rounded-xl transition">
                                            Editar
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {formOpen && (
                <CourseFormModal
                    course={editCourse}
                    canDelete={canDelete}
                    onClose={() => setFormOpen(false)}
                    onSuccess={() => { setFormOpen(false); fetchCourses(); }}
                />
            )}
            {detailId && (
                <CourseDetailModal
                    courseId={detailId}
                    isJefe={!!isJefe}
                    canEdit={!!isJefe}
                    onClose={() => setDetailId(null)}
                    onEdit={(c: Course) => { setDetailId(null); handleEdit(c); }}
                />
            )}
        </div>
    );
}
