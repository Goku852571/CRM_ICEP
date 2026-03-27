import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/shared/hooks/useAuth';
import api from '@/shared/services/api';
import { useNavigate, Navigate } from 'react-router-dom';
import { showError, showToast } from '@/shared/utils/alerts';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido').min(1, 'El correo es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const response = await api.post('/auth/login', data);
      
      login(response.data.data.token, response.data.data.user, response.data.data.permissions || []);
      showToast('success', `¡Bienvenido, ${response.data.data.user.name}!`);
      navigate('/');
    } catch (error: any) {
      showError('Error de autenticación', error.response?.data?.message || 'Error al conectar con el servidor');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow border">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-blue-600">ICEP CRM</h2>
          <p className="mt-2 text-sm text-gray-600">Inicia sesión en tu cuenta</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
            <input
              type="email"
              {...register('email')}
              className={`mt-1 block w-full border p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.email && <span className="text-xs text-red-500 mt-1">{errors.email.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              {...register('password')}
              className={`mt-1 block w-full border p-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.password && <span className="text-xs text-red-500 mt-1">{errors.password.message}</span>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
