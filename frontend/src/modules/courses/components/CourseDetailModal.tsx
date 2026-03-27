import { useState, useEffect } from 'react';
import { getCourse, addAttachment, deleteAttachment, askQuestion, answerQuestion, Course, STATUS_MAP } from '../services/courseService';
import { useAuth } from '@/shared/hooks/useAuth';
import { X, Paperclip, Link2, Trash2, Send, MessageSquare, Loader2, BookOpen, DollarSign, CalendarDays, Pencil, Plus, ExternalLink, Download, ChevronDown } from 'lucide-react';
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-2xl p-12 flex items-center gap-3">
                    <Loader2 size={24} className="animate-spin text-blue-600" />
                    <span className="text-gray-600 font-medium">Cargando curso...</span>
                </div>
            </div>
        );
    }

    const status = STATUS_MAP[course.status];
    const coverUrl = course.cover_image ? `/storage/${course.cover_image}` : null;

    const tabClass = (tab: string) =>
        `py-2 px-4 text-sm font-bold border-b-2 transition ${activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
                {/* Cover Banner */}
                <div className="relative shrink-0">
                    <div className="aspect-video sm:h-48 bg-gradient-to-br from-blue-600 to-indigo-700 overflow-hidden">
                        {coverUrl
                            ? <img src={coverUrl} alt={course.name} className="w-full h-full object-cover opacity-80" />
                            : <div className="flex items-center justify-center h-full"><BookOpen size={64} className="text-white/30" /></div>
                        }
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 flex justify-between items-end">
                        <div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${status.color}`}>{status.label}</span>
                            <h1 className="text-white text-xl font-bold mt-1 leading-tight">{course.name}</h1>
                            {course.area && <p className="text-white/70 text-xs mt-0.5">{course.area.name}</p>}
                        </div>
                        <div className="flex gap-2">
                            {canEdit && (
                                <button onClick={() => onEdit(course)} className="p-2 bg-white/20 backdrop-blur text-white rounded-xl hover:bg-white/30 transition" title="Editar">
                                    <Pencil size={16} />
                                </button>
                            )}
                            <button onClick={onClose} className="p-2 bg-white/20 backdrop-blur text-white rounded-xl hover:bg-white/30 transition">
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 shrink-0">
                    <div className="px-4 py-3 text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Costo</p>
                        <p className="font-bold text-gray-900 flex items-center justify-center gap-1"><DollarSign size={14} className="text-green-500" />S/ {Number(course.price).toFixed(2)}</p>
                    </div>
                    <div className="px-4 py-3 text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Inicio</p>
                        <p className="font-bold text-gray-900 flex items-center justify-center gap-1"><CalendarDays size={14} className="text-blue-500" />
                            {course.start_date ? new Date(course.start_date).toLocaleDateString('es-PE') : '—'}
                        </p>
                    </div>
                    <div className="px-4 py-3 text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Adjuntos</p>
                        <p className="font-bold text-gray-900">{course.attachments?.length || 0}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-100 flex px-4 shrink-0">
                    <button onClick={() => setActiveTab('info')} className={tabClass('info')}>Información</button>
                    <button onClick={() => setActiveTab('attachments')} className={tabClass('attachments')}>Adjuntos ({course.attachments?.length || 0})</button>
                    <button onClick={() => setActiveTab('questions')} className={tabClass('questions')}>Consultas ({course.questions?.length || 0})</button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {/* INFO */}
                    {activeTab === 'info' && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descripción</h3>
                                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                                    {course.description || <span className="italic text-gray-400">Sin descripción.</span>}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Área</p>
                                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{course.area?.name || '—'}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Creado por</p>
                                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{course.creator?.name || '—'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ATTACHMENTS */}
                    {activeTab === 'attachments' && (
                        <div className="space-y-4">
                            {isJefe && (
                                <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-dashed border-gray-200">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Agregar Adjunto</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setAttType('file')} className={`flex-1 text-xs font-bold py-2 rounded-xl transition ${attType === 'file' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                            Archivo
                                        </button>
                                        <button onClick={() => setAttType('url')} className={`flex-1 text-xs font-bold py-2 rounded-xl transition ${attType === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                            Link / URL
                                        </button>
                                    </div>
                                    <input type="text" placeholder="Nombre del recurso *" value={attName} onChange={e => setAttName(e.target.value)}
                                        className="w-full border-2 border-gray-100 bg-white rounded-xl p-2.5 text-sm outline-none focus:border-blue-400 transition" />
                                    {attType === 'file' ? (
                                        <input type="file" onChange={e => setAttFile(e.target.files?.[0] || null)}
                                            className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition" />
                                    ) : (
                                        <input type="url" placeholder="https://..." value={attUrl} onChange={e => setAttUrl(e.target.value)}
                                            className="w-full border-2 border-gray-100 bg-white rounded-xl p-2.5 text-sm outline-none focus:border-blue-400 transition" />
                                    )}
                                    <button onClick={handleAddAttachment} disabled={savingAtt}
                                        className="flex items-center gap-2 w-full justify-center bg-blue-600 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-blue-700 transition">
                                        {savingAtt ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Agregar
                                    </button>
                                </div>
                            )}

                            {course.attachments?.length === 0 ? (
                                <div className="text-center text-gray-400 py-10">
                                    <Paperclip size={36} className="mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm">Sin adjuntos aún.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {course.attachments?.map(att => (
                                        <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition group">
                                            <div className="flex items-center gap-3">
                                                {att.type === 'url' ? <Link2 size={18} className="text-blue-500 flex-shrink-0" /> : <Paperclip size={18} className="text-purple-500 flex-shrink-0" />}
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800">{att.name}</p>
                                                    <p className="text-[10px] text-gray-400">{att.type === 'file' ? (att.mime_type || 'Archivo') : 'URL externa'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {att.type === 'url' ? (
                                                    <a href={att.url || '#'} target="_blank" rel="noreferrer"
                                                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition" title="Abrir">
                                                        <ExternalLink size={15} />
                                                    </a>
                                                ) : (
                                                    <a href={att.path ? `/storage/${att.path}` : '#'} target="_blank" rel="noreferrer"
                                                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition" title="Descargar">
                                                        <Download size={15} />
                                                    </a>
                                                )}
                                                {isJefe && (
                                                    <button onClick={() => handleDeleteAttachment(att.id)}
                                                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100">
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* QUESTIONS */}
                    {activeTab === 'questions' && (
                        <div className="space-y-4">
                            {/* Ask question (asesor or any non-jefe) */}
                            {!isJefe && (
                                <div className="bg-blue-50 rounded-2xl p-4 space-y-3 border border-blue-100">
                                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Hacer una Consulta</p>
                                    <textarea
                                        value={questionText}
                                        onChange={e => setQuestionText(e.target.value)}
                                        rows={3}
                                        placeholder="¿Cuáles son los requisitos para inscribirse?..."
                                        className="w-full border-2 border-blue-100 bg-white rounded-xl p-3 text-sm outline-none focus:border-blue-500 transition"
                                    />
                                    <button onClick={handleAskQuestion} disabled={savingQ || !questionText.trim()}
                                        className="flex items-center gap-2 text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
                                        {savingQ ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Enviar Consulta
                                    </button>
                                </div>
                            )}

                            {course.questions?.length === 0 ? (
                                <div className="text-center text-gray-400 py-10">
                                    <MessageSquare size={36} className="mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm">No hay consultas registradas.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {course.questions?.map(q => (
                                        <div key={q.id} className={`rounded-2xl border overflow-hidden ${q.status === 'answered' ? 'border-green-200' : q.status === 'closed' ? 'border-gray-200' : 'border-yellow-200'}`}>
                                            <div className="p-4 bg-white">
                                                <div className="flex justify-between items-start gap-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                                                            {q.asker?.name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-800">{q.asker?.name}</p>
                                                            <p className="text-[10px] text-gray-400">{new Date(q.created_at).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${q.status === 'answered' ? 'bg-green-100 text-green-700' : q.status === 'closed' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {q.status === 'pending' ? 'Pendiente' : q.status === 'answered' ? 'Respondida' : 'Cerrada'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 ml-9">{q.question}</p>
                                            </div>

                                            {q.answer && (
                                                <div className="p-4 bg-green-50/50 border-t border-green-100">
                                                    <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">
                                                        Respuesta de {q.answerer?.name} · {q.answered_at ? new Date(q.answered_at).toLocaleDateString() : ''}
                                                    </p>
                                                    <p className="text-sm text-gray-700">{q.answer}</p>
                                                </div>
                                            )}

                                            {isJefe && q.status === 'pending' && (
                                                <div className="border-t border-dashed border-yellow-200">
                                                    {expandedQ === q.id ? (
                                                        <div className="p-4 space-y-3 bg-yellow-50/50">
                                                            <textarea value={answerText} onChange={e => setAnswerText(e.target.value)} rows={3}
                                                                placeholder="Escribe la respuesta..."
                                                                className="w-full border-2 border-yellow-200 bg-white rounded-xl p-3 text-sm outline-none focus:border-yellow-400 transition" />
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setExpandedQ(null)} className="px-4 py-2 text-xs font-bold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition">Cancelar</button>
                                                                <button onClick={() => handleAnswerQuestion(q.id)} disabled={savingAnswer || !answerText.trim()}
                                                                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition">
                                                                    {savingAnswer ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Responder
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => { setExpandedQ(q.id); setAnswerText(''); }}
                                                            className="w-full text-xs font-bold text-yellow-700 bg-yellow-50 hover:bg-yellow-100 py-2.5 transition flex items-center justify-center gap-1.5">
                                                            <ChevronDown size={14} /> Responder
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
