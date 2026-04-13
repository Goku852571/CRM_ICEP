import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import clsx from 'clsx';
import { Course, createCourse, updateCourse, deleteCourse, STATUS_MAP } from '../services/courseService';
import { X, Upload, Loader2, Trash2, BookOpen, MapPin, Clock, CreditCard, Tag, Award, ShieldCheck, CheckSquare, Plus, Trash, Activity, Image as ImageIcon, Calendar, Timer, FileText, Link2 } from 'lucide-react';
import api from '@/shared/services/api';
import { showSuccess, showError, showConfirmDanger } from '@/shared/utils/alerts';

interface Props {
    course: Course | null;
    canDelete: boolean | undefined;
    onClose: () => void;
    onSuccess: () => void;
}

const DURATION_UNITS = [
    { value: 'horas', label: 'Horas' },
    { value: 'días', label: 'Días' },
    { value: 'semanas', label: 'Semanas' },
    { value: 'meses', label: 'Meses' },
];

const DAYS_OF_WEEK = [
    { id: 'lun', label: 'Lu', full: 'Lunes' },
    { id: 'mar', label: 'Ma', full: 'Martes' },
    { id: 'mie', label: 'Mi', full: 'Miércoles' },
    { id: 'jue', label: 'Ju', full: 'Jueves' },
    { id: 'vie', label: 'Vi', full: 'Viernes' },
    { id: 'sab', label: 'Sa', full: 'Sábado' },
    { id: 'dom', label: 'Do', full: 'Domingo' },
];

