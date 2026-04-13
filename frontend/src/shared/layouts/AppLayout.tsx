import { useState, useEffect } from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  Users,
  LayoutDashboard,
  Ticket,
  FileText,
  LogOut,
  Calendar,
  BookOpen,
  Menu,
  TrendingUp,
  Mail,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import logo from '@/assets/logo.png';

export default function AppLayout() {
  const { isAuthenticated, user, logout, hasPermission, hasRole, isLoading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-3 rounded-xl font-body text-sm font-medium transition-all duration-300 ease-in-out ${isActive
      ? 'bg-surface-container-lowest text-primary shadow-sm ghost-border'
      : 'text-on-surface-variant hover:text-primary hover:bg-white/50'
    } ${isCollapsed ? 'justify-center px-0' : ''}`;


  return (
    <div className="min-h-screen bg-surface flex font-body selection:bg-tertiary-fixed selection:text-on-tertiary-fixed">
      {/* Navigation Drawer */}
      <aside className={`fixed left-0 top-0 h-full hidden lg:flex flex-col ${isCollapsed ? 'w-20' : 'w-72'} bg-surface-container-low border-r border-outline-variant/10 z-50 transition-all duration-500 ease-in-out group/sidebar`}>
        <div className="flex flex-col h-full p-4 overflow-hidden">
          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-20 bg-surface-container-high border border-outline-variant/20 rounded-full p-1.5 text-primary shadow-md hover:bg-primary hover:text-white transition-all duration-300 z-50 opacity-0 group-hover/sidebar:opacity-100 hover:scale-110 active:scale-95"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* Brand/Logo Area */}
          <div className={`px-4 py-6 mb-4 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} transition-all duration-500`}>
            <img src={logo} alt="ICEP Logo" className="w-12 h-12 object-contain shrink-0 transition-all duration-500" />

            {!isCollapsed && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-500 overflow-hidden whitespace-nowrap">
                <h1 className="font-headline font-extrabold text-primary text-lg leading-tight uppercase tracking-tight">ICEP CRM</h1>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-60">Admin Portal</p>
              </div>
            )}
          </div>

          {/* User Profile Section (Enhanced) */}
          <div className={`px-4 mb-6 transition-all duration-500 ${isCollapsed ? 'px-0 flex justify-center' : ''}`}>
            <NavLink
              to="/profile"
              className={`flex transition-all group ${isCollapsed ? 'flex-row justify-center p-1' : 'flex-col items-center p-4 bg-surface-container-lowest/50 rounded-3xl ghost-border shadow-sm text-center gap-3'}`}
              title={isCollapsed ? user?.name : "Mi Perfil"}
            >
              <div className={`rounded-full primary-gradient flex items-center justify-center text-white font-bold border-2 border-white shadow-lg overflow-hidden bg-surface-variant shrink-0 transition-all duration-500 group-hover:scale-105 ${isCollapsed ? 'h-12 w-12 text-sm' : 'h-24 w-24 text-2xl'}`}>
                {user?.avatar ? (
                  <img src={user?.avatar} alt={user?.name} className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0) || 'U'
                )}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="mb-1">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/20 shadow-sm">
                      {user?.roles?.[0]?.name || 'Usuario'}
                    </span>
                  </div>
                  <p className="text-sm font-extrabold text-primary truncate uppercase tracking-tight max-w-[200px]">
                    {user?.name}
                  </p>
                  <p className="text-[10px] text-on-surface-variant truncate lowercase opacity-60">
                    {user?.email}
                  </p>
                </div>
              )}
            </NavLink>
          </div>



          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
            <NavLink to="/" className={navItemClass} title={isCollapsed ? "Dashboard" : ""}>
              <LayoutDashboard size={20} className="shrink-0" />
              {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-4 duration-500 whitespace-nowrap">Dashboard</span>}
            </NavLink>

            <NavLink to="/leads" className={navItemClass} title={isCollapsed ? "CRM Ventas (Leads)" : ""}>
              <Users size={20} className="shrink-0" />
              {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-4 duration-500 whitespace-nowrap">CRM Ventas (Leads)</span>}
            </NavLink>

            {(hasRole('admin') || hasRole('jefe')) && (
              <NavLink to="/sales-analysis" className={navItemClass} title={isCollapsed ? "Análisis de Ventas" : ""}>
                <TrendingUp size={20} className="shrink-0" />
                {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-4 duration-500 whitespace-nowrap">Análisis de Ventas</span>}
              </NavLink>
            )}

            {(hasRole('admin') || hasRole('jefe')) && (
              <NavLink to="/email" className={navItemClass} title={isCollapsed ? "Mail Masivo (Mailing)" : ""}>
                <Mail size={20} className="shrink-0" />
                {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-4 duration-500 whitespace-nowrap">Mail Masivo (Mailing)</span>}
              </NavLink>
            )}

            {hasPermission('users.view_all') && (
              <NavLink to="/users" className={navItemClass} title={isCollapsed ? "Usuarios" : ""}>
                <Users size={20} className="shrink-0" />
                {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-4 duration-500 whitespace-nowrap">Usuarios</span>}
              </NavLink>
            )}

            <div className={`pt-6 pb-2 px-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] opacity-50 transition-all ${isCollapsed ? 'text-center px-0 flex justify-center' : ''}`}>
              {isCollapsed ? <div className="w-4 h-px bg-current opacity-30" /> : 'Módulos Académicos'}
            </div>

            <NavLink to="/tickets" className={navItemClass} title={isCollapsed ? "Soporte / Tickets" : ""}>
              <Ticket size={20} className="shrink-0" />
              {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-4 duration-500 whitespace-nowrap">Soporte / Tickets</span>}
            </NavLink>

            <NavLink to="/enrollments" className={navItemClass} title={isCollapsed ? "Matrículas" : ""}>
              <FileText size={20} className="shrink-0" />
              {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-4 duration-500 whitespace-nowrap">Matrículas</span>}
            </NavLink>

            <NavLink to="/calendar" className={navItemClass} title={isCollapsed ? "Calendario Institucional" : ""}>
              <Calendar size={20} className="shrink-0" />
              {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-4 duration-500 whitespace-nowrap">Calendario Institucional</span>}
            </NavLink>

            <NavLink to="/courses" className={navItemClass} title={isCollapsed ? "Catálogo de Cursos" : ""}>
              <BookOpen size={20} className="shrink-0" />
              {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-4 duration-500 whitespace-nowrap">Catálogo de Cursos</span>}
            </NavLink>
          </nav>

          <div className="mt-auto pt-4 border-t border-outline-variant/10">
            <button
              onClick={logout}
              className={`w-full flex items-center gap-3 p-3 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-all active:scale-95 ${isCollapsed ? 'justify-center' : ''}`}
              title="Cerrar Sesión"
            >
              <LogOut size={20} className="shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium animate-in fade-in duration-500">Cerrar Sesión</span>}
            </button>
          </div>

        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-h-screen ${isCollapsed ? 'lg:pl-20' : 'lg:pl-72'} relative transition-all duration-500 ease-in-out`}>
        {/* Top AppBar */}
        <header className="h-16 glass-nav sticky top-0 z-40 flex items-center justify-between px-6 border-b border-outline-variant/10">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-primary hover:bg-surface-container-low transition-colors rounded-xl active:scale-95">
              <Menu size={22} />
            </button>
            <h2 className="font-headline font-bold tracking-tight text-primary lg:hidden">ICEP CRM</h2>
            <div className="hidden lg:block h-6 w-px bg-outline-variant/20 mx-2"></div>
            <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">
              <span className="text-primary/40">Portal</span>
              <span className="text-primary/20">/</span>
              <span>Administración</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />

            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `h-10 w-10 rounded-full primary-gradient flex items-center justify-center text-white text-xs font-bold shadow-md hover:shadow-lg transition-all border-2 border-white overflow-hidden ${isActive ? 'ring-2 ring-primary offset-2' : ''}`
              }
              title="Mi Perfil"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0) || 'U'
              )}
            </NavLink>

            <div className="h-6 w-px bg-outline-variant/20 mx-1"></div>
          </div>
        </header>

        {/* Content Canvas */}
        <div className="flex-1 p-6 lg:p-10 max-w-[1600px] w-full mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
