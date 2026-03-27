import { Outlet, Navigate, Link, NavLink } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { Users, LayoutDashboard, Ticket, FileText, Settings, LogOut, Calendar, BookOpen } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';

export default function AppLayout() {
  const { isAuthenticated, user, logout, hasPermission, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-blue-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r h-screen hidden md:block">
        <div className="h-16 flex items-center px-6 border-b">
          <h1 className="text-xl font-bold text-blue-600">ICEP CRM</h1>
        </div>
        <nav className="p-4 space-y-2">
          <NavLink
            to="/"
            className={({ isActive }: { isActive: boolean }) =>
              `flex items-center gap-3 p-2 rounded-lg font-medium transition ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <LayoutDashboard size={20} />
            Dashboard
          </NavLink>

          {hasPermission('users.view_all') && (
            <NavLink
              to="/users"
              className={({ isActive }: { isActive: boolean }) =>
                `flex items-center gap-3 p-2 rounded-lg font-medium transition ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Users size={20} />
              Usuarios
            </NavLink>
          )}

          <div className="pt-4 pb-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Módulos
          </div>

          <NavLink
            to="/tickets"
            className={({ isActive }: { isActive: boolean }) =>
              `flex items-center gap-3 p-2 rounded-lg font-medium transition ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <Ticket size={20} />
            Tickets
          </NavLink>

          <NavLink
            to="/enrollments"
            className={({ isActive }: { isActive: boolean }) =>
              `flex items-center gap-3 p-2 rounded-lg font-medium transition ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <FileText size={20} />
            Matrículas
          </NavLink>

          <NavLink
            to="/calendar"
            className={({ isActive }: { isActive: boolean }) =>
              `flex items-center gap-3 p-2 rounded-lg font-medium transition ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <Calendar size={20} />
            Calendario
          </NavLink>

          <NavLink
            to="/courses"
            className={({ isActive }: { isActive: boolean }) =>
              `flex items-center gap-3 p-2 rounded-lg font-medium transition ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <BookOpen size={20} />
            Cursos
          </NavLink>
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t bg-white">
           <button onClick={logout} className="flex items-center gap-3 p-2 w-full rounded-lg font-medium text-red-600 hover:bg-red-50 transition">
             <LogOut size={20} />
             Cerrar Sesión
           </button>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">
          <div className="md:hidden">ICEP CRM</div>
          <div className="ml-auto flex items-center gap-4">
             <NotificationBell />
             <div className="h-6 w-px bg-gray-200 mx-1"></div>
             <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name}</span>
             <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
               {user?.name?.charAt(0) || 'U'}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
