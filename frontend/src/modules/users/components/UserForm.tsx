import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect } from 'react';
import { createUser, updateUser, getRoles, Role, User } from '../services/userService';
import { useQuery } from '@tanstack/react-query';

const userSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(4, 'Mínimo 4 caracteres').optional().or(z.literal('')),
  roles: z.array(z.string()).min(1, 'Selecciona al menos un rol'),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  user?: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserForm({ user, onClose, onSuccess }: UserFormProps) {
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
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        roles: user.roles.map((r) => r.name),
        password: '',
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: UserFormData) => {
    try {
      if (isEdit && user) {
        await updateUser(user.id, data);
      } else {
        await createUser(data);
      }
      onSuccess();
      onClose();
    } catch (error) {
      alert('Error al guardar usuario');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">
            {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
            <input
              {...register('name')}
              className={`w-full border p-2 rounded-lg outline-none focus:ring-2 ${errors.name ? 'border-red-500 focus:ring-red-200' : 'focus:ring-blue-100'}`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              {...register('email')}
              className={`w-full border p-2 rounded-lg outline-none focus:ring-2 ${errors.email ? 'border-red-500 focus:ring-red-200' : 'focus:ring-blue-100'}`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña {isEdit && <span className="text-gray-400 font-normal">(dejar vacío para no cambiar)</span>}
            </label>
            <input
              type="password"
              {...register('password')}
              className={`w-full border p-2 rounded-lg outline-none focus:ring-2 ${errors.password ? 'border-red-500 focus:ring-red-200' : 'focus:ring-blue-100'}`}
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <div className="grid grid-cols-2 gap-2">
              {rolesData?.data?.map((role: Role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    value={role.name}
                    {...register('roles')}
                    className="rounded text-blue-600"
                  />
                  {role.name}
                </label>
              ))}
            </div>
            {errors.roles && <p className="text-red-500 text-xs mt-1">{errors.roles.message}</p>}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 transition font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
