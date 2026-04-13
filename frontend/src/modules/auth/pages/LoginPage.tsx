import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/shared/hooks/useAuth';
import api from '@/shared/services/api';
import { showError, showToast } from '@/shared/utils/alerts';
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Laptop,
  ShieldCheck,
  Scan,
} from 'lucide-react';
import { useState } from 'react';
import logo from '../../../assets/logo.png';
import heroWoman from '../../../assets/login-woman.png';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido').min(1, 'El correo es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#7a142c]" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data: LoginFormValues) => {
    try {
      const response = await api.post('/auth/login', data);
      login(
        response.data.data.token,
        response.data.data.user,
        response.data.data.permissions || []
      );
      showToast('success', `¡Bienvenido, ${response.data.data.user.name}!`);
      navigate('/');
    } catch (error: any) {
      showError(
        'Error de autenticación',
        error.response?.data?.message || 'Error al conectar con el servidor'
      );
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8f8fa]">
      {/* Fondo sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(122,20,44,0.06),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(32,50,94,0.08),transparent_28%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] items-center px-6 py-8 lg:px-10">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Columna izquierda */}
          <section className="relative z-40 flex min-h-[720px] flex-col justify-between py-6 lg:pl-8 xl:pl-16">
            <div>
              <div className="mb-16 flex items-center gap-4">
                <img src={logo} alt="ICEP" className="h-16 w-16 object-contain" />
                <span className="text-3xl font-bold tracking-tight text-[#20325e]">
                  ICEP
                </span>
              </div>

              <div className="max-w-[540px] pl-2">
                <h1 className="text-[44px] font-extrabold uppercase leading-[0.9] tracking-[-0.02em] text-[#20325e] md:text-[52px] xl:text-[66px]">
                  <span className="block">Desarrollo</span>

                  <span className="block mt-1 text-[#7a142c]">
                    Profesional
                  </span>

                  <span className="block mt-1">que transforma</span>
                </h1>

                <div className="mt-6 h-[2px] w-[300px] bg-gradient-to-r from-[#7a142c] to-[#7a142c]/10" />

                <p className="mt-8 max-w-[420px] text-lg leading-relaxed text-[#20325e]/70 md:text-[15px]">
                  Ingresa tus credenciales para acceder al Portal Unificado del Instituto de
                  Consultoría y Especialización Profesional.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pl-2">
              {['JD', 'MS', 'AR'].map((item) => (
                <div
                  key={item}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#20325e]/20 bg-white text-xs font-bold text-[#20325e] shadow-md"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          {/* Columna derecha */}
          <section className="relative z-10 flex min-h-[720px] items-center justify-center lg:justify-end">
            {/* Tarjeta principal */}
            <div className="relative w-full max-w-[700px] rounded-[40px] bg-white p-8 shadow-[0_20px_60px_rgba(32,50,94,0.06)] md:p-12 lg:p-16">
              <div className="ml-auto max-w-[470px]">
                <header className="mb-10">
                  <h2 className="text-[42px] font-extrabold tracking-tight text-[#20325e] md:text-[48px]">
                    Acceso Seguro
                  </h2>
                  <p className="mt-3 max-w-[420px] text-[15px] leading-relaxed text-[#20325e]/60">
                    Por favor, ingresa tus credenciales para continuar al
                    Portal de Administración Institucional.
                  </p>
                </header>

                <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-3">
                    <label
                      htmlFor="email"
                      className="ml-1 text-xs font-black uppercase tracking-[0.26em] text-[#20325e]/55"
                    >
                      Correo electrónico
                    </label>

                    <div className="relative">
                      <Mail
                        size={18}
                        className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#20325e]/35"
                      />
                      <input
                        id="email"
                        type="email"
                        {...register('email')}
                        placeholder="ejemplo@icep.com"
                        className={`h-16 w-full rounded-2xl border border-transparent bg-[#f3f3f5] pl-14 pr-12 text-[16px] text-[#20325e] outline-none transition-all placeholder:text-[#20325e]/60 focus:border-[#20325e]/10 focus:bg-white focus:shadow-[0_10px_30px_rgba(32,50,94,0.08)] ${errors.email ? 'border-[#7a142c]/30 bg-[#7a142c]/[0.03]' : ''
                          }`}
                      />
                      <Scan
                        size={18}
                        className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[#20325e]/50"
                      />
                    </div>

                    {errors.email && (
                      <p className="ml-1 text-[11px] font-bold tracking-wide text-[#7a142c]">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="ml-1 text-xs font-black uppercase tracking-[0.26em] text-[#20325e]/55"
                      >
                        Contraseña
                      </label>

                      <a
                        href="#"
                        className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#7a142c]/80 transition hover:text-[#7a142c]"
                      >
                        ¿Olvidaste tu contraseña?
                      </a>
                    </div>

                    <div className="relative">
                      <Lock
                        size={18}
                        className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#20325e]/35"
                      />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        {...register('password')}
                        placeholder="••••••••••••"
                        className={`h-16 w-full rounded-2xl border border-transparent bg-[#f3f3f5] pl-14 pr-14 text-[16px] text-[#20325e] outline-none transition-all placeholder:text-[#20325e]/60 focus:border-[#20325e]/10 focus:bg-white focus:shadow-[0_10px_30px_rgba(32,50,94,0.08)] ${errors.password ? 'border-[#7a142c]/30 bg-[#7a142c]/[0.03]' : ''
                          }`}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-[#20325e]/40 transition hover:text-[#20325e]"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {errors.password && (
                      <p className="ml-1 text-[11px] font-bold tracking-wide text-[#7a142c]">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 pt-1">
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border border-[#20325e]/20 text-[#7a142c] focus:ring-[#7a142c]/20"
                    />
                    <span className="text-[13px] text-[#20325e]/70">
                      Recordar este dispositivo por 30 días
                    </span>
                  </label>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="group flex h-[58px] w-full items-center justify-center gap-3 rounded-[14px] bg-[#7a142c] px-8 text-xs font-bold uppercase tracking-[0.25em] text-white shadow-[0_15px_30px_rgba(122,20,44,0.22)] transition-all duration-300 hover:-translate-y-[1px] hover:bg-[#6a1025] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>
                        {isSubmitting ? 'Verificando...' : 'Iniciar sesión'}
                      </span>
                      {!isSubmitting && (
                        <ArrowRight
                          size={18}
                          className="transition-transform duration-300 group-hover:translate-x-1"
                        />
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-8 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 rounded-full border border-gray-100 bg-white px-5 py-2.5 shadow-[0_4px_10px_rgba(20,20,40,0.03)]">
                    <span className="h-2 w-2 rounded-full bg-[#52b788]" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#20325e]/50">
                      Sistema Online
                    </span>
                  </div>

                  <div className="flex items-center gap-2 rounded-full border border-gray-100 bg-white px-5 py-2.5 shadow-[0_4px_10px_rgba(20,20,40,0.03)]">
                    <ShieldCheck size={14} className="text-[#20325e]/50" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#20325e]/50">
                      SSL Encrypted
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Mujer 3D saliendo de la pantalla */}
        <div className="pointer-events-none absolute inset-y-0 left-[47%] z-30 hidden w-[600px] -translate-x-1/2 items-center justify-center lg:flex xl:w-[800px]">
          {/* Tarjetas flotantes detrás */}


          <div className="relative z-30">
            <img
              src={heroWoman}
              alt="Asistente institucional ICEP"
              className="w-[600px] max-w-none object-contain drop-shadow-[0_20px_40px_rgba(20,20,40,0.15)] xl:w-[800px]"
            />
          </div>
        </div>
      </div>
    </main>
  );
}