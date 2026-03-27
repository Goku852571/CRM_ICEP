import { useState, useEffect } from 'react';
import { getDashboardStats, DashboardStats } from '../services/dashboardService';
import { useAuth } from '@/shared/hooks/useAuth';
import { 
  Users, 
  Shield, 
  Key, 
  Ticket, 
  ArrowUpRight, 
  Clock, 
  Activity 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

const IconMap: any = {
  Users: Users,
  Shield: Shield,
  Key: Key,
  Ticket: Ticket,
};

const ColorMap: any = {
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
  green: 'bg-green-50 text-green-600',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight font-primary">
          ¡Hola, {user?.name}! 👋
        </h1>
        <p className="text-gray-500 mt-1">Bienvenido al panel central de ICEP CRM.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.overview.map((item, idx) => {
          const Icon = IconMap[item.icon] || Activity;
          const colorClasses = ColorMap[item.color] || 'bg-gray-50 text-gray-600';
          
          return (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl ${colorClasses} group-hover:scale-110 transition-transform`}>
                  <Icon size={24} />
                </div>
                <div className="flex items-center text-green-500 text-sm font-medium">
                  <ArrowUpRight size={16} />
                  <span>+12%</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500">{item.label}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{item.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Actividad Semanal</h2>
            <select className="text-sm border-none bg-gray-50 rounded-lg p-1 outline-none text-gray-600">
              <option>Últimos 7 días</option>
              <option>Últimos 30 días</option>
            </select>
          </div>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chart_data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="tickets" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTickets)" strokeWidth={3} />
                <Area type="monotone" dataKey="enrollments" stroke="#8b5cf6" fillOpacity={0} strokeWidth={3} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6 font-primary">Actividad Reciente</h2>
          <div className="space-y-6">
            {stats.recent_activity.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    {item.user.charAt(0)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white border-2 border-white">
                    <div className="h-full w-full rounded-full bg-green-500"></div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {item.user}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {item.action}
                  </p>
                  <div className="flex items-center mt-1 text-[10px] text-gray-400">
                    <Clock size={10} className="mr-1" />
                    {item.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
            Ver todo el log
          </button>
        </div>
      </div>
    </div>
  );
}
