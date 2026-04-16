import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, Save, ArrowLeft, Code, Eye, 
  HelpCircle, ChevronRight, Info, Loader2, Trash2 
} from 'lucide-react';
import { 
  getEmailTemplates, createEmailTemplate, updateEmailTemplate, 
  deleteEmailTemplate, EmailTemplate 
} from '../services/emailService';
import { showSuccess, showError, showConfirmDanger } from '@/shared/utils/alerts';
import clsx from 'clsx';

export default function EmailTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = id && id !== 'new';

  const [form, setForm] = useState<Partial<EmailTemplate>>({
    name: '',
    subject: '',
    html_body: '',
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const { data: templatesPayload, isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: getEmailTemplates,
    enabled: !!isEdit,
  });

  useEffect(() => {
    if (isEdit && templatesPayload?.data) {
      const t = templatesPayload.data.find((x: any) => x.id === parseInt(id));
      if (t) setForm(t);
    }
  }, [isEdit, templatesPayload, id]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<EmailTemplate>) => 
      isEdit ? updateEmailTemplate(parseInt(id), data) : createEmailTemplate(data),
    onSuccess: () => {
      showSuccess('Plantilla Guardada', 'La plantilla de correo está lista para usar.');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      navigate(-1);
    },
    onError: (err: any) => showError('Error al guardar', err.response?.data?.message || 'Revisa los campos'),
  });

  const deleteMutation = useMutation({
    mutationFn: (templateId: number) => deleteEmailTemplate(templateId),
    onSuccess: () => {
      showSuccess('Eliminado', 'La plantilla ha sido borrada.');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      navigate(-1);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.subject || !form.html_body) {
      return showError('Incompleto', 'Todos los campos son obligatorios.');
    }
    saveMutation.mutate(form);
  };

  if (isEdit && isLoading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={40} />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 font-body">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/15">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface-container-low rounded-xl text-on-surface-variant active:scale-95 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
               <Code size={12} /> Editor de Correo HTML
            </div>
            <h1 className="text-2xl font-headline font-extrabold text-primary">
              {isEdit ? `Editando: ${form.name}` : 'Nueva Plantilla HTML'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isEdit && (
            <button 
               onClick={async () => { if(await showConfirmDanger('¿Eliminar Plantilla?', '¿Estás seguro de que deseas borrar esta plantilla?')) deleteMutation.mutate(parseInt(id!)); }}
               disabled={deleteMutation.isPending}
               className="p-3 bg-error/10 text-error rounded-xl hover:bg-error transition-all hover:text-white"
            >
               <Trash2 size={20} />
            </button>
          )}
          <button 
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-primary text-on-primary font-headline font-bold rounded-2xl shadow-lg shadow-primary/20 hover:opacity-95 transition-all active:scale-95"
          >
            {saveMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isEdit ? 'Actualizar Plantilla' : 'Guardar Plantilla'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Form and Editor (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          <div className="bg-surface-container-lowest rounded-[2rem] p-6 border border-outline-variant/10 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Nombre Interno</label>
              <input 
                type="text" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Ej. Recordatorio de Pago"
                className="w-full h-11 bg-surface-container-low border-none rounded-xl px-4 font-bold text-sm text-on-surface focus:ring-2 focus:ring-primary-fixed outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">Asunto del Correo (Subject)</label>
              <input 
                type="text" value={form.subject}
                onChange={e => setForm({...form, subject: e.target.value})}
                placeholder="Ej. ¡Hola {{nombre}}! No pierdas tu lugar"
                className="w-full h-11 bg-surface-container-low border-none rounded-xl px-4 font-bold text-sm text-on-surface focus:ring-2 focus:ring-primary-fixed outline-none"
              />
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-[2rem] p-4 border border-outline-variant/10 shadow-sm flex flex-col h-[600px] overflow-hidden">
             
             {/* Editor Tabs Container */}
             <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex p-1 bg-surface-container-low rounded-xl">
                   <button 
                      onClick={() => setActiveTab('editor')}
                      className={clsx(
                        "flex items-center gap-2 px-6 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all",
                        activeTab === 'editor' ? "bg-white text-primary shadow-sm" : "text-on-surface-variant/50"
                      )}
                   >
                      <Code size={14} /> Código HTML
                   </button>
                   <button 
                      onClick={() => setActiveTab('preview')}
                      className={clsx(
                        "flex items-center gap-2 px-6 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all",
                        activeTab === 'preview' ? "bg-white text-primary shadow-sm" : "text-on-surface-variant/50"
                      )}
                   >
                      <Eye size={14} /> Vista Previa
                   </button>
                </div>
                
                <div className="hidden sm:flex items-center gap-4 text-[10px] text-on-surface-variant/60 font-bold">
                   <span className="flex items-center gap-1"><Info size={12} /> Use {'{{nombre}}'} para personalizar</span>
                </div>
             </div>

             <div className="flex-1 relative bg-surface shadow-inner rounded-2xl overflow-hidden border border-outline-variant/5">
                {activeTab === 'editor' ? (
                  <textarea 
                    value={form.html_body}
                    onChange={e => setForm({...form, html_body: e.target.value})}
                    placeholder={"<html>\\n  <body>\\n    <h1>Hola {{nombre}}</h1>\\n  </body>\\n</html>"}
                    className="absolute inset-0 w-full h-full p-6 text-sm font-mono leading-relaxed bg-[#1e293b] text-blue-100 border-none outline-none resize-none custom-scrollbar"
                    style={{ fontFeatureSettings: '"tnum" 1' }}
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-white overflow-y-auto">
                     <iframe 
                        title="Vista Previa"
                        className="w-full h-full border-none"
                        srcDoc={form.html_body?.replace(/{{nombre}}/g, 'Juan Pérez')}
                     />
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* Sidebar Help (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
           <section className="bg-primary/5 rounded-[2.5rem] p-8 border border-primary/10 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <HelpCircle size={24} />
                 </div>
                 <h3 className="font-headline font-extrabold text-xl text-primary">Variables de Personalización</h3>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                 Puedes usar etiquetas dinámicas que se reemplazarán automáticamente con la información de cada destinatario al enviar.
              </p>
              
              <div className="space-y-3">
                 {[
                   { tag: '{{nombre}}', desc: 'Nombre completo del prospecto.' },
                   { tag: '{{email}}', desc: 'Dirección de correo electrónico.' },
                   { tag: '{{fecha}}', desc: 'Fecha actual en formato largo.' },
                   { tag: '{{curso}}', desc: 'Nombre del curso si aplica.' },
                 ].map(v => (
                   <div key={v.tag} className="flex items-start gap-4 p-4 bg-white/50 border border-outline-variant/10 rounded-2xl group hover:border-primary/20 transition-all">
                      <code className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg shrink-0">{v.tag}</code>
                      <span className="text-[11px] text-on-surface-variant font-medium leading-tight">{v.desc}</span>
                   </div>
                 ))}
              </div>
              
              <div className="pt-2">
                 <div className="flex items-center gap-2 p-3 bg-secondary-container/20 rounded-2xl border border-secondary/10">
                    <Info size={14} className="text-secondary shrink-0" />
                    <p className="text-[10px] text-secondary font-black uppercase tracking-tight leading-tight">
                       Escribe el HTML completo incluyendo estilos CSS inline para mejor compatibilidad.
                    </p>
                 </div>
              </div>
           </section>

           <section className="bg-surface-container-low rounded-[2rem] p-6 border border-outline-variant/5">
              <h4 className="font-bold text-sm text-on-surface mb-2">Consejos de Envío</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs text-on-surface-variant">
                   <ChevronRight size={14} className="text-primary-fixed-variant" />
                   Estructura con tablas para Gmail/Outlook.
                </li>
                <li className="flex items-center gap-2 text-xs text-on-surface-variant">
                   <ChevronRight size={14} className="text-primary-fixed-variant" />
                   Evita usar imágenes pesadas.
                </li>
                <li className="flex items-center gap-2 text-xs text-on-surface-variant">
                   <ChevronRight size={14} className="text-primary-fixed-variant" />
                   CSS inline es obligatorio para correos.
                </li>
              </ul>
           </section>
        </div>

      </div>
    </div>
  );
}
