import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect } from 'react';
import { createUser, updateUser, getRoles, Role, User } from '../services/userService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Shield, Mail, User as UserIcon, Lock, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { showSuccess, showError } from '@/shared/utils/alerts';

const userSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(4, 'Mínimo 4 caracteres').optional().or(z.literal('')),
  roles: z.array(z.string()).min(1, 'Selecciona al menos un rol'),
  id_number: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  isOpen: boolean;
  user?: User | null;
  onClose: () => void;
}

export default function UserFormModal({ isOpen, user, onClose }: UserFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!user;

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      roles: [],
      id_number: '',
      phone: '',
      avatar: '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        roles: user.roles.map((r) => r.name),
        password: '',
        id_number: user.id_number || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
      });
    } else {
      reset({
        name: '',
        email: '',
        password: '',
        roles: [],
        id_number: '',
        phone: '',
        avatar: '',
      });
    }
  }, [user, reset, isOpen]);

  const onSubmit = async (data: UserFormData) => {
    try {
      if (isEdit && user) {
        await updateUser(user.id, data);
        showSuccess('Usuario Actualizado', 'Los cambios se han guardado correctamente.');
      } else {
        await createUser(data);
        showSuccess('Usuario Creado', 'La invitación se ha enviado con éxito.');
      }
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    } catch (error) {
      showError('Error', 'No se pudo procesar la solicitud del usuario.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-primary/20 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-surface-container-lowest rounded-[2.5rem] w-full max-w-xl shadow-2xl shadow-primary/20 overflow-hidden flex flex-col ghost-border animate-in zoom-in-95 duration-500 origin-center">

        {/* Editorial Modal Header */}
        <div className="px-10 py-8 bg-surface-container-low/30 border-b border-outline-variant/5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isEdit ? 'bg-primary text-white' : 'bg-tertiary-fixed text-on-tertiary-fixed'} shadow-lg shadow-black/5`}>
              <UserIcon size={20} />
            </div>
            <div>
              <h2 className="font-headline font-extrabold text-primary text-xl leading-none mb-1">
                {isEdit ? 'Modificar Credenciales' : 'Incorporar Personal'}
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                {isEdit ? 'Gestión de Perfil Administrativo' : 'Asignación de Roles de Registro'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white border border-outline-variant/10 rounded-2xl text-on-surface-variant hover:bg-surface-container-high transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-10 space-y-8 overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-outline-variant/20">
          {/* Identity Section */}
          <div className="grid gap-6">
            <div className="relative group">
              <span className="absolute left-5 top-[18px] text-on-surface-variant/30 group-focus-within:text-primary transition-colors">
                <UserIcon size={18} />
              </span>
              <input
                {...register('name')}
                placeholder="Nombre Completo del Miembro"
                className={`w-full pl-14 pr-6 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-bold text-black placeholder:text-gray-500 focus:ring-4 focus:ring-primary/5 transition-all ${errors.name ? 'ring-2 ring-error/20' : ''}`}
              />
              {errors.name && <p className="text-error text-[10px] font-black uppercase tracking-widest mt-2 ml-2">{errors.name.message}</p>}
            </div>

            <div className="relative group">
              <span className="absolute left-5 top-[18px] text-on-surface-variant/30 group-focus-within:text-primary transition-colors">
                <Mail size={18} />
              </span>
              <input
                type="email"
                {...register('email')}
                placeholder="Dirección de Correo Institucional"
                className={`w-full pl-14 pr-6 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-bold text-black placeholder:text-gray-500 focus:ring-4 focus:ring-primary/5 transition-all ${errors.email ? 'ring-2 ring-error/20' : ''}`}
              />
              {errors.email && <p className="text-error text-[10px] font-black uppercase tracking-widest mt-2 ml-2">{errors.email.message}</p>}
            </div>

            <div className="relative group">
              <span className="absolute left-5 top-[18px] text-on-surface-variant/30 group-focus-within:text-primary transition-colors">
                <Lock size={18} />
              </span>
              <input
                type="password"
                {...register('password')}
                placeholder={isEdit ? "Contraseña (dejar vacío p/ no cambiar)" : "Contraseña de Acceso Silencioso"}
                className={`w-full pl-14 pr-6 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-bold text-black placeholder:text-gray-500 focus:ring-4 focus:ring-primary/5 transition-all ${errors.password ? 'ring-2 ring-error/20' : ''}`}
              />
              {errors.password && <p className="text-error text-[10px] font-black uppercase tracking-widest mt-2 ml-2">{errors.password.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="relative group">
                <input
                  {...register('id_number')}
                  placeholder="Cédula / Documento de Identidad"
                  className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-bold text-black placeholder:text-gray-500 focus:ring-4 focus:ring-primary/5 transition-all"
                />
              </div>

              <div className="relative group">
                <input
                  {...register('phone')}
                  placeholder="Teléfono Principal"
                  className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-bold text-black placeholder:text-gray-500 focus:ring-4 focus:ring-primary/5 transition-all"
                />
              </div>
            </div>

            <div className="relative group">
              <input
                {...register('avatar')}
                placeholder="URL de Foto de Perfil (Opcional)"
                className="w-full px-6 py-4 bg-surface-container-low border-none rounded-2xl text-sm font-bold text-black placeholder:text-gray-500 focus:ring-4 focus:ring-primary/5 transition-all"
              />
            </div>
          </div>

          {/* Roles Selection (Status Jewels Grid) */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] flex items-center gap-2">
              <Shield size={14} /> Ámbito de Autoridad
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {rolesData?.data?.map((role: Role) => (
                <label key={role.id} className="relative cursor-pointer group">
                  <input
                    type="checkbox"
                    value={role.name}
                    {...register('roles')}
                    className="peer sr-only"
                  />
                  <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-surface-container-low group-hover:bg-surface-container-high transition-all ring-primary peer-checked:bg-primary peer-checked:shadow-xl peer-checked:shadow-primary/20">
                    <div className="w-5 h-5 rounded-full border-2 border-outline-variant/30 peer-checked:border-tertiary-fixed flex items-center justify-center transition-all bg-white/10">
                      <CheckCircle2 size={12} className="text-tertiary-fixed opacity-0 peer-checked:opacity-100 scale-0 peer-checked:scale-100 transition-all" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60 peer-checked:text-white">
                      {role.name}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            {errors.roles && <p className="text-error text-[10px] font-black uppercase tracking-widest mt-2">{errors.roles.message}</p>}
          </div>

          {/* Institutional Note */}
          <div className="p-6 bg-tertiary-fixed/5 rounded-3xl border border-dashed border-tertiary-fixed/20 flex gap-4 items-start">
            <Sparkles size={20} className="text-tertiary-fixed shrink-0 mt-1" />
            <p className="text-[10px] font-medium text-on-surface-variant opacity-60 leading-relaxed uppercase tracking-tight">
              El alta de personal administrativo requiere una auditoría posterior. Asegúrese de que el correo institucional coincida con el dominio del Instituto ICEP.
            </p>
          </div>
        </form>

        <div className="p-10 bg-surface-container-low/30 border-t border-outline-variant/5 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-8 py-5 bg-white ghost-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-high transition-all active:scale-95"
          >
            Abortar
          </button>
          <button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className={`flex-1 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${isEdit ? 'bg-primary shadow-primary/20' : 'bg-primary shadow-primary/20'
              }`}
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>{isEdit ? 'Actualizar Credenciales' : 'Confirmar Incorporación'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
