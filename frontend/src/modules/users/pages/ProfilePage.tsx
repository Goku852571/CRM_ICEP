import { useAuth } from '@/shared/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect } from 'react';
import { showSuccess, showError } from '@/shared/utils/alerts';
import { Loader2, User as UserIcon, Shield, Mail, Phone, Hash, Lock, Camera, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

const profileSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  id_number: z.string().optional(),
  phone: z.string().optional(),
  avatar: z.any().optional(),
  password: z.string().min(4, 'Mínimo 4 caracteres').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      id_number: '',
      phone: '',
      avatar: '',
      password: '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        id_number: user.id_number || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
        password: '',
      });
      setPreviewUrl(user.avatar || null);
    }
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      // If no new file was selected and we just have the old URL, 
      // we remove it from the payload to avoid backend validation issues if it expects a file
      const payload = { ...data };
      if (typeof payload.avatar === 'string') {
        delete payload.avatar;
      }

      await updateProfile(payload);
      showSuccess('Perfil Actualizado', 'Tu información personal ha sido modificada con éxito.');
      reset({ ...data, password: '' });
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'No se pudo actualizar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue('avatar', file, { shouldDirty: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="relative group shrink-0">
          <input
            type="file"
            className="hidden"
            accept="image/*"
            ref={(ref) => setFileInput(ref)}
            onChange={handleAvatarChange}
          />
          <div
            onClick={() => fileInput?.click()}
            className="w-32 h-32 rounded-[2rem] bg-surface-container-high overflow-hidden shadow-2xl shadow-primary/20 border-4 border-surface-container-lowest relative group cursor-pointer"
          >
            {previewUrl ? (
              <img src={previewUrl} alt={user.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full primary-gradient flex items-center justify-center text-white text-5xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-sm">
              <Camera className="text-white animate-in zoom-in duration-300" size={24} />
            </div>
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 mt-3 text-center">Cambiar Foto</p>
        </div>

        <div className="flex-1 space-y-3 pt-2">
          <h1 className="text-4xl font-headline font-extrabold text-primary leading-none tracking-tight">
            {user.name}
          </h1>
          <p className="text-on-surface-variant font-medium flex items-center gap-2">
            <Mail size={16} className="text-outline" /> {user.email}
          </p>
          <div className="flex gap-2 flex-wrap pt-2">
            {user.roles.map(role => (
              <div key={role.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-tertiary-fixed/20 text-tertiary-fixed text-xs font-bold uppercase tracking-widest rounded-full border border-tertiary-fixed/30 shadow-sm">
                <Shield size={12} /> {role.name.replace('_', ' ')}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="bg-surface-container-lowest rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-black/5 border border-outline-variant/10">
        <h2 className="text-lg font-headline font-bold text-primary mb-6 flex items-center gap-2">
          <UserIcon size={20} /> Información Personal
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="relative group">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Nombre Completo</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                  <UserIcon size={18} />
                </span>
                <input
                  {...register('name')}
                  className={clsx(
                    "w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-2xl text-sm font-medium text-black focus:ring-2 focus:ring-primary/20 hover:bg-surface-container-high transition-all",
                    errors.name ? 'ring-2 ring-error/20 bg-error/5' : ''
                  )}
                />
              </div>
              {errors.name && <p className="text-error text-[10px] font-bold mt-1 ml-2">{errors.name.message}</p>}
            </div>

            <div className="relative group">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Correo Electrónico</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  {...register('email')}
                  className={clsx(
                    "w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-2xl text-sm font-medium text-black focus:ring-2 focus:ring-primary/20 hover:bg-surface-container-high transition-all",
                    errors.email ? 'ring-2 ring-error/20 bg-error/5' : ''
                  )}
                />
              </div>
              {errors.email && <p className="text-error text-[10px] font-bold mt-1 ml-2">{errors.email.message}</p>}
            </div>

            <div className="relative group">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Cédula / Documento</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                  <Hash size={18} />
                </span>
                <input
                  type="text"
                  {...register('id_number')}
                  placeholder="Ej: 0912345678"
                  className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-2xl text-sm font-medium text-black focus:ring-2 focus:ring-primary/20 hover:bg-surface-container-high transition-all"
                />
              </div>
            </div>

            <div className="relative group">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Teléfono Móvil</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                  <Phone size={18} />
                </span>
                <input
                  type="text"
                  {...register('phone')}
                  placeholder="Ej: +593 98 765 4321"
                  className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-2xl text-sm font-medium text-black focus:ring-2 focus:ring-primary/20 hover:bg-surface-container-high transition-all"
                />
              </div>
            </div>

          </div>

          <hr className="border-outline-variant/10 my-8" />

          {/* Security Section */}
          <div>
            <h3 className="text-sm font-headline font-bold text-on-surface flex items-center gap-2 mb-4">
              <Lock size={16} className="text-primary" /> Seguridad
            </h3>

            <div className="relative max-w-md group">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Nueva Contraseña</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  {...register('password')}
                  placeholder="Dejar en blanco para mantener actual"
                  className={clsx(
                    "w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-2xl text-sm font-medium text-black focus:ring-2 focus:ring-primary/20 hover:bg-surface-container-high transition-all placeholder:text-on-surface-variant/50",
                    errors.password ? 'ring-2 ring-error/20 bg-error/5' : ''
                  )}
                />
              </div>
              {errors.password && <p className="text-error text-[10px] font-bold mt-1 ml-2">{errors.password.message}</p>}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={!isDirty || isSaving}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-on-primary font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 transition-all active:scale-95 text-sm uppercase tracking-wider"
            >
              {isSaving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <CheckCircle2 size={18} />
              )}
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
