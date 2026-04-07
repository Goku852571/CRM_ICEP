import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Mail, Plus, Settings, FileText, Send, 
  Trash2, Eye, Clock, AlertCircle, CheckCircle2, 
  MoreVertical, Search, Loader2, ChevronRight, User, TrendingUp, Activity, Zap, PieChart
} from 'lucide-react';
import { 
  getEmailCampaigns, getEmailTemplates, 
  deleteEmailCampaign, deleteEmailTemplate, 
  EmailCampaign, EmailTemplate 
} from '../services/emailService';
import { showSuccess, showError } from '@/shared/utils/alerts';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

export default function EmailDashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates'>('campaigns');

  const { data: campaignsPayload, isLoading: loadingCams } = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: getEmailCampaigns,
  });

  const { data: templatesPayload, isLoading: loadingTemps } = useQuery({
    queryKey: ['email-templates'],
    queryFn: getEmailTemplates,
  });

  const deleteCampaignPerm = useMutation({
    mutationFn: deleteEmailCampaign,
    onSuccess: () => {
      showSuccess('Campaña eliminada', 'Se borró el registro correctamente.');
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    }
  });

  const deleteTemplatePerm = useMutation({
    mutationFn: deleteEmailTemplate,
    onSuccess: () => {
      showSuccess('Plantilla eliminada', 'La plantilla seleccionada ha sido borrada.');
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    }
  });

  const campaigns = campaignsPayload?.data || [];
  const templates = templatesPayload?.data || [];

  const getStatusBadge = (status: string) => {
     switch(status) {
        case 'draft': return <span className="bg-surface-container-high text-on-surface-variant font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-widest border border-outline-variant/10 shadow-sm">Borrador</span>;
        case 'sending': return <span className="bg-blue-50 text-blue-700 font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-widest border border-blue-100 shadow-sm animate-pulse">Enviando...</span>;
        case 'sent': return <span className="bg-emerald-50 text-emerald-700 font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-widest border border-emerald-100 shadow-sm">Enviado ✓</span>;
        case 'failed': return <span className="bg-red-50 text-red-700 font-bold text-[10px] px-2 py-0.5 rounded uppercase tracking-widest border border-red-100 shadow-sm">Fallido ⚠</span>;
        default: return status;
     }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 font-body">
      
      {/* Hero Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-4">
        <div className="max-w-4xl">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant/40 mb-3 underline-offset-8 decoration-primary-fixed decoration-4">
            <Mail size={16} /> Módulo de Mailing masivo
          </div>
          <h1 className="font-headline font-extrabold text-primary text-4xl md:text-5xl lg:text-6xl mb-3 tracking-tight leading-[1.1]">
            Comunicación Masiva
          </h1>
          <p className="text-on-surface-variant font-body text-base md:text-lg leading-relaxed opacity-80">
            Llega a tus prospectos y alumnos de forma profesional y automatizada con campañas de alto impacto.
          </p>
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <NavLink to="/email/settings" className="p-5 bg-surface-container-low text-on-surface-variant rounded-2xl hover:bg-surface-container-high transition-all shadow-sm active:scale-95 border border-outline-variant/10">
            <Settings size={24} />
          </NavLink>
          <NavLink 
            to={activeTab === 'campaigns' ? '/email/campaigns/new' : '/email/templates/new'}
            className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-10 py-5 bg-primary text-on-primary font-headline font-black rounded-2xl shadow-2xl shadow-primary/20 hover:scale-105 transition-all active:scale-95 text-xs uppercase tracking-widest"
          >
            <Plus size={20} strokeWidth={3} />
            {activeTab === 'campaigns' ? 'Nueva Campaña' : 'Crear Plantilla'}
          </NavLink>
        </div>
      </div>

      {/* Stats Bento Grid - Dashboard Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Campañas', val: campaigns.length, icon: Send, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'Plantillas HTML', val: templates.length, icon: FileText, color: 'text-on-primary-container', bg: 'bg-secondary-container' },
          { label: 'Tasa de Entrega', val: '98.2%', icon: CheckCircle2, color: 'text-tertiary-fixed-dim', bg: 'bg-tertiary-fixed/5' },
          { label: 'Interacciones', val: '12.5k', icon: Activity, color: 'text-error', bg: 'bg-error/5' },
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
                +4.2%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Control */}
      <div className="flex flex-col gap-6">
         <div className="flex items-center gap-1 bg-surface-container-low w-fit p-1 rounded-2xl border border-outline-variant/5">
            <button 
               onClick={() => setActiveTab('campaigns')}
               className={clsx(
                 "px-8 py-3 rounded-xl font-headline font-extrabold text-sm transition-all",
                 activeTab === 'campaigns' ? "bg-white text-primary shadow-md translate-y-[-1px]" : "text-on-surface-variant/40 hover:text-on-surface-variant"
               )}
            >
               Mis Campañas
            </button>
            <button 
               onClick={() => setActiveTab('templates')}
               className={clsx(
                 "px-8 py-3 rounded-xl font-headline font-extrabold text-sm transition-all",
                 activeTab === 'templates' ? "bg-white text-primary shadow-md translate-y-[-1px]" : "text-on-surface-variant/40 hover:text-on-surface-variant"
               )}
            >
               Plantillas HTML
            </button>
         </div>

         {/* Content Display */}
         <div className="min-h-[400px]">
            {activeTab === 'campaigns' ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                 {loadingCams ? (
                   <div className="col-span-full h-40 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
                 ) : campaigns.length === 0 ? (
                   <div className="col-span-full text-center py-20 bg-surface-container-lowest rounded-[3rem] border border-dashed border-outline-variant/30">
                      <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                         <Send size={32} className="text-primary/20" />
                      </div>
                      <h4 className="font-headline font-bold text-lg text-primary">Sin campañas activas</h4>
                      <p className="text-sm text-on-surface-variant">Empieza creando una nueva campaña para enviar correos.</p>
                   </div>
                 ) : campaigns.map((cam: EmailCampaign) => (
                   <div key={cam.id} className="bg-surface-container-lowest p-6 rounded-[2.5rem] border border-outline-variant/10 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group flex gap-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl translate-x-1/2 translate-y-[-20%] pointer-events-none" />
                      
                      {/* Left: Icon/Details */}
                      <div className="flex-1">
                         <div className="flex items-center gap-3 mb-3">
                            {getStatusBadge(cam.status)}
                            <span className="text-[10px] font-medium text-on-surface-variant/50">ID: CAM-{(cam.id)}</span>
                         </div>
                         <h3 className="text-xl font-headline font-extrabold text-primary mb-1 line-clamp-1">{cam.name}</h3>
                         <p className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 mb-4">
                            <AlertCircle size={12} className="text-secondary" /> Asunto: {cam.subject}
                         </p>
                         
                         <div className="flex items-center gap-6 mt-auto">
                            <div className="space-y-0.5">
                               <p className="text-[10px] font-black uppercase text-on-surface-variant/30 tracking-widest">Enviados</p>
                               <p className="text-sm font-black text-on-surface">{cam.sent_count} / {cam.total_recipients}</p>
                            </div>
                            <div className="w-px h-8 bg-outline-variant/10" />
                            <div className="space-y-0.5">
                               <p className="text-[10px] font-black uppercase text-on-surface-variant/30 tracking-widest">Fecha</p>
                               <p className="text-sm font-bold text-on-surface">{cam.sent_at ? formatDistanceToNow(new Date(cam.sent_at), { addSuffix: true, locale: es }) : 'Borrador'}</p>
                            </div>
                         </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col justify-between items-end">
                         <div className="p-2 bg-surface rounded-2xl border border-outline-variant/10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button onClick={() => navigate(`/email/campaigns/${cam.id}`)} className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-all"><Eye size={18} /></button>
                            <button onClick={() => { if(confirm('¿Eliminar campaña?')) deleteCampaignPerm.mutate(cam.id); }} className="p-2 hover:bg-error/10 text-error rounded-xl transition-all"><Trash2 size={18} /></button>
                         </div>
                         <button onClick={() => navigate(`/email/campaigns/${cam.id}`)} className="w-10 h-10 rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
                            <ChevronRight size={20} strokeWidth={3} />
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {loadingTemps ? (
                   <div className="col-span-full h-40 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
                 ) : templates.length === 0 ? (
                   <div className="col-span-full text-center py-20 bg-surface-container-lowest rounded-[3rem] border border-dashed border-outline-variant/30">
                      <div className="w-20 h-20 bg-secondary/5 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                         <FileText size={32} className="text-secondary/20" />
                      </div>
                      <h4 className="font-headline font-bold text-lg text-primary">Sin plantillas</h4>
                      <p className="text-sm text-on-surface-variant">Diseña tu primera plantilla HTML para tus envíos.</p>
                   </div>
                 ) : templates.map((temp: EmailTemplate) => (
                   <div key={temp.id} className="bg-surface-container-lowest rounded-[2.5rem] border border-outline-variant/10 shadow-sm overflow-hidden group hover:shadow-xl transition-all flex flex-col">
                      <div className="h-44 bg-surface-container-low border-b border-outline-variant/10 overflow-hidden relative group-hover:bg-primary/5 transition-colors">
                         <div className="absolute inset-x-4 top-4 bottom-[-400%] bg-white rounded-t-xl shadow-2xl overflow-hidden transition-all scale-90 group-hover:scale-95 origin-top pointer-events-none border border-outline-variant/10">
                             <iframe 
                                title={`preview-${temp.id}`}
                                srcDoc={temp.html_body?.replace(/{{nombre}}/g, 'Juan Pérez')}
                                className="w-[200%] h-[200%] transform scale-50 origin-top-left border-none pointer-events-none"
                             />
                         </div>
                         <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low/80 via-transparent to-transparent pointer-events-none" />
                         <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-black text-primary shadow-xl border border-primary/10">
                               Ver Diseño
                            </span>
                         </div>
                         <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent flex items-end p-4">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1 backdrop-blur-md bg-black/10 px-2 py-0.5 rounded shadow-sm">
                               <Clock size={10} /> {new Date(temp.created_at).toLocaleDateString()}
                            </span>
                         </div>
                      </div>
                      <div className="p-6 space-y-4 flex-1 flex flex-col">
                         <div>
                            <h4 className="font-headline font-extrabold text-primary line-clamp-1">{temp.name}</h4>
                            <p className="text-[11px] font-bold text-on-surface-variant/60 line-clamp-1 truncate">{temp.subject}</p>
                         </div>
                         <div className="flex items-center justify-between mt-auto pt-4 border-t border-dashed border-outline-variant/10">
                            <span className="text-[10px] font-bold text-secondary-fixed-variant uppercase tracking-tighter">Por {temp.created_by_user?.name || 'Sistema'}</span>
                            <div className="flex gap-1">
                               <button onClick={() => navigate(`/email/templates/${temp.id}`)} className="p-2 hover:bg-primary/5 text-primary rounded-lg transition-all"><FileText size={16} /></button>
                               <button onClick={() => { if(confirm('¿Eliminar plantilla?')) deleteTemplatePerm.mutate(temp.id); }} className="p-2 hover:bg-error/5 text-error rounded-lg transition-all"><Trash2 size={16} /></button>
                            </div>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
