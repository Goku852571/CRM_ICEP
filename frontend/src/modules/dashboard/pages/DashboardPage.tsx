import { useState, useEffect } from 'react';
import { getDashboardStats, DashboardStats } from '../services/dashboardService';
import EnrollmentReportModal from '../components/EnrollmentReportModal';
import { useAuth } from '@/shared/hooks/useAuth';
import { 
  Users, 
  Shield, 
  Key, 
  Ticket, 
  ArrowUpRight, 
  Clock, 
  Activity,
  School,
  TrendingUp,
  PieChart,
  ArrowRight,
  FileText,
  Target,
  Zap
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const IconMap: any = {
  Users: Users,
  Shield: Shield,
  Key: Key,
  Ticket: Ticket,
  School: School,
  FileText: FileText,
  Target: Target,
  Zap: Zap,
  Activity: Activity,
};

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin') || hasRole('jefe');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Header Section */}
      <div className="max-w-3xl px-4 md:px-0">
        <h1 className="font-headline font-extrabold text-primary text-3xl md:text-5xl lg:text-6xl mb-3 tracking-tight leading-[1.1]">
          {isAdmin ? 'Vista General Ejecutiva' : 'Mi Panel de Trabajo'}
        </h1>
        <p className="text-on-surface-variant font-body text-base md:text-lg leading-relaxed opacity-80">
          {isAdmin
            ? `Hola, ${user?.name}. Aquí tienes los diagnósticos de matrícula en tiempo real.`
            : `Hola, ${user?.name}. Tu resumen de actividad del día.`
          }
        </p>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 px-4 md:px-0">
        {stats.overview.map((item, idx) => {
          const Icon = IconMap[item.icon] || Activity;
          
          return (
            <div 
              key={idx} 
              className="bg-surface-container-lowest rounded-2xl p-6 ghost-border flex flex-col justify-between h-44 group hover:bg-white hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 rounded-xl bg-surface-container-low group-hover:bg-primary group-hover:text-tertiary-fixed transition-colors duration-300">
                  <Icon size={22} />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/60 block mb-1">
                    {item.label}
                  </span>
                  <div className="text-3xl font-headline font-extrabold text-primary tabular-nums">
                    {item.value}
                  </div>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div className="flex gap-1 items-end h-8">
                  {[3, 5, 4, 7, 6].map((h, i) => (
                    <div 
                      key={i} 
                      className={`w-1.5 rounded-full transition-all duration-500 ${
                        idx % 2 === 0 ? 'bg-tertiary-fixed' : 'bg-on-primary-container'
                      }`} 
                      style={{ height: `${h * 4}px`, transitionDelay: `${i * 50}ms` }}
                    />
                  ))}
                </div>
                <div className={`text-[10px] font-bold flex items-center px-2.5 py-1 rounded-full ${
                  idx % 2 === 0 
                  ? 'text-on-tertiary-fixed bg-tertiary-fixed/30' 
                  : 'text-on-primary-container bg-secondary-container'
                }`}>
                  <TrendingUp size={12} className="mr-1" />
                  +4.2%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dashboard Body: Asymmetric Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Activity Feed (Left 2/3) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="font-headline font-bold text-2xl text-primary mb-1">Actividad Reciente</h3>
              <p className="text-sm text-on-surface-variant opacity-70">Canal en vivo de interacciones y cambios administrativos.</p>
            </div>
            <button className="text-on-primary-container text-xs font-bold underline underline-offset-8 hover:opacity-100 opacity-60 transition-all uppercase tracking-wider">
              Ver Historial
            </button>
          </div>

          <div className="space-y-4">
            {stats.recent_activity.map((item) => (
              <div 
                key={item.id} 
                className="bg-surface-container-low/50 p-5 rounded-2xl flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all duration-300 ghost-border"
              >
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden truncate">
                  <div className="h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-full primary-gradient flex items-center justify-center text-white font-bold text-base md:text-lg border-2 border-white shadow-sm transition-transform group-hover:scale-105">
                    {item.user.charAt(0)}
                  </div>
                  <div className="truncate">
                    <h4 className="font-bold text-primary text-xs md:text-sm truncate">
                      {item.user} <span className="font-normal text-on-surface-variant/80 hidden sm:inline">{item.action}</span>
                    </h4>
                    <p className="text-[10px] font-medium text-on-surface-variant/60 uppercase tracking-wider mt-0.5">
                      {item.time} • REF: #REG-{item.id}
                    </p>
                  </div>
                </div>
                <div className="status-jewel shrink-0 group-hover:bg-tertiary-fixed transition-colors">
                  <div className="status-dot bg-tertiary-fixed-variant group-hover:bg-on-tertiary-fixed"></div>
                  <span className="group-hover:text-on-tertiary-fixed text-[9px] md:text-xs">
                    {isAdmin ? 'REGISTRO' : 'ACTIVIDAD'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Weekly Activity Chart Inline */}
          <div className="bg-surface-container-lowest rounded-3xl p-8 ghost-border mt-12">
            <h3 className="font-headline font-bold text-lg text-primary mb-8 flex items-center gap-2">
              <Activity size={18} className="text-on-primary-container" />
              Métricas de Rendimiento Semanal
            </h3>
            <div className="h-[350px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chart_data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#008cc7" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#008cc7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 700}} 
                    dy={15} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 700}} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      backgroundColor: '#ffffff'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tickets" 
                    stroke="#008cc7" 
                    fillOpacity={1} 
                    fill="url(#colorPrimary)" 
                    strokeWidth={4} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="enrollments" 
                    stroke="#6ffbbe" 
                    fillOpacity={0} 
                    strokeWidth={4} 
                    strokeDasharray="8 8" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Secondary Column (Right 1/3) */}
        <div className="space-y-12">
          {/* Distribution Section - solo para admin/jefe */}
          {isAdmin && (
          <section className="bg-white p-8 rounded-3xl ghost-border">
            <h3 className="font-headline font-bold text-xl text-primary mb-8 flex items-center gap-2">
              <PieChart className="text-on-primary-container" size={20} />
              Carga por Departamento
            </h3>
            <div className="space-y-8">
              {[
                { label: 'Facultad de Artes', val: 4210, color: 'bg-on-primary-container', pct: 35 },
                { label: 'Investigación Stem', val: 6842, color: 'bg-tertiary-fixed-variant', pct: 55 },
                { label: 'Ciencias Sociales', val: 1790, color: 'bg-primary', pct: 10 }
              ].map((dept, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.15em] text-on-surface-variant">
                    <span>{dept.label}</span>
                    <span className="text-primary">{dept.val.toLocaleString()} Est.</span>
                  </div>
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className={`${dept.color} h-full rounded-full transition-all duration-1000`} style={{ width: `${dept.pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          )}

          {/* Panel de accesos rápidos para Asesor */}
          {!isAdmin && (
          <section className="bg-white p-8 rounded-3xl ghost-border">
            <h3 className="font-headline font-bold text-xl text-primary mb-6 flex items-center gap-2">
              <Zap className="text-on-primary-container" size={20} />
              Acciones Rápidas
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Nuevo Lead', href: '/crm', icon: Users, color: 'bg-blue-50 text-blue-700' },
                { label: 'Ver Matrículas', href: '/enrollments', icon: FileText, color: 'bg-purple-50 text-purple-700' },
                { label: 'Mis Tickets', href: '/tickets', icon: Ticket, color: 'bg-green-50 text-green-700' },
              ].map((action, i) => (
                <a key={i} href={action.href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-all group">
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <action.icon size={16} />
                  </div>
                  <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">{action.label}</span>
                  <ArrowRight size={14} className="ml-auto text-outline opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </section>
          )}

          {/* Institution Banner Card - solo admin */}
          {isAdmin && (
          <div className="relative overflow-hidden rounded-3xl primary-gradient p-10 text-white shadow-2xl shadow-primary/40 group">
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-tertiary-fixed mb-4 block">Portal de Auditoría Premium</span>
              <h4 className="font-headline font-bold text-3xl leading-tight mb-4 group-hover:translate-x-1 transition-transform">Generar Informe de Matrículas</h4>
              <p className="text-xs text-white/70 mb-8 leading-relaxed">
                La ventana de Auditoría Institucional 2024 ya está abierta. Todos los datos de inscripción deben ser verificados y consolidados antes del viernes.
              </p>
              <button 
                onClick={() => setShowReportModal(true)}
                className="bg-tertiary-fixed text-on-tertiary-fixed px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white transition-all active:scale-95 shadow-xl shadow-black/20"
              >
                Generar Informe <ArrowRight size={16} />
              </button>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-tertiary-fixed/10 rounded-full blur-2xl -ml-12 -mb-12"></div>
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-on-primary-container/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          </div>
          )}

          {/* Modal de Informe */}
          {showReportModal && (
            <EnrollmentReportModal onClose={() => setShowReportModal(false)} />
          )}
          
          {/* Quick Support Links */}
          <div className="bg-surface-container-low/30 rounded-3xl p-6 border border-dashed border-outline-variant/30 text-center">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 opacity-60">¿Necesitas ayuda?</p>
            <p className="text-[10px] text-on-surface-variant mb-4">Accede a la documentación del Portal Administrativo.</p>
            <button className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:text-on-primary-container transition-colors">
              Explorar Guías
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
