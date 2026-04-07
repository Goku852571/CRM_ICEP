import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
   Plus, Save, ArrowLeft, Send, Users,
   Search, CheckCircle2, AlertCircle, Loader2,
   Mail, BookOpen, User, Eye, Inbox, RefreshCw
} from 'lucide-react';
import {
   getEmailCampaigns, getEmailTemplates, createEmailCampaign,
   sendEmailCampaign, previewRecipients, EmailCampaign, EmailTemplate
} from '../services/emailService';
import { getCourses, Course } from '@/modules/enrollments/services/enrollmentService';
import { showSuccess, showError } from '@/shared/utils/alerts';
import clsx from 'clsx';

export default function EmailCampaignPage() {
   const { id } = useParams<{ id: string }>();
   const navigate = useNavigate();
   const queryClient = useQueryClient();
   const isEdit = id && id !== 'new';

   const [form, setForm] = useState<Partial<EmailCampaign>>({
      name: '',
      subject: '',
      sender_name: 'ICEP — Admisiones',
      sender_email: 'admisiones@icep.com',
      recipient_type: 'leads',
      html_body: '',
   });

   const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
   const [activeTab, setActiveTab] = useState<'config' | 'preview'>('config');

   const { data: templatesPayload } = useQuery({ queryKey: ['email-templates'], queryFn: getEmailTemplates });
   const { data: coursesPayload } = useQuery({ queryKey: ['courses-for-enrollment'], queryFn: getCourses });
   const templates: EmailTemplate[] = templatesPayload?.data || [];
   const courses: Course[] = coursesPayload?.data || [];

   const { data: campaignPayload, isLoading: loadingCam } = useQuery({
      queryKey: ['email-campaign', id],
      queryFn: () => getEmailCampaigns(),
      enabled: !!isEdit,
      select: (res) => res.data.find((c: any) => c.id === parseInt(id!)),
   });

   const { data: previewData, isLoading: loadingPreview } = useQuery({
      queryKey: ['campaign-preview', form.recipient_type, form.recipient_course_id, form.recipient_lead_ids],
      queryFn: () => previewRecipients({
         recipient_type: form.recipient_type!,
         recipient_course_id: form.recipient_course_id,
         recipient_lead_ids: form.recipient_lead_ids,
      }),
      enabled: activeTab === 'preview',
   });

   useEffect(() => {
      if (isEdit && campaignPayload) {
         setForm(campaignPayload);
         if (campaignPayload.template_id) setSelectedTemplateId(campaignPayload.template_id);
      }
   }, [isEdit, campaignPayload]);

   useEffect(() => {
      if (selectedTemplateId) {
         const t = templates.find(temp => temp.id === selectedTemplateId);
         if (t) {
            setForm(prev => ({
               ...prev,
               template_id: t.id,
               subject: prev.subject || t.subject,
               html_body: t.html_body,
            }));
         }
      }
   }, [selectedTemplateId, templates]);

   const saveMutation = useMutation({
      mutationFn: createEmailCampaign,
      onSuccess: (data: any) => {
         showSuccess('Campaña creada', 'Borrador guardado exitosamente.');
         queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
         // Redirect to newly created campaign if it was 'new'
         if (!isEdit) navigate(`/email/campaigns/${data.data.id}`);
      }
   });

   const sendMutation = useMutation({
      mutationFn: (id: number) => sendEmailCampaign(id),
      onSuccess: (res: any) => {
         showSuccess('Envío Completado', res.message);
         queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
         navigate('/email');
      },
      onError: (err: any) => showError('Error en envío', err.response?.data?.message || 'Error de servidor'),
   });

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.name || !form.subject || !form.html_body) return showError('Atención', 'Nombre, Asunto y Cuerpo son obligatorios.');
      saveMutation.mutate(form);
   };

   const handleSend = () => {
      if (!isEdit) return showError('Atención', 'Primero guarda el borrador antes de enviar.');
      if (confirm('¿Seguro que deseas iniciar el envío masivo? Esta acción no se puede deshacer.')) {
         sendMutation.mutate(parseInt(id!));
      }
   };

   if (isEdit && loadingCam) return <div className="h-60 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

   return (
      <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 font-body pb-20">

         {/* Header */}
         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/15">
            <div className="flex items-center gap-4">
               <button onClick={() => navigate('/email')} className="p-2 hover:bg-surface-container-low rounded-xl text-on-surface-variant active:scale-95 transition-all">
                  <ArrowLeft size={20} />
               </button>
               <div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">
                     <Send size={12} /> Campaña de Marketing
                  </div>
                  <h1 className="text-2xl font-headline font-extrabold text-primary">
                     {isEdit ? `Campaña: ${form.name}` : 'Configurar Nueva Campaña'}
                  </h1>
               </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
               {!isEdit && (
                  <button
                     onClick={handleSubmit}
                     disabled={saveMutation.isPending}
                     className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-primary/10 text-primary font-headline font-bold rounded-2xl hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                  >
                     {saveMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                     Guardar Borrador
                  </button>
               )}
               {isEdit && (
                  <button
                     onClick={handleSend}
                     disabled={sendMutation.isPending || form.status === 'sent'}
                     className={clsx(
                        "flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 font-headline font-black rounded-2xl shadow-xl transition-all active:scale-95 text-base",
                        form.status === 'sent' ? "bg-emerald-50 text-emerald-700 opacity-50 cursor-not-allowed" : "bg-primary text-on-primary shadow-primary/30"
                     )}
                  >
                     {sendMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                     {form.status === 'sent' ? 'Campaña Enviada ✓' : 'Iniciar Envío Masivo'}
                  </button>
               )}
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Config Area */}
            <div className="lg:col-span-8 flex flex-col gap-6">

               <div className="flex p-1 bg-surface-container-low w-fit rounded-xl">
                  <button
                     onClick={() => setActiveTab('config')}
                     className={clsx(
                        "px-8 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all",
                        activeTab === 'config' ? "bg-white text-primary shadow-sm" : "text-on-surface-variant/50"
                     )}
                  >
                     Configuración
                  </button>
                  <button
                     onClick={() => setActiveTab('preview')}
                     className={clsx(
                        "px-8 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all",
                        activeTab === 'preview' ? "bg-white text-primary shadow-sm" : "text-on-surface-variant/50"
                     )}
                  >
                     Destinatarios ({previewData?.total || 0})
                  </button>
               </div>

               {activeTab === 'config' ? (
                  <div className="space-y-6">
                     {/* Basic Info */}
                     <section className="bg-surface-container-lowest p-8 rounded-[2rem] border border-outline-variant/10 shadow-sm space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Nombre de Campaña</label>
                              <input
                                 type="text" value={form.name}
                                 onChange={e => setForm({ ...form, name: e.target.value })}
                                 placeholder="Ej. Promo Cyber ICEP 2026"
                                 className="w-full h-12 bg-surface-container-low border-none rounded-xl px-5 font-bold text-sm focus:ring-2 focus:ring-primary-fixed outline-none"
                              />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Plantilla Visual</label>
                              <select
                                 value={selectedTemplateId}
                                 onChange={e => setSelectedTemplateId(e.target.value !== '' ? Number(e.target.value) : '')}
                                 className="w-full h-12 bg-surface-container-low border-none rounded-xl px-5 font-bold text-sm focus:ring-2 focus:ring-primary-fixed outline-none"
                              >
                                 <option value="">— Sin plantilla (HTML Manual) —</option>
                                 {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                           </div>
                           <div className="space-y-1.5 md:col-span-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Asunto (Subject)</label>
                              <input
                                 type="text" value={form.subject}
                                 onChange={e => setForm({ ...form, subject: e.target.value })}
                                 placeholder={"Ej. ¡Urgente {{nombre}}! Abrimos vacantes"}
                                 className="w-full h-12 bg-surface-container-low border-none rounded-xl px-5 font-bold text-sm focus:ring-2 focus:ring-primary-fixed outline-none"
                              />
                           </div>
                        </div>
                     </section>

                     {/* HTML Content (Only if manual or showing content) */}
                     <section className="bg-surface-container-lowest p-8 rounded-[2rem] border border-outline-variant/10 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                           <h3 className="font-headline font-bold text-primary flex items-center gap-2">
                              <Inbox size={18} className="text-secondary" />
                              Contenido del Correo
                           </h3>
                           <button className="text-[10px] font-black text-secondary uppercase tracking-widest hover:underline">Vista Previa Completa</button>
                        </div>
                        <textarea
                           value={form.html_body}
                           onChange={e => setForm({ ...form, html_body: e.target.value })}
                           className="w-full h-[300px] bg-slate-900 text-blue-100 rounded-2xl p-6 font-mono text-xs border-none focus:ring-2 focus:ring-primary-fixed custom-scrollbar"
                        />
                     </section>
                  </div>
               ) : (
                  <div className="bg-surface-container-lowest p-8 rounded-[2rem] border border-outline-variant/10 shadow-sm">
                     <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-headline font-bold text-primary">Lista de Destinatarios</h3>
                        <div className="text-xs bg-primary/5 text-primary font-bold px-3 py-1 rounded-full">{previewData?.total || 0} encontrados</div>
                     </div>

                     {loadingPreview ? (
                        <div className="h-40 flex items-center justify-center gap-3">
                           <RefreshCw className="animate-spin text-primary" size={20} />
                           <span className="text-sm font-medium text-on-surface-variant">Escaneando base de datos...</span>
                        </div>
                     ) : previewData?.recipients?.length === 0 ? (
                        <div className="text-center py-20 opacity-40">
                           <Users size={48} className="mx-auto mb-4" />
                           <p className="font-bold">No se encontraron prospectos para los criterios seleccionados.</p>
                        </div>
                     ) : (
                        <div className="overflow-x-auto">
                           <table className="w-full text-left">
                              <thead>
                                 <tr className="border-b border-outline-variant/10">
                                    <th className="pb-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Nombre</th>
                                    <th className="pb-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Correo</th>
                                    <th className="pb-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Estado</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant/5">
                                 {previewData?.recipients?.map((r: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-surface-container-low transition-colors group">
                                       <td className="py-3 text-xs font-bold text-primary">{r.name}</td>
                                       <td className="py-3 text-xs font-medium text-on-surface-variant">{r.email}</td>
                                       <td className="py-3">
                                          <span className="text-[9px] bg-surface-container-high px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">{r.status}</span>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                           {previewData?.total > 50 && (
                              <p className="text-[10px] text-on-surface-variant/60 font-bold mt-4 uppercase text-center">... Mostrando solo los primeros 50 registros</p>
                           )}
                        </div>
                     )}
                  </div>
               )}
            </div>

            {/* Selection Sidebar */}
            <div className="lg:col-span-4 space-y-6 animate-in slide-in-from-right-4 duration-500">

               {/* Recipient Selection */}
               <section className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-2 h-full bg-primary" />
                  <h3 className="font-headline font-bold text-xl text-primary flex items-center gap-2">
                     <Users size={20} className="text-secondary" /> Seleccionar Público
                  </h3>

                  <div className="space-y-3">
                     {[
                        { id: 'leads', icon: Users, label: 'Todos los Prospectos (CRM)', desc: 'Envía a cada lead registrado con correo.' },
                        { id: 'course', icon: BookOpen, label: 'Alumnos de un Curso', desc: 'Envía a los matriculados en un programa.' },
                        { id: 'selected', icon: CheckCircle2, label: 'Selección Manual (WIP)', desc: 'Envía a una lista específica.' },
                     ].map(opt => (
                        <button
                           key={opt.id}
                           onClick={() => setForm({ ...form, recipient_type: opt.id as any })}
                           className={clsx(
                              "w-full p-4 rounded-3xl border-2 text-left transition-all group",
                              form.recipient_type === opt.id ? "bg-primary/5 border-primary shadow-lg scale-[1.02]" : "bg-white border-outline-variant/10 hover:border-primary/20 opacity-70 hover:opacity-100"
                           )}
                        >
                           <div className="flex items-center gap-3 mb-1">
                              <div className={clsx("p-2 rounded-xl", form.recipient_type === opt.id ? "bg-primary text-white" : "bg-surface-container-low text-primary")}>
                                 <opt.icon size={16} />
                              </div>
                              <span className="font-headline font-extrabold text-sm text-primary">{opt.label}</span>
                           </div>
                           <p className="text-[10px] font-medium text-on-surface-variant ml-10 leading-tight">{opt.desc}</p>
                        </button>
                     ))}
                  </div>

                  {form.recipient_type === 'course' && (
                     <div className="space-y-1.5 pt-2 animate-in zoom-in-95 duration-200">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary">Elige el Curso</label>
                        <select
                           value={form.recipient_course_id || ''}
                           onChange={e => setForm({ ...form, recipient_course_id: Number(e.target.value) })}
                           className="w-full bg-white border border-outline-variant/30 rounded-2xl p-3 text-xs font-bold focus:ring-2 focus:ring-primary outline-none"
                        >
                           <option value="">— Seleccionar —</option>
                           {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                     </div>
                  )}
               </section>

               {/* Status Summary */}
               {isEdit && (
                  <section className="bg-primary p-8 rounded-[2.5rem] text-on-primary shadow-xl shadow-primary/20 space-y-4">
                     <h4 className="font-headline font-bold text-lg">Resumen de Envío</h4>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 p-4 rounded-2xl">
                           <p className="text-[9px] font-black uppercase opacity-60">Enviados</p>
                           <p className="text-2xl font-black">{form.sent_count}</p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-2xl">
                           <p className="text-[9px] font-black uppercase opacity-60">Total</p>
                           <p className="text-2xl font-black">{form.total_recipients}</p>
                        </div>
                     </div>
                     {form.status === 'sent' && (
                        <div className="flex items-center gap-2 text-xs font-bold bg-white/20 p-3 rounded-xl">
                           <CheckCircle2 size={16} /> Completado con éxito
                        </div>
                     )}
                  </section>
               )}

               <section className="p-6 bg-surface-container-low rounded-3xl border border-outline-variant/5">
                  <div className="flex items-start gap-3">
                     <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><AlertCircle size={20} /></div>
                     <div>
                        <h4 className="font-bold text-xs text-primary mb-1 uppercase tracking-tight">Antispam Guard</h4>
                        <p className="text-[10px] text-on-surface-variant leading-relaxed">
                           Asegúrate de haber configurado correctamente el servidor SMTP en los ajustes antes de iniciar un envío masivo. Intentos fallidos repetidos pueden marcar tu dominio como spam.
                        </p>
                     </div>
                  </div>
               </section>

            </div>

         </div>
      </div>
   );
}
