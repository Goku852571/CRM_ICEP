import { useState, useEffect } from 'react';
import { getCourse, addAttachment, deleteAttachment, askQuestion, answerQuestion, Course, STATUS_MAP } from '../services/courseService';
import { useAuth } from '@/shared/hooks/useAuth';
import { 
  X, 
  Paperclip, 
  Link2, 
  Trash2, 
  Send, 
  MessageSquare, 
  Loader2, 
  BookOpen, 
  DollarSign, 
  CalendarDays, 
  Pencil, 
  Plus, 
  ExternalLink, 
  Download, 
  ChevronDown,
  Info,
  Layers,
  Sparkles,
  ArrowRight,
  FileText,
  HelpCircle,
  MapPin,
  Clock,
  ShieldCheck,
  Award,
  CheckSquare,
  Tag,
  Eye,
  CreditCard,
  Activity
} from 'lucide-react';
import { showSuccess, showError, showConfirmDanger, showToast } from '@/shared/utils/alerts';

interface Props {
    courseId: number;
    isJefe: boolean;
    canEdit: boolean;
    onClose: () => void;
    onEdit: (course: Course) => void;
}

export default function CourseDetailModal({ courseId, isJefe, canEdit, onClose, onEdit }: Props) {
    const { user } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'info' | 'attachments' | 'questions'>('info');

    // Attachments
    const [attType, setAttType] = useState<'file' | 'url'>('file');
    const [attName, setAttName] = useState('');
    const [attFile, setAttFile] = useState<File | null>(null);
    const [attUrl, setAttUrl] = useState('');
    const [savingAtt, setSavingAtt] = useState(false);

    // Questions
    const [questionText, setQuestionText] = useState('');
    const [savingQ, setSavingQ] = useState(false);
    const [expandedQ, setExpandedQ] = useState<number | null>(null);
    const [answerText, setAnswerText] = useState('');
    const [savingAnswer, setSavingAnswer] = useState(false);

    // Preview state
    const [previewResource, setPreviewResource] = useState<{ url: string; type: string; name: string } | null>(null);

    const fetchCourse = async () => {
        try {
            const data = await getCourse(courseId);
            setCourse(data.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCourse(); }, [courseId]);

    const handleAddAttachment = async () => {
        if (!course || !attName.trim()) {
            showError('Campo requerido', 'Ingresa un nombre para el adjunto.');
            return;
        }
        setSavingAtt(true);
        try {
            const fd = new FormData();
            fd.append('name', attName);
            fd.append('type', attType);
            if (attType === 'file' && attFile) fd.append('file', attFile);
            if (attType === 'url') fd.append('url', attUrl);
            await addAttachment(course.id, fd);
            setAttName(''); setAttUrl(''); setAttFile(null);
            showToast('success', 'Adjunto agregado');
            fetchCourse();
        } catch (e: any) {
            showError('Error al subir adjunto', e.response?.data?.message || 'Intenta nuevamente.');
        } finally {
            setSavingAtt(false);
        }
    };

    const handleDeleteAttachment = async (attId: number) => {
        if (!course) return;
        const confirmed = await showConfirmDanger('¿Eliminar adjunto?', 'El archivo será eliminado permanentemente.');
        if (!confirmed) return;
        await deleteAttachment(course.id, attId);
        showToast('success', 'Adjunto eliminado');
        fetchCourse();
    };

    const handleAskQuestion = async () => {
        if (!course || !questionText.trim()) return;
        setSavingQ(true);
        try {
            await askQuestion(course.id, questionText);
            setQuestionText('');
            showToast('success', 'Consulta enviada');
            fetchCourse();
        } finally {
            setSavingQ(false);
        }
    };

    const handleAnswerQuestion = async (qId: number) => {
        if (!course || !answerText.trim()) return;
        setSavingAnswer(true);
        try {
            await answerQuestion(course.id, qId, answerText, 'answered');
            setAnswerText(''); setExpandedQ(null);
            showToast('success', 'Respuesta guardada');
            fetchCourse();
        } finally {
            setSavingAnswer(false);
        }
    };

    if (loading || !course) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-surface/80 backdrop-blur-xl">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <span className="text-on-surface-variant font-bold text-xs uppercase tracking-widest opacity-60">Consultando Registro...</span>
                </div>
            </div>
        );
    }

    const status = STATUS_MAP[course.status] || { label: 'Inactivo', color: 'bg-surface-container-high text-on-surface-variant' };
    const coverUrl = course.cover_image ? `/storage/${course.cover_image}` : null;

    const navItemClass = (tab: string) =>
        `flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 relative ${
            activeTab === tab 
            ? 'text-primary' 
            : 'text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-low/30'
        }`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/20 backdrop-blur-sm p-4 animate-in fade-in duration-500">
            <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-[1000px] shadow-2xl shadow-black/20 overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[700px] ghost-border scale-in-center duration-500 relative">
                
                <button onClick={onClose} className="absolute top-6 right-6 z-50 p-3 bg-white/80 backdrop-blur shadow-xl border border-outline-variant/10 text-on-surface-variant hover:text-primary rounded-2xl transition-all active:scale-95 group">
                    <X size={20} className="group-hover:rotate-90 transition-transform" />
                </button>
                
                <div className="md:w-2/5 relative shrink-0 overflow-hidden group">
                    <div className="absolute inset-0 primary-gradient transition-all duration-1000 group-hover:scale-110">
                        {coverUrl ? <img src={coverUrl} alt={course.name} className="w-full h-full object-cover opacity-60 mix-blend-overlay" /> : <div className="flex items-center justify-center h-full opacity-20"><BookOpen size={120} /></div>}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-10 flex flex-col justify-end">
                        <div className="status-jewel mb-6 w-fit bg-white/10 backdrop-blur-xl text-white border-white/10">
                            <div className={`status-dot ${course.status === 'active' ? 'bg-tertiary-fixed' : 'bg-error'}`} />
                            <span className="text-[10px] font-bold tracking-widest">{status.label}</span>
                        </div>
                        <h1 className="font-headline font-extrabold text-white text-4xl lg:text-5xl tracking-tight leading-tight mb-4">{course.name}</h1>
                        <p className="text-white/60 font-medium text-xs uppercase tracking-[0.15em] mb-8">REF: {course.code} • {course.area?.name}</p>
                        {canEdit && <button onClick={() => onEdit(course)} className="w-full py-4 bg-tertiary-fixed text-on-tertiary-fixed rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-white hover:text-primary transition shadow-lg"><Pencil size={14} /> Editar Curso</button>}
                    </div>
                </div>

                <div className="flex-1 flex flex-col bg-surface min-w-0">
                    <div className="flex px-8 bg-white border-b border-outline-variant/10">
                        <button onClick={() => setActiveTab('info')} className={navItemClass('info')}>Resumen {activeTab === 'info' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary" />}</button>
                        <button onClick={() => setActiveTab('attachments')} className={navItemClass('attachments')}>Recursos ({course.attachments?.length || 0}) {activeTab === 'attachments' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary" />}</button>
                        <button onClick={() => setActiveTab('questions')} className={navItemClass('questions')}>Consultas ({course.questions?.length || 0}) {activeTab === 'questions' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary" />}</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10">
                        {activeTab === 'info' && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <section>
                                    <h3 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mb-6 flex items-center gap-2"><Info size={14} /> Sinopsis del Programa</h3>
                                    <p className="text-on-surface-variant text-lg font-medium leading-relaxed opacity-80">{course.description || "Sin descripción disponible."}</p>
                                </section>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="bg-white p-6 rounded-3xl ghost-border flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"><CalendarDays size={20} /></div>
                                        <div>
                                            <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Inicio</p>
                                            <p className="font-headline font-bold text-blue-600">{course.start_date ? new Date(course.start_date).toLocaleDateString() : 'Pendiente'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl ghost-border flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600"><Clock size={20} /></div>
                                        <div>
                                            <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Duración</p>
                                            <p className="font-headline font-bold text-purple-600">{course.duration || 'Por definir'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl ghost-border flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600"><MapPin size={20} /></div>
                                        <div>
                                            <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Ciudades</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {Array.isArray(course.practice_city) ? course.practice_city.map((c, i) => <span key={i} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-black">{c}</span>) : course.practice_city}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl ghost-border flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600"><Tag size={20} /></div>
                                        <div>
                                            <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Inversión Final (Desc.)</p>
                                            <p className="font-headline font-bold text-orange-600">
                                                {course.discount && course.discount > 0 ? (
                                                    <>
                                                        S/ {(Number(course.price || 0) * (1 - Number(course.discount) / 100)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                                        <span className="text-[9px] ml-1 bg-orange-100 px-1 rounded">-{course.discount}%</span>
                                                    </>
                                                ) : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <section>
                                    <h3 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2"><Clock size={14} className="text-purple-500" /> Horarios de Clase</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {course.schedules?.map((s, i) => (
                                            <div key={i} className="p-4 bg-purple-50/30 border border-purple-100/50 rounded-2xl text-[11px] font-bold text-gray-600 flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> {s}
                                            </div>
                                        ))}
                                        {(!course.schedules || course.schedules.length === 0) && <p className="text-[10px] font-bold text-gray-400 italic">No hay horarios definidos.</p>}
                                    </div>
                                </section>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
                                    <section>
                                        <h3 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                            <CheckSquare size={14} className="text-orange-500" /> Certificaciones
                                        </h3>
                                        <div className="space-y-3">
                                            {course.catalog_items?.filter(i => i.type === 'certificate').map((c, i) => (
                                                <div key={`cat-${i}`} className="flex items-center gap-4 text-xs font-bold text-primary bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                                                    {c.image && <img src={`/storage/${c.image}`} className="w-10 h-10 object-contain rounded-xl bg-white p-1" />}
                                                    <span className="truncate">{c.name}</span>
                                                </div>
                                            ))}
                                            {(!course.catalog_items?.some(i => i.type === 'certificate')) && (
                                                <p className="text-[10px] font-bold text-gray-400 italic bg-gray-50 p-4 rounded-2xl border border-dashed text-center">Certificado institucional estándar incluido.</p>
                                            )}
                                        </div>
                                    </section>

                                    {course.catalog_items?.some(i => i.type === 'endorsement') && (
                                        <section>
                                            <h3 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                                <Award size={14} className="text-yellow-500" /> Avalado por
                                            </h3>
                                            <div className="flex flex-wrap gap-4">
                                                {course.catalog_items?.filter(i => i.type === 'endorsement').map((a, i) => (
                                                    <div key={`cat-a-${i}`} className="bg-yellow-50 p-4 rounded-3xl border border-yellow-100 flex items-center gap-4 transition-all hover:scale-105">
                                                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-2 border border-yellow-100 shadow-sm shrink-0">
                                                            {a.image ? <img src={`/storage/${a.image}`} className="w-full h-full object-contain" /> : <Award size={24} className="text-yellow-500" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-primary leading-tight">{a.name}</p>
                                                            <p className="text-[8px] font-bold text-yellow-600 uppercase tracking-widest mt-0.5 whitespace-nowrap">Aval Institucional</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )}
                                </div>

                                {course.catalog_items?.some(i => i.type === 'sponsorship') && (
                                    <section>
                                        <h3 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                            <ShieldCheck size={14} className="text-cyan-500" /> Auspicios Institucionales
                                        </h3>
                                        <div className="flex flex-wrap gap-4">
                                            {course.catalog_items?.filter(i => i.type === 'sponsorship').map((a, i) => (
                                                <div key={`cat-s-${i}`} className="bg-cyan-50 p-4 rounded-3xl border border-cyan-100 flex items-center gap-4 transition-all hover:scale-105">
                                                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-2 border border-cyan-100 shadow-sm shrink-0">
                                                        {a.image ? <img src={`/storage/${a.image}`} className="w-full h-full object-contain" /> : <ShieldCheck size={24} className="text-cyan-500" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-primary leading-tight">{a.name}</p>
                                                        <p className="text-[8px] font-bold text-cyan-600 uppercase tracking-widest mt-0.5 whitespace-nowrap">Auspicio Oficial</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Suggested Plan (Reference) */}
                                    <section className="bg-indigo-50/50 border border-indigo-100/50 p-6 rounded-[2.5rem] space-y-4 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-3">
                                            <div className="bg-indigo-600 text-white text-[7px] font-black px-2 py-0.5 rounded-full tracking-widest uppercase shadow-sm">Referencia</div>
                                        </div>
                                        <h3 className="text-[10px] font-black text-indigo-900/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <CreditCard size={14} className="text-indigo-600" /> Plan Sugerido
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[9px] font-black text-indigo-600/50 uppercase tracking-widest mb-1">Inversión / Matrícula</p>
                                                <p className="text-xl font-headline font-black text-indigo-900">
                                                    S/ {Number(course.enrollment_value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                                    {Number(course.discount || 0) > 0 && (
                                                        <span className="text-[10px] text-emerald-600 font-bold ml-2">(-{course.discount}%)</span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="pt-4 border-t border-indigo-100/30">
                                                <p className="text-[9px] font-black text-indigo-600/50 uppercase tracking-widest mb-1">Fraccionamiento</p>
                                                <p className="text-xl font-headline font-black text-indigo-900 flex items-baseline gap-2">
                                                    {course.installments_count || 0} 
                                                    <span className="text-[10px] font-bold text-indigo-400 uppercase">Cuotas de</span>
                                                    <span className="text-lg">S/ {Number(course.installment_value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Minimum Plan */}
                                    <section className="bg-rose-50/30 border border-rose-100/30 p-6 rounded-[2.5rem] space-y-4 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-3">
                                            <div className="bg-rose-600 text-white text-[7px] font-black px-2 py-0.5 rounded-full tracking-widest uppercase shadow-sm">Mínimo</div>
                                        </div>
                                        <h3 className="text-[10px] font-black text-rose-900/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Activity size={14} className="text-rose-600" /> Límite de Venta
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[9px] font-black text-rose-600/50 uppercase tracking-widest mb-1">Inversión Mínima</p>
                                                <p className="text-xl font-headline font-black text-rose-900">S/ {Number(course.min_price || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="pt-4 border-t border-rose-100/20">
                                                <p className="text-[9px] font-black text-rose-600/50 uppercase tracking-widest mb-1">Cuotas Mínimas</p>
                                                <p className="text-xl font-headline font-black text-rose-900 flex items-baseline gap-2">
                                                    {course.installments_count || 0} 
                                                    <span className="text-[10px] font-bold text-rose-400 uppercase">Cuotas de</span>
                                                    <span className="text-lg">S/ {Number(course.min_installment_value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/20">
                                    <div className="p-2 bg-white rounded-xl shadow-sm">
                                        <Info size={16} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-indigo-900/80 uppercase tracking-tight">Financiamiento Dinámico</p>
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter leading-tight">
                                            El sistema calcula automáticamente las cuotas según el número definido. Los asesores deben respetar el Plan Mínimo como límite inferior.
                                        </p>
                                    </div>
                                </div>

                                <footer className="bg-surface-container-low/50 p-8 rounded-[2.5rem] border border-dashed border-outline-variant/30 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="flex items-center gap-3 md:col-span-1">
                                        <div className="h-10 w-10 rounded-full primary-gradient flex items-center justify-center text-white font-bold shadow-lg">
                                            {course.creator?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest leading-none">Administrador</p>
                                            <p className="text-xs font-bold text-primary mt-1">{course.creator?.name || 'Staff ICEP'}</p>
                                        </div>
                                    </div>
                                    <div className="text-center md:border-x md:border-outline-variant/20 px-4">
                                        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest leading-none">Inversión Mínima</p>
                                        <p className="font-headline font-bold text-on-surface-variant/70 mt-1 text-base">S/ {Number(course.min_price || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest leading-none">Total Referencia</p>
                                        <p className="font-headline font-bold text-primary mt-1 text-2xl">S/ {Number(course.price).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </footer>
                            </div>
                        )}

                        {activeTab === 'attachments' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid gap-4">
                                    {course.attachments?.map(att => (
                                        <div key={att.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center">{att.type === 'url' ? <Link2 size={18} /> : <FileText size={18} />}</div>
                                                <div>
                                                    <p className="text-sm font-bold text-primary">{att.name}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{att.type}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => {
                                                        const url = att.type === 'url' ? att.url : (att.path ? `/storage/${att.path}` : null);
                                                        if (!url) return;
                                                        
                                                        if (att.type === 'url') window.open(url, '_blank');
                                                        else {
                                                            const isPdf = att.path?.toLowerCase().endsWith('.pdf');
                                                            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(att.path || '');
                                                            if (isPdf || isImage) setPreviewResource({ url: url, type: isPdf ? 'pdf' : 'image', name: att.name });
                                                            else window.open(url, '_blank');
                                                        }
                                                    }}
                                                    className="p-2.5 bg-gray-50 text-primary rounded-xl hover:bg-primary hover:text-white transition shadow-sm"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {isJefe && <button onClick={() => handleDeleteAttachment(att.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>}
                                            </div>
                                        </div>
                                    ))}
                                    {course.attachments?.length === 0 && <p className="text-center py-10 text-xs text-gray-400 italic font-bold uppercase tracking-widest">No hay recursos vinculados.</p>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'questions' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-primary/5 p-8 rounded-3xl border border-dashed border-primary/20">
                                    <h3 className="font-headline font-black text-primary text-xl mb-4">Pregunta algo sobre este curso</h3>
                                    <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows={3} className="w-full bg-white border-0 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 mb-4" placeholder="Escribe tu consulta..." />
                                    <button onClick={handleAskQuestion} disabled={savingQ || !questionText.trim()} className="px-8 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">Enviar Consulta</button>
                                </div>

                                <div className="space-y-4">
                                    {course.questions?.map(q => (
                                        <div key={q.id} className="p-6 bg-white border rounded-[2rem] space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">{q.asker?.name?.[0]}</div>
                                                    <div>
                                                        <p className="text-sm font-bold text-primary">{q.asker?.name}</p>
                                                        <p className="text-[9px] font-bold text-gray-400">{new Date(q.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${q.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>{q.status}</span>
                                            </div>
                                            <p className="text-on-surface-variant font-medium leading-relaxed italic border-l-4 pl-4">"{q.question}"</p>
                                            {q.answer && <div className="bg-gray-50 p-4 rounded-2xl border"><p className="text-[9px] font-black primary uppercase mb-1">Respuesta Académica</p><p className="text-sm text-on-surface-variant font-bold">{q.answer}</p></div>}
                                            {isJefe && q.status === 'pending' && (
                                                <div className="pt-4 border-t space-y-3">
                                                    <textarea value={answerText} onChange={e => setAnswerText(e.target.value)} rows={2} className="w-full bg-gray-50 border-0 rounded-xl p-3 text-sm" placeholder="Respuesta..." />
                                                    <button onClick={() => handleAnswerQuestion(q.id)} className="px-4 py-2 bg-primary text-white rounded-lg text-[9px] font-black uppercase">Responder</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {previewResource && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-10 animate-in fade-in duration-300">
                    <div className="relative w-full h-full max-w-5xl bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col">
                        <div className="flex justify-between items-center px-8 py-4 border-b">
                            <h2 className="font-bold text-primary">{previewResource.name}</h2>
                            <div className="flex gap-2">
                                <a href={previewResource.url} download className="p-2 bg-gray-50 rounded-xl text-primary"><Download size={20} /></a>
                                <button onClick={() => setPreviewResource(null)} className="p-2 bg-red-50 text-red-500 rounded-xl ml-4"><X size={20} /></button>
                            </div>
                        </div>
                        <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-hidden">
                            {previewResource.type === 'pdf' ? <iframe src={previewResource.url} className="w-full h-full" /> : <img src={previewResource.url} className="max-w-full max-h-full object-contain" />}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
