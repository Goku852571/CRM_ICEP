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
  HelpCircle
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
                
                {/* Global Close Button */}
                <button 
                  onClick={onClose} 
                  className="absolute top-6 right-6 z-50 p-3 bg-white/80 backdrop-blur shadow-xl border border-outline-variant/10 text-on-surface-variant hover:text-primary rounded-2xl transition-all active:scale-95 group"
                >
                    <X size={20} className="group-hover:rotate-90 transition-transform" />
                </button>
                
                {/* Left Side: Art & Title Banner */}
                <div className="md:w-2/5 relative shrink-0 overflow-hidden group">
                    <div className="absolute inset-0 primary-gradient transition-all duration-1000 group-hover:scale-110">
                        {coverUrl ? (
                            <img src={coverUrl} alt={course.name} className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
                        ) : (
                            <div className="flex items-center justify-center h-full opacity-20"><BookOpen size={120} /></div>
                        )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/20 to-transparent" />
                    
                    <div className="absolute inset-x-0 bottom-0 p-10 flex flex-col justify-end">
                        <div className="status-jewel mb-6 w-fit bg-white/10 backdrop-blur-xl text-white border-white/10">
                            <div className={`status-dot ${course.status === 'active' ? 'bg-tertiary-fixed' : 'bg-error'}`} />
                            <span className="text-[10px] font-bold tracking-widest">{status.label}</span>
                        </div>
                        <h1 className="font-headline font-extrabold text-white text-4xl lg:text-5xl tracking-tight leading-tight mb-4 group-hover:translate-x-1 transition-transform">
                            {course.name}
                        </h1>
                        <p className="text-white/60 font-medium text-xs uppercase tracking-[0.15em] mb-8">
                            REF: {course.code || 'EDU-BASE-001'} • {course.area?.name || 'Área General'}
                        </p>
                        
                        <div className="flex gap-4">
                            {canEdit && (
                                <button 
                                  onClick={() => onEdit(course)} 
                                  className="flex-1 py-4 bg-tertiary-fixed text-on-tertiary-fixed rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-white hover:text-primary transition-all active:scale-95 shadow-lg shadow-black/10"
                                >
                                    <Pencil size={14} /> Editar Curso
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Tabbed Content Workspace */}
                <div className="flex-1 flex flex-col bg-surface min-w-0">
                    {/* High-end Tab Navigation */}
                    <div className="flex px-8 bg-white border-b border-outline-variant/10">
                        <button onClick={() => setActiveTab('info')} className={navItemClass('info')}>
                            Resumen
                            {activeTab === 'info' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary animate-in slide-in-from-left-full duration-500" />}
                        </button>
                        <button onClick={() => setActiveTab('attachments')} className={navItemClass('attachments')}>
                            Recursos ({course.attachments?.length || 0})
                            {activeTab === 'attachments' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary animate-in slide-in-from-left-full duration-500" />}
                        </button>
                        <button onClick={() => setActiveTab('questions')} className={navItemClass('questions')}>
                            Consultas ({course.questions?.length || 0})
                            {activeTab === 'questions' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary animate-in slide-in-from-left-full duration-500" />}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10 scrollbar-thin scrollbar-thumb-outline-variant/20 scrollbar-track-transparent">
                        {/* 1. INFO TAB: Editorial Layout */}
                        {activeTab === 'info' && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <section>
                                    <h3 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                        <Info size={14} /> Sinopsis del Programa
                                    </h3>
                                    <p className="text-on-surface-variant text-lg font-medium leading-relaxed opacity-80">
                                        {course.description || "Este programa académico está diseñado para potenciar las habilidades críticas en el área seleccionada, siguiendo los estándares internacionales de educación técnica y superior."}
                                    </p>
                                </section>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="bg-white p-6 rounded-3xl ghost-border flex items-center gap-4 group hover:shadow-xl transition-all">
                                        <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                            <CalendarDays size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Fecha Estimada</p>
                                            <p className="font-headline font-bold text-primary">
                                                {course.start_date ? new Date(course.start_date).toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Próxima convocat.'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl ghost-border flex items-center gap-4 group hover:shadow-xl transition-all">
                                        <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                            <Layers size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Nivel de Cargo</p>
                                            <p className="font-headline font-bold text-primary uppercase tracking-tight">Postgrado / Senior</p>
                                        </div>
                                    </div>
                                </div>

                                <footer className="bg-surface-container-low/50 p-6 rounded-3xl border border-dashed border-outline-variant/30 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full primary-gradient flex items-center justify-center text-white font-bold">
                                            {course.creator?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest leading-none">Creado por Administrador</p>
                                            <p className="text-xs font-bold text-primary mt-1">{course.creator?.name || 'Staff ICEP'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest leading-none">Inversion Institucional</p>
                                        <p className="font-headline font-bold text-primary mt-1 text-lg">S/ {Number(course.price).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </footer>
                            </div>
                        )}

                        {/* 2. ATTACHMENTS TAB: High-end Resource List */}
                        {activeTab === 'attachments' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {isJefe && (
                                    <div className="bg-white rounded-3xl p-8 space-y-6 ghost-border shadow-xl shadow-black/5">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Cargar Nuevo Recurso</h3>
                                            <div className="flex bg-surface-container-low p-1 rounded-xl">
                                                <button onClick={() => setAttType('file')} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${attType === 'file' ? 'bg-primary text-white shadow-lg' : 'text-on-surface-variant/60 hover:text-primary'}`}>LOCAL</button>
                                                <button onClick={() => setAttType('url')} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${attType === 'url' ? 'bg-primary text-white shadow-lg' : 'text-on-surface-variant/60 hover:text-primary'}`}>NUBE / URL</button>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <input 
                                                type="text" 
                                                placeholder="Ej: Silabo del Curso 2024 (Requerido)" 
                                                value={attName} 
                                                onChange={e => setAttName(e.target.value)}
                                                className="w-full bg-surface-container-low border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/30" 
                                            />
                                            
                                            {attType === 'file' ? (
                                                <div className="relative group">
                                                    <input 
                                                        type="file" 
                                                        onChange={e => setAttFile(e.target.files?.[0] || null)}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                                    />
                                                    <div className="bg-surface-container-low/50 border-2 border-dashed border-outline-variant/30 rounded-2xl p-6 text-center group-hover:bg-white group-hover:border-primary/20 transition-all">
                                                        <Plus size={24} className="mx-auto mb-2 text-on-surface-variant/40" />
                                                        <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">
                                                            {attFile ? attFile.name : 'Haz clic para seleccionar un archivo'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <input 
                                                    type="url" 
                                                    placeholder="https://drive.google.com/..." 
                                                    value={attUrl} 
                                                    onChange={e => setAttUrl(e.target.value)}
                                                    className="w-full bg-surface-container-low border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary/10 transition-all" 
                                                />
                                            )}
                                        </div>
                                        
                                        <button 
                                            onClick={handleAddAttachment} 
                                            disabled={savingAtt || !attName.trim()}
                                            className="w-full py-4 bg-primary text-tertiary-fixed rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:shadow-2xl hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-30"
                                        >
                                            {savingAtt ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Confirmar Carga'}
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mb-4">Materiales Disponibles</h3>
                                    {course.attachments?.length === 0 ? (
                                        <div className="text-center py-12 bg-white rounded-3xl ghost-border">
                                            <Sparkles size={32} className="mx-auto mb-3 text-on-surface-variant/20" />
                                            <p className="text-xs font-bold text-on-surface-variant/40 uppercase tracking-widest">No hay recursos vinculados aún.</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {course.attachments?.map(att => (
                                                <div key={att.id} className="flex items-center justify-between p-5 bg-white rounded-2xl ghost-border hover:bg-surface-container-low/50 hover:shadow-lg transition-all group/item">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${att.type === 'url' ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary text-tertiary-fixed'}`}>
                                                            {att.type === 'url' ? <Link2 size={20} /> : <FileText size={20} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-primary tracking-tight">{att.name}</p>
                                                            <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">{att.type === 'file' ? 'Archivo Institucional' : 'Recurso Externo'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <a 
                                                            href={att.type === 'url' ? (att.url || '#') : (att.path ? `/storage/${att.path}` : '#')} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="p-3 bg-surface-container-low text-primary rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                                                        >
                                                            {att.type === 'url' ? <ExternalLink size={18} /> : <Download size={18} />}
                                                        </a>
                                                        {isJefe && (
                                                            <button 
                                                                onClick={() => handleDeleteAttachment(att.id)}
                                                                className="p-3 bg-error/5 text-error rounded-xl hover:bg-error hover:text-white transition-all opacity-0 group-hover/item:opacity-100"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 3. QUESTIONS TAB: High-end Inquiry Log */}
                        {activeTab === 'questions' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pr-1">
                                {!isJefe && (
                                    <div className="bg-primary-container p-8 rounded-3xl text-white relative overflow-hidden group">
                                        <div className="relative z-10 space-y-6">
                                            <div className="flex items-center gap-3">
                                              <MessageSquare className="text-tertiary-fixed" />
                                              <h3 className="font-headline font-extrabold text-xl">¿Tienes una duda técnica?</h3>
                                            </div>
                                            <textarea
                                                value={questionText}
                                                onChange={e => setQuestionText(e.target.value)}
                                                rows={4}
                                                placeholder="Describe tu consulta aquí. Los encargados responderán a la brevedad..."
                                                className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 text-sm text-white placeholder:text-white/30 outline-none focus:bg-white/20 transition-all font-medium"
                                            />
                                            <button 
                                                onClick={handleAskQuestion} 
                                                disabled={savingQ || !questionText.trim()}
                                                className="bg-tertiary-fixed text-on-tertiary-fixed font-black text-[10px] uppercase tracking-[0.2em] px-8 py-4 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 shadow-xl shadow-black/20"
                                            >
                                                {savingQ ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Despachar Consulta'}
                                            </button>
                                        </div>
                                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-12 transition-transform duration-1000">
                                          <HelpCircle size={160} />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mb-4">Registro Histórico de Consultas</h3>
                                    {course.questions?.length === 0 ? (
                                        <div className="text-center py-20 bg-white rounded-[2.5rem] ghost-border flex flex-col items-center">
                                            <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-4 text-on-surface-variant/20">
                                              <MessageSquare size={32} />
                                            </div>
                                            <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Aún no se han registrado consultas para este curso.</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-6">
                                            {course.questions?.map(q => (
                                                <div key={q.id} className="group/q">
                                                    <div className={`p-8 rounded-[2rem] bg-white ghost-border hover:shadow-xl transition-all duration-500 relative ${q.status === 'pending' ? 'border-l-8 border-l-on-primary-container' : 'border-l-8 border-l-tertiary-fixed'}`}>
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="h-10 w-10 rounded-full primary-gradient flex items-center justify-center text-white font-bold shadow-sm">
                                                                    {q.asker?.name?.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-primary tracking-tight leading-none mb-1">{q.asker?.name}</p>
                                                                    <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
                                                                        {new Date(q.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="status-jewel shadow-sm">
                                                                <div className={`status-dot ${q.status === 'pending' ? 'bg-on-primary-container animate-pulse' : 'bg-tertiary-fixed'}`} />
                                                                <span className="text-[8px] font-black text-on-surface-variant uppercase tracking-[0.2em]">{q.status === 'pending' ? 'EN ESPERA' : 'RESUELTO'}</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-on-surface-variant font-medium leading-relaxed italic border-l-4 border-surface-container-high pl-6 mb-8 group-hover/q:text-primary transition-colors">
                                                            "{q.question}"
                                                        </p>

                                                        {q.answer && (
                                                            <div className="bg-surface-container-low/50 p-6 rounded-2xl animate-in slide-in-from-top-4 duration-500">
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <Sparkles size={14} className="text-on-tertiary-container" />
                                                                    <p className="text-[10px] font-black text-on-tertiary-container uppercase tracking-widest">Respuesta del Secretario Académico</p>
                                                                </div>
                                                                <p className="text-sm text-on-surface-variant font-bold leading-relaxed">{q.answer}</p>
                                                            </div>
                                                        )}

                                                        {isJefe && q.status === 'pending' && (
                                                            <div className="mt-8 pt-8 border-t border-outline-variant/10">
                                                                {expandedQ === q.id ? (
                                                                    <div className="space-y-4 animate-in fade-in zoom-in-95">
                                                                        <textarea 
                                                                            value={answerText} 
                                                                            onChange={e => setAnswerText(e.target.value)} 
                                                                            rows={3}
                                                                            placeholder="Redacta la respuesta oficial de la institución..."
                                                                            className="w-full bg-surface-container-low border-2 border-primary/20 rounded-2xl p-5 text-sm font-medium focus:ring-4 focus:ring-primary/5 outline-none transition-all" 
                                                                        />
                                                                        <div className="flex gap-3 justify-end">
                                                                            <button onClick={() => setExpandedQ(null)} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">Abortar</button>
                                                                            <button 
                                                                                onClick={() => handleAnswerQuestion(q.id)} 
                                                                                disabled={savingAnswer || !answerText.trim()}
                                                                                className="px-8 py-3 bg-primary text-tertiary-fixed rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                                                            >
                                                                                {savingAnswer ? <Loader2 size={14} className="animate-spin" /> : 'Publicar Respuesta'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => { setExpandedQ(q.id); setAnswerText(''); }}
                                                                        className="w-full py-4 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-3 px-8"
                                                                    >
                                                                        Atender Consulta <ArrowRight size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
