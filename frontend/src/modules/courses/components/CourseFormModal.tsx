import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Course, createCourse, updateCourse, deleteCourse, STATUS_MAP } from '../services/courseService';
import { X, Upload, Loader2, Trash2, BookOpen } from 'lucide-react';
import api from '@/shared/services/api';
import { showSuccess, showError, showConfirmDanger } from '@/shared/utils/alerts';

interface Props {
    course: Course | null;
    canDelete: boolean | undefined;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CourseFormModal({ course, canDelete, onClose, onSuccess }: Props) {
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            name: course?.name || '',
            description: course?.description || '',
            price: course?.price ?? 0,
            status: course?.status || 'draft',
            start_date: course?.start_date ? course.start_date.slice(0, 10) : '',
            area_id: course?.area_id?.toString() || '',
        }
    });
    const [areas, setAreas] = useState<any[]>([]);
    const [coverPreview, setCoverPreview] = useState<string | null>(
        course?.cover_image ? `/storage/${course.cover_image}` : null
    );
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        api.get('/areas').then(r => setAreas(r.data.data || []));
    }, []);

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCoverFile(file);
            const reader = new FileReader();
            reader.onload = ev => setCoverPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (data: any) => {
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(data).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, v as any); });
            if (coverFile) fd.append('cover_image', coverFile);

            if (course) {
                await updateCourse(course.id, fd);
                showSuccess('Curso actualizado', 'Los cambios se guardaron correctamente.');
            } else {
                await createCourse(fd);
                showSuccess('Curso creado', 'El nuevo curso fue registrado exitosamente.');
            }
            onSuccess();
        } catch (e: any) {
            console.error(e.response?.data);
            showError('Error al guardar', e.response?.data?.message || 'Ocurrió un error inesperado.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!course) return;
        const confirmed = await showConfirmDanger('¿Eliminar este curso?', 'Esta acción es permanente y no se puede deshacer.');
        if (!confirmed) return;
        setDeleting(true);
        try {
            await deleteCourse(course.id);
            showSuccess('Curso eliminado', 'El curso fue eliminado permanentemente.');
            onSuccess();
        } catch (e: any) {
            showError('Error al eliminar', e.response?.data?.message || 'Ocurrió un error inesperado.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50/70 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-xl">
                            <BookOpen size={20} className="text-blue-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 font-primary">
                            {course ? 'Editar Curso' : 'Nuevo Curso'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Cover */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Imagen de Portada (16:9)</label>
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 hover:border-blue-400 transition group cursor-pointer"
                            onClick={() => document.getElementById('cover-upload')?.click()}>
                            {coverPreview ? (
                                <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
                                    <Upload size={32} />
                                    <span className="text-xs font-medium">Clic para subir imagen</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <Upload size={28} className="text-white" />
                            </div>
                        </div>
                        <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Nombre del Curso *</label>
                        <input type="text" {...register('name', { required: true })}
                            className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none focus:border-blue-500 font-medium transition"
                            placeholder="Ej. Seguridad del Paciente – Básico" />
                        {errors.name && <span className="text-xs text-red-500">Requerido</span>}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Descripción</label>
                        <textarea {...register('description')} rows={3}
                            className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none focus:border-blue-500 text-sm transition"
                            placeholder="Descripción general del curso..." />
                    </div>

                    {/* Price + Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Costo (S/)</label>
                            <input type="number" step="0.01" min="0" {...register('price')}
                                className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none focus:border-blue-500 font-medium transition" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Estado *</label>
                            <select {...register('status')}
                                className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none focus:border-blue-500 font-medium transition">
                                {Object.entries(STATUS_MAP).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Start date + Area */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Fecha de Inicio</label>
                            <input type="date" {...register('start_date')}
                                className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none focus:border-blue-500 font-medium transition" />
                            <p className="text-[10px] text-blue-500 mt-0.5">Se creará un evento en el Calendario automáticamente.</p>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Área</label>
                            <select {...register('area_id')}
                                className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none focus:border-blue-500 font-medium transition">
                                <option value="">Sin área</option>
                                {areas.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        {course && canDelete ? (
                            <button type="button" onClick={handleDelete} disabled={deleting}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition text-sm">
                                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                Eliminar
                            </button>
                        ) : <div />}
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">
                                Cancelar
                            </button>
                            <button type="submit" disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/30 transition">
                                {saving && <Loader2 size={16} className="animate-spin" />}
                                {course ? 'Actualizar' : 'Crear Curso'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
