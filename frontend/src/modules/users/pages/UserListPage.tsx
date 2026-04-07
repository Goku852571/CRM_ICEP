import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, deleteUser, User, Role } from '../services/userService';
import UserFormModal from '../components/UserFormModal';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  Mail,
  UserPlus,
  TrendingUp,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Activity,
  Zap,
  ShieldCheck,
  Users
} from 'lucide-react';
import { showConfirmDanger, showSuccess, showError } from '@/shared/utils/alerts';
import { useAuth } from '@/shared/hooks/useAuth';

export default function UserListPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', searchTerm],
    queryFn: () => getUsers(1, searchTerm),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccess('Eliminado', 'El usuario ha sido eliminado correctamente.');
    },
    onError: () => showError('Error', 'No se pudo eliminar el usuario.'),
  });

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirmDanger(
      '¿Eliminar usuario?',
      'Esta acción no se puede deshacer.'
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const users = data?.data || [];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Hero Header Section */}
      <div className="max-w-4xl">
        <h1 className="font-headline font-extrabold text-primary text-4xl md:text-5xl lg:text-6xl mb-3 tracking-tight leading-[1.1]">
          Gestión de Usuarios
        </h1>
        <p className="text-on-surface-variant font-body text-base md:text-lg leading-relaxed opacity-80">
          Registro institucional, asigna roles de registro y mantén la integridad de los permisos del personal administrativo.
        </p>
      </div>

      {/* Stats Bento Grid - Dashboard Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Personal Total', val: users.length, icon: Users, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'Administradores', val: users.filter((u: User) => u.roles?.some((r: Role) => r.name === 'admin')).length, icon: ShieldCheck, color: 'text-on-primary-container', bg: 'bg-secondary-container' },
          { label: 'Operativos', val: users.filter((u: User) => u.roles?.some((r: Role) => r.name !== 'admin')).length, icon: Activity, color: 'text-tertiary-fixed-dim', bg: 'bg-tertiary-fixed/5' },
          { label: 'Solicitudes', val: 0, icon: Zap, color: 'text-error', bg: 'bg-error/5' },
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
                +1.2%
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Left Column: Actions & Filters */}
        <div className="w-full md:w-80 space-y-6 shrink-0">
          {hasPermission('users.create') && (
            <button
              onClick={() => {
                setSelectedUser(null);
                setIsModalOpen(true);
              }}
              className="w-full py-5 bg-tertiary-fixed text-on-tertiary-fixed rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-tertiary-fixed/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={20} /> Nuevo Usuario
            </button>
          )}

          <div className="bg-surface-container-low p-6 rounded-3xl space-y-6 ghost-border">
            <h3 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Filter size={14} /> Refinar Búsqueda
            </h3>

            <div className="relative group">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30" />
              <input
                type="text"
                placeholder="Nombre o correo..."
                className="w-full pl-10 pr-4 py-3 bg-white border-outline-variant/10 rounded-xl text-xs font-bold text-black focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-1">Distritos Populares</p>
              {['Quito', 'Guayaquil', 'Riobamba', 'Cuenca'].map(city => (
                <button key={city} className="w-full text-left px-4 py-2 rounded-lg text-[10px] font-bold text-on-surface-variant/60 hover:bg-white hover:text-primary transition-all">
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: User List Workspace */}
        <div className="flex-1 bg-surface-container-lowest rounded-[2.5rem] ghost-border overflow-hidden flex flex-col shadow-2xl shadow-black/5">
          <div className="p-6 flex items-center justify-between bg-surface-container-low/30 border-b border-outline-variant/5">
            <div className="relative flex-1 max-w-md group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Buscar personal por nombre o correo..."
                className="w-full pl-12 pr-4 py-3 bg-surface-container-high/50 border-none rounded-2xl text-sm font-medium text-black focus:ring-2 focus:ring-primary/10 placeholder:text-on-surface-variant/40 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="ml-4 p-3 rounded-xl hover:bg-surface-container-high transition-colors text-on-surface-variant">
              <Filter size={20} />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-on-surface-variant text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-8 py-6">Miembro del Personal</th>
                  <th className="px-8 py-6">Rol del Sistema</th>
                  <th className="px-8 py-6">Estado</th>
                  <th className="px-8 py-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-transparent">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="px-8 py-6"><div className="h-12 bg-surface-container-low rounded-xl" /></td>
                    </tr>
                  ))
                ) : (
                  users.map((u: User) => (
                    <tr key={u.id} className="hover:bg-surface-container-low/50 transition-all duration-300 group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full primary-gradient flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-sm transition-transform group-hover:scale-105">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-primary tracking-tight">{u.name}</div>
                            <div className="text-[11px] font-medium text-on-surface-variant opacity-60 lowercase">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary-container text-on-secondary-container text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm">
                          <Shield size={12} />
                          {u.roles?.[0]?.name || 'Usuario'}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-tertiary-fixed shadow-[0_0_8px_rgba(111,251,190,0.5)]" />
                          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-tight">Activo</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          <button
                            onClick={() => handleEdit(u)}
                            className="p-2.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-xl transition-all"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          {hasPermission('users.delete') && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-2.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-all"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-8 bg-surface-container-low/30 flex items-center justify-between border-t border-outline-variant/10">
            <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest leading-none">
              Mostrando {users.length} miembros del personal administrativo
            </span>
            <div className="flex gap-2">
              <button className="px-5 py-2.5 bg-white ghost-border rounded-xl text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all active:scale-95 disabled:opacity-30">
                Anterior
              </button>
              <button className="px-5 py-2.5 bg-white ghost-border rounded-xl text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all active:scale-95 disabled:opacity-30">
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security Matrix Placeholder */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: Shield, title: 'Ámbito de Admin', border: 'border-primary', items: ['Full System Configuration', 'User Onboarding/Offboarding', 'Financial Records Access'] },
          { icon: ArrowRight, title: 'Ámbito de Registro', border: 'border-on-primary-container', items: ['Academic Record Modification', 'Enrollment Verification', 'Transcript Generation'] },
          { icon: HelpCircle, title: 'Ámbito de Soporte', border: 'border-tertiary-fixed-dim', items: ['View Student Summaries', 'Ticket Management', 'Limited Data Modification'] }
        ].map((scope, i) => (
          <div key={i} className={`bg-surface-container-low p-8 rounded-3xl border-l-8 ${scope.border} ghost-border hover:bg-white hover:shadow-xl transition-all duration-500`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <scope.icon size={20} className="text-primary" />
              </div>
              <h4 className="font-headline font-extrabold text-primary">{scope.title}</h4>
            </div>
            <ul className="space-y-4">
              {scope.items.map((item, j) => (
                <li key={j} className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-tertiary-fixed-dim mt-0.5" />
                  <span className="text-xs font-bold text-on-surface-variant/80 uppercase tracking-tight">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
      />
    </div>
  );
}