export default function CourseFormModal({ course, canDelete, onClose, onSuccess }: Props) {
    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
        defaultValues: {
            name: course?.name || '',
            description: course?.description || '',
            price: course?.price ?? 0,
            status: course?.status || 'draft',
            start_date: course?.start_date ? course.start_date.slice(0, 10) : '',
            area_id: course?.area_id?.toString() || '',
            practice_city: course?.practice_city || '',
            duration: course?.duration || '',
            duration_value: course?.duration ? (course.duration.match(/\d+/) || [''])[0] : '',
            duration_unit: course?.duration ? (course.duration.match(/[a-zA-Záéíóúñ]+/) || ['horas'])[0].toLowerCase() : 'horas',
            // fields added for specific payment plans 
            enrollment_value: course?.enrollment_value ?? 0,
            installments_count: course?.installments_count ?? 3,
            installment_value: course?.installment_value ?? 0,
            min_price: course?.min_price ?? 0,
            discount: course?.discount ?? 0,
            min_installment_value: course?.min_installment_value ?? 0,
        }
    });

    const watchedPrice = watch('price');
    const watchedMinPrice = watch('min_price');
    const watchedDiscount = watch('discount');
    const watchedInstallmentsCount = watch('installments_count');

    // Auto-sync and calculation logic
    useEffect(() => {
        const price = parseFloat(watchedPrice as any) || 0;
        const minPrice = parseFloat(watchedMinPrice as any) || 0;
        const discount = parseFloat(watchedDiscount as any) || 0;
        const count = parseInt(watchedInstallmentsCount as any) || 0;

        // Requirement: registration value (enrollment_value) MUST be the same as reference price
        setValue('enrollment_value', price);

        // Requirement: installments defined automatically taking price as indicator
        if (count > 0) {
            const calculatedValue = price / count;
            const calculatedMinVal = minPrice / count;
            
            setValue('installment_value', Number(calculatedValue.toFixed(2)));
            setValue('min_installment_value', Number(calculatedMinVal.toFixed(2)));
        } else {
            setValue('installment_value', 0);
            setValue('min_installment_value', 0);
        }
    }, [watchedPrice, watchedMinPrice, watchedDiscount, watchedInstallmentsCount, setValue]);

    const [schedules, setSchedules] = useState<string[]>(course?.schedules || []);
    const [practiceCities, setPracticeCities] = useState<string[]>(Array.isArray(course?.practice_city) ? course.practice_city : []);
    const [cityInput, setCityInput] = useState('');
    const [allKnownCities, setAllKnownCities] = useState<string[]>([]);
    
    // Schedule builder state
    const [isAddingSchedule, setIsAddingSchedule] = useState(false);
    const [tempSchedule, setTempSchedule] = useState({
        days: [] as string[],
        start: '08:00',
        end: '14:00'
    });

    // Catalog fields
    const [catalogItems, setCatalogItems] = useState<any[]>([]);
    const [selectedCatalogIds, setSelectedCatalogIds] = useState<number[]>(course?.catalog_items?.map((i: any) => i.id) || []);
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);

    const [areas, setAreas] = useState<any[]>([]);
    const [coverPreview, setCoverPreview] = useState<string | null>(
        course?.cover_image ? `/storage/${course.cover_image}` : null
    );
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Attachments state
    const [tempAttachments, setTempAttachments] = useState<any[]>(course?.attachments || []);
    const [attType, setAttType] = useState<'file' | 'url'>('file');
    const [attName, setAttName] = useState('');
    const [attUrl, setAttUrl] = useState('');
    const [attFile, setAttFile] = useState<File | null>(null);

    useEffect(() => {
        api.get('/areas').then(r => setAreas(r.data.data || []));
        api.get('/course-catalog', { params: { active_only: true } }).then(r => setCatalogItems(r.data.data || []));
        
        api.get('/courses').then(r => {
            const cities = new Set<string>();
            r.data.data.forEach((c: any) => {
                if (Array.isArray(c.practice_city)) c.practice_city.forEach((cit: string) => cities.add(cit));
                else if (c.practice_city) cities.add(c.practice_city);
            });
            setAllKnownCities(Array.from(cities).sort());
        });
    }, []);

    const toggleCatalogId = (id: number) => {
        setSelectedCatalogIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const addStructuredSchedule = () => {
        if (tempSchedule.days.length === 0) return;
        if (tempSchedule.end <= tempSchedule.start) {
            showError('Horario inválido', 'La hora de fin debe ser posterior a la de inicio.');
            return;
        }
        const daysLabel = tempSchedule.days.length === 7 
            ? 'Todos los días' 
            : tempSchedule.days.length === 5 && tempSchedule.days.every(d => ['lun','mar','mie','jue','vie'].includes(d))
                ? 'Lunes a Viernes'
                : tempSchedule.days.map(d => DAYS_OF_WEEK.find(dw => dw.id === d)?.full).join(', ');
        const scheduleStr = `${daysLabel} (${tempSchedule.start} - ${tempSchedule.end})`;
        setSchedules([...schedules, scheduleStr]);
        setIsAddingSchedule(false);
        setTempSchedule({ days: [], start: '08:00', end: '14:00' });
    };

    const toggleDay = (day: string) => {
        setTempSchedule(prev => ({
            ...prev,
            days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
        }));
    };

    const handleStartTimeChange = (newStart: string) => {
        setTempSchedule(prev => {
            const [hours, mins] = newStart.split(':').map(Number);
            const endHours = (hours + 1) % 24;
            const formattedEnd = `${String(endHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
            return { ...prev, start: newStart, end: formattedEnd };
        });
    };

    const addCity = (city: string) => {
        const cleanCity = city.trim().toUpperCase();
        if (!cleanCity || practiceCities.includes(cleanCity)) {
            setCityInput('');
            setShowCitySuggestions(false);
            return;
        }
        setPracticeCities([...practiceCities, cleanCity]);
        if (!allKnownCities.includes(cleanCity)) setAllKnownCities([...allKnownCities, cleanCity].sort());
        setCityInput('');
        setShowCitySuggestions(false);
    };

    const removeCityFromSuggestions = (city: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setAllKnownCities(prev => prev.filter(c => c !== city));
    };

    const removeCityFromKnown = (city: string) => {
        setAllKnownCities(allKnownCities.filter(c => c !== city));
        setPracticeCities(practiceCities.filter(c => c !== city));
    };

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
            const finalDuration = data.duration_value ? `${data.duration_value} ${data.duration_unit}` : data.duration;
            Object.entries(data).forEach(([k, v]) => { 
                if (k === 'duration' || k === 'duration_value' || k === 'duration_unit') return;
                if (v !== '' && v !== null && v !== undefined) fd.append(k, v as any); 
            });
            fd.append('duration', finalDuration);
            if (coverFile) fd.append('cover_image', coverFile);
            fd.append('schedules', JSON.stringify(schedules));
            fd.append('practice_city', JSON.stringify(practiceCities));
            fd.append('catalog_items', JSON.stringify(selectedCatalogIds));

            let savedCourse: any;
            if (course) {
                const res = await updateCourse(course.id, fd);
                savedCourse = res.data.data;
                showSuccess('Curso actualizado', 'Los cambios se guardaron correctamente.');
            } else {
                const res = await createCourse(fd);
                savedCourse = res.data.data;
                showSuccess('Curso creado', 'El nuevo curso fue registrado exitosamente.');
            }

            if (!course) {
                for (const att of tempAttachments) {
                    const attFd = new FormData();
                    attFd.append('name', att.name);
                    attFd.append('type', att.type);
                    if (att.type === 'file') attFd.append('file', att.file);
                    else attFd.append('url', att.url);
                    await api.post(`/courses/${savedCourse.id}/attachments`, attFd);
                }
            }
            onSuccess();
        } catch (e: any) {
            showError('Error al guardar', e.response?.data?.message || 'Ocurrió un error inesperado.');
        } finally { setSaving(false); }
    };

    const addAttachment = async () => {
        if (!attName.trim()) {
            showError('Campo requerido', 'Ingresa un nombre para el recurso.');
            return;
        }

        let finalUrl = attUrl.trim();
        if (attType === 'url') {
            if (!finalUrl) {
                showError('URL faltante', 'Por favor ingresa un enlace.');
                return;
            }
            // Auto-fix protocol if missing
            if (!/^https?:\/\//i.test(finalUrl)) {
                finalUrl = 'https://' + finalUrl;
            }
        }

        if (attType === 'file') {
            if (!attFile) {
                showError('Archivo faltante', 'Por favor selecciona un archivo local.');
                return;
            }
            // Max 20MB check
            if (attFile.size > 20 * 1024 * 1024) {
                showError('Archivo muy grande', 'El archivo no debe exceder los 20MB.');
                return;
            }
        }

        if (course) {
            const fd = new FormData();
            fd.append('name', attName.trim());
            fd.append('type', attType);
            
            if (attType === 'file' && attFile) {
                fd.append('file', attFile);
            } else {
                fd.append('url', finalUrl);
            }

            try {
                const res = await api.post(`/courses/${course.id}/attachments`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setTempAttachments([...tempAttachments, res.data.data]);
                showSuccess('Recurso cargado', 'El archivo se vinculó al curso.');
                setAttName(''); setAttFile(null); setAttUrl('');
            } catch (err: any) { 
                const msg = err.response?.data?.errors 
                    ? Object.values(err.response.data.errors).flat().join(' ')
                    : (err.response?.data?.message || 'No se pudo cargar el archivo.');
                showError('Error de validación', msg); 
            }
        } else {
            setTempAttachments([...tempAttachments, { 
                id: Date.now(), 
                name: attName, 
                type: attType, 
                file: attFile, 
                url: finalUrl,
                fileName: attFile?.name
            }]);
            setAttName(''); setAttFile(null); setAttUrl('');
        }
    };

    const removeAttachment = async (id: number) => {
        if (course) {
            try {
                await api.delete(`/courses/${course.id}/attachments/${id}`);
                setTempAttachments(tempAttachments.filter(a => a.id !== id));
            } catch (err) { showError('Error', 'No se pudo eliminar el recurso.'); }
        } else { setTempAttachments(tempAttachments.filter(a => a.id !== id)); }
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
        } finally { setDeleting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50/70 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-xl"><BookOpen size={20} className="text-blue-600" /></div>
                        <h2 className="text-lg font-bold text-gray-900">{course ? 'Editar Curso' : 'Nuevo Curso'}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Imagen de Portada (16:9)</label>
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 hover:border-blue-400 transition cursor-pointer" onClick={() => document.getElementById('cover-upload')?.click()}>
                            {coverPreview ? <img src={coverPreview} className="w-full h-full object-cover" /> : <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2"><Upload size={32} /></div>}
                        </div>
                        <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Nombre del Curso *</label>
                        <input type="text" {...register('name', { required: true })} className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none focus:border-blue-500 font-medium transition" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Precio Mínimo de Venta (S/)</label>
                            <input type="number" step="0.01" {...register('min_price')} className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none focus:border-blue-500 font-medium transition" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Precio de Referencia / Lista (S/)</label>
                            <input type="number" step="0.01" {...register('price')} className="w-full border-2 border-blue-500/20 bg-blue-50/20 rounded-xl p-3 outline-none focus:border-blue-500 font-bold transition" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Estado del Registro *</label>
                            <select {...register('status')} className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none focus:border-blue-500 font-medium transition">
                                {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Descuento Global (%)</label>
                            <input type="number" {...register('discount')} className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none focus:border-blue-500 font-medium transition" />
                            {parseFloat(watchedDiscount as any) > 0 && (
                                <p className={clsx(
                                    "text-[9px] font-bold mt-1 uppercase tracking-tighter",
                                    (parseFloat(watchedPrice as any) * (1 - parseFloat(watchedDiscount as any) / 100)) < parseFloat(watchedMinPrice as any) 
                                        ? "text-red-500 animate-pulse" 
                                        : "text-emerald-500"
                                )}>
                                    Valor final: S/ {(parseFloat(watchedPrice as any) * (1 - parseFloat(watchedDiscount as any) / 100)).toFixed(2)}
                                    {(parseFloat(watchedPrice as any) * (1 - parseFloat(watchedDiscount as any) / 100)) < parseFloat(watchedMinPrice as any) && " - ¡ADVERTENCIA: INFERIOR AL MÍNIMO!"}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-200/50 p-6 rounded-[2rem] space-y-5 shadow-inner">
                        <h3 className="text-xs font-black uppercase text-indigo-900 tracking-widest flex items-center gap-2"><CreditCard size={16} /> Configuración del Plan de Pagos</h3>
                        <p className="text-[10px] text-indigo-600/60 font-medium -mt-2">Define la matrícula y cuotas. El valor de cuota se calculará según el Precio de Referencia.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-black uppercase tracking-wider text-indigo-700/70 ml-1">Valor Venta / Matrícula (S/)</label>
                                <div className="relative group">
                                    <input type="number" step="0.01" {...register('enrollment_value')} className="w-full bg-indigo-50/30 border border-indigo-100 rounded-2xl p-4 outline-none font-bold text-sm text-indigo-600 cursor-not-allowed transition-all" readOnly />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="p-1 px-2 bg-indigo-400 text-white text-[8px] font-black rounded-lg uppercase tracking-tighter opacity-60">SYNC</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-black uppercase tracking-wider text-indigo-700/70 ml-1">N° de Cuotas</label>
                                <input type="number" {...register('installments_count')} className="w-full bg-white border border-indigo-100 rounded-2xl p-4 outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-sm transition-all shadow-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-black uppercase tracking-wider text-indigo-700/70 ml-1">Cuota Ref. (S/)</label>
                                <div className="relative group">
                                    <input type="number" step="0.01" {...register('installment_value')} className="w-full bg-indigo-50/30 border border-indigo-100 rounded-2xl p-4 outline-none font-black text-sm text-indigo-600 cursor-not-allowed transition-all" readOnly />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="p-1 px-2 bg-indigo-600 text-white text-[8px] font-black rounded-lg uppercase tracking-tighter shadow-md">REF</div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-black uppercase tracking-wider text-indigo-700/70 ml-1">Cuota Mínima (S/)</label>
                                <div className="relative group">
                                    <input type="number" step="0.01" {...register('min_installment_value')} className="w-full bg-indigo-50/10 border border-indigo-100/50 rounded-2xl p-4 outline-none font-black text-sm text-indigo-400 cursor-not-allowed transition-all italic" readOnly />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="p-1 px-2 bg-indigo-300 text-white text-[8px] font-black rounded-lg uppercase tracking-tighter">MIN</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Fecha de Inicio</label>
                            <input type="date" {...register('start_date')} className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none focus:border-blue-500 font-medium transition" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Área</label>
                            <select {...register('area_id')} className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none focus:border-blue-500 font-medium transition">
                                <option value="">Sin área</option>
                                {areas.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 space-y-6">
                        <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2"><Activity size={18} /> Catálogo Institucional</h3>
                        {(['certificate', 'endorsement', 'sponsorship'] as const).map(type => {
                            const filtered = catalogItems.filter(i => i.type === type);
                            if (filtered.length === 0) return null;
                            return (
                                <div key={type} className="space-y-3">
                                    <p className="text-[10px] font-black uppercase text-gray-400">{type}</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {filtered.map(item => (
                                            <button 
                                                key={item.id} 
                                                type="button" 
                                                onClick={() => toggleCatalogId(item.id)} 
                                                className={`p-3 rounded-2xl border-2 transition-all text-[10px] font-bold bg-white flex flex-col items-center gap-2 ${selectedCatalogIds.includes(item.id) ? 'border-primary shadow-lg shadow-primary/10' : 'border-transparent opacity-60 hover:opacity-100 hover:border-gray-200'}`}
                                            >
                                                {item.image && (
                                                    <div className="w-12 h-12 rounded-xl bg-gray-50 p-1 flex items-center justify-center shrink-0">
                                                        <img src={`/storage/${item.image}`} className="w-full h-full object-contain" alt={item.name} />
                                                    </div>
                                                )}
                                                <span className="text-center line-clamp-2">{item.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="space-y-6">
                        <section>
                            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><MapPin size={16} className="text-blue-500" /> Logística</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Ciudades de Práctica</label>
                                    <input 
                                        type="text" 
                                        value={cityInput} 
                                        onChange={e => {
                                            setCityInput(e.target.value.toUpperCase());
                                            setShowCitySuggestions(true);
                                        }}
                                        onFocus={() => setShowCitySuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCity(cityInput))} 
                                        className="w-full border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none focus:border-blue-500 text-sm font-bold" 
                                        placeholder="+ Agregar ciudad..." 
                                    />
                                    
                                    {showCitySuggestions && allKnownCities.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] max-h-48 overflow-y-auto overflow-x-hidden p-2 animate-in fade-in zoom-in-95 duration-200">
                                            <p className="px-3 py-2 text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">Ciudades Registradas</p>
                                            <div className="space-y-1">
                                                {allKnownCities
                                                    .filter(c => c.includes(cityInput))
                                                    .map(city => (
                                                        <div 
                                                            key={city} 
                                                            onClick={() => addCity(city)}
                                                            className="flex justify-between items-center px-3 py-2 hover:bg-blue-50 rounded-xl transition-all cursor-pointer group/item"
                                                        >
                                                            <span className="text-xs font-bold text-gray-700">{city}</span>
                                                            <button 
                                                                type="button" 
                                                                onClick={(e) => removeCityFromSuggestions(city, e)}
                                                                className="opacity-0 group-hover/item:opacity-100 p-1.5 hover:bg-red-50 text-red-300 hover:text-red-500 rounded-lg transition-all"
                                                                title="Quitar de sugerencias"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {practiceCities.map(c => <span key={c} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black flex items-center gap-1">{c} <X size={10} className="cursor-pointer" onClick={() => setPracticeCities(practiceCities.filter(x => x !== c))} /></span>)}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Duración</label>
                                    <div className="flex gap-2">
                                        <input type="number" {...register('duration_value')} className="flex-1 border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none focus:border-blue-500 font-bold" />
                                        <select {...register('duration_unit')} className="w-24 border-2 border-gray-100 bg-gray-50 rounded-xl p-3 outline-none">
                                            {DURATION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center justify-between"><span className="flex items-center gap-2"><Clock size={16} className="text-purple-500" /> Horarios</span>
                                {!isAddingSchedule && <button type="button" onClick={() => setIsAddingSchedule(true)} className="text-[10px] font-black uppercase text-purple-600">+ Agregar</button>}
                            </h3>
                            {isAddingSchedule && (
                                <div className="bg-purple-50 p-4 rounded-2xl space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS_OF_WEEK.map(d => <button key={d.id} type="button" onClick={() => toggleDay(d.id)} className={`w-8 h-8 rounded-lg text-[10px] font-bold ${tempSchedule.days.includes(d.id) ? 'bg-purple-600 text-white' : 'bg-white text-gray-400 border'}`}>{d.label}</button>)}
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="time" value={tempSchedule.start} onChange={e => handleStartTimeChange(e.target.value)} className="flex-1 p-2 rounded-lg border" />
                                        <input type="time" value={tempSchedule.end} onChange={e => setTempSchedule(p => ({ ...p, end: e.target.value }))} className="flex-1 p-2 rounded-lg border" />
                                    </div>
                                    <button type="button" onClick={addStructuredSchedule} className="w-full py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase">Vincular Horario</button>
                                </div>
                            )}
                            <div className="space-y-2 mt-4">
                                {schedules.map((s, i) => <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded-xl text-xs font-bold text-gray-600"><span>{s}</span> <Trash2 size={14} className="text-red-300 cursor-pointer" onClick={() => setSchedules(schedules.filter((_, idx) => idx !== i))} /></div>)}
                            </div>
                        </section>

                        <section className="pt-6 border-t border-dashed">
                            <h3 className="text-sm font-black text-on-surface-variant/70 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                                <span className="flex items-center gap-2"><BookOpen size={18} className="text-cyan-600" /> Recursos Académicos</span>
                            </h3>

                            <div className="bg-cyan-50/30 border border-cyan-100 p-5 rounded-[2rem] space-y-4 mb-6">
                                <div className="flex gap-2 bg-white p-1 rounded-xl w-fit border border-cyan-100/50 shadow-sm">
                                    <button type="button" onClick={() => setAttType('file')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${attType === 'file' ? 'bg-cyan-600 text-white shadow-md' : 'text-cyan-600/40'}`}>Local</button>
                                    <button type="button" onClick={() => setAttType('url')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${attType === 'url' ? 'bg-cyan-600 text-white shadow-md' : 'text-cyan-600/40'}`}>Nube / URL</button>
                                </div>

                                <div className="space-y-3">
                                    <input 
                                        type="text" 
                                        placeholder="Nombre del recurso (Ej: Sílabo 2024)" 
                                        value={attName} 
                                        onChange={e => setAttName(e.target.value)} 
                                        className="w-full bg-white border border-cyan-100 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-500/20" 
                                    />
                                    
                                    {attType === 'file' ? (
                                        <div className="relative group">
                                            <input 
                                                type="file" 
                                                onChange={e => setAttFile(e.target.files?.[0] || null)} 
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                            />
                                            <div className="bg-white/50 border-2 border-dashed border-cyan-200 rounded-xl p-4 text-center group-hover:bg-white group-hover:border-cyan-400 transition-all">
                                                <div className="flex flex-col items-center gap-1">
                                                    <Plus size={20} className="text-cyan-400" />
                                                    <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">
                                                        {attFile ? attFile.name : 'Seleccionar Archivo'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <input 
                                            type="url" 
                                            placeholder="https://drive.google.com/..." 
                                            value={attUrl} 
                                            onChange={e => setAttUrl(e.target.value)} 
                                            className="w-full bg-white border border-cyan-100 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-500/20" 
                                        />
                                    )}
                                </div>

                                <button 
                                    type="button" 
                                    onClick={addAttachment} 
                                    className="w-full py-3 bg-cyan-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-cyan-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    Vincular Recurso
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {tempAttachments.map(a => (
                                    <div key={a.id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                                                {a.type === 'url' ? <Link2 size={18} /> : <FileText size={18} />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-700 leading-none mb-1">{a.name}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{a.type === 'url' ? 'Enlace Externo' : (a.fileName || 'Archivo Local')}</p>
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => removeAttachment(a.id)}
                                            className="p-2 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {tempAttachments.length === 0 && (
                                    <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-[2rem]">
                                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">No hay recursos adjuntos</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                        {course && canDelete ? <button type="button" onClick={handleDelete} className="text-red-500 text-xs font-bold flex items-center gap-1"><Trash2 size={14} /> Eliminar</button> : <div />}
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-100 rounded-xl font-bold text-sm">Cancelar</button>
                            <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2">{saving && <Loader2 size={14} className="animate-spin" />} {course ? 'Actualizar' : 'Crear'}</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
