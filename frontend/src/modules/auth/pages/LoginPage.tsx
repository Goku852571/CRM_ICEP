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
  ShieldCheck, 
  GraduationCap,
  Eye,
  EyeOff,
  User
} from 'lucide-react';
import { useState } from 'react';

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
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

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
    <main className="relative w-full min-h-screen flex flex-col md:flex-row items-stretch overflow-hidden bg-surface animate-in fade-in duration-700">
      {/* Left Side: Editorial Brand Canvas */}
      <section className="hidden md:flex flex-col justify-between w-1/2 p-16 md:p-24 primary-gradient text-white relative overflow-hidden">
        {/* Decorative Texture Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        
        <div className="z-10 slide-in-from-left-8 duration-1000">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed flex items-center justify-center shadow-xl shadow-black/20">
              <GraduationCap size={28} className="text-on-tertiary-fixed font-bold" />
            </div>
            <span className="font-headline font-bold text-3xl tracking-tight uppercase">ICEP CRM</span>
          </div>
          
          <h1 className="font-headline font-extrabold text-6xl lg:text-7xl leading-[1.05] mb-10 tracking-tighter">
            Impulsando la <br/>
            <span className="text-tertiary-fixed underline underline-offset-8 decoration-white/20">Excelencia</span> <br/>
            Académica.
          </h1>
          
          <p className="text-xl text-white/70 max-w-md leading-relaxed font-light">
            Accede al portal unificado del Instituto Premier para la gestión de récords estudiantiles, analíticas de matrícula y administración financiera.
          </p>
        </div>

        <div className="z-10 flex items-end justify-between">
          <div className="space-y-4">
            <div className="flex -space-x-3 overflow-hidden">
              {[1, 2, 3].map(i => (
                <div key={i} className="inline-block h-10 w-10 rounded-full ring-2 ring-primary-container bg-white/20 flex items-center justify-center font-bold text-xs">
                  {i === 1 ? 'JD' : i === 2 ? 'MS' : 'AR'}
                </div>
              ))}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Confiado por más de 450 instituciones</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-white/30 uppercase tracking-widest">v2.4.0 Platinum Edition</span>
          </div>
        </div>

        {/* Abstract background shape */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-tertiary-fixed/10 rounded-full blur-[120px]"></div>
      </section>

      {/* Right Side: Secure Login Panel */}
      <section className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-16 lg:p-24 bg-surface">
        <div className="w-full max-w-[460px] space-y-12 slide-in-from-right-8 duration-1000">
          {/* Mobile Logo */}
          <div className="md:hidden flex items-center gap-4 mb-12">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/20 transition-transform hover:scale-105">
              <GraduationCap size={32} className="text-tertiary-fixed" />
            </div>
            <div>
              <h2 className="font-headline font-bold text-2xl text-primary tracking-tight uppercase">ICEP CRM</h2>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] opacity-60">Admin Portal</p>
            </div>
          </div>

          {/* Header Content */}
          <header className="space-y-3">
            <h2 className="font-headline font-extrabold text-4xl lg:text-5xl text-primary tracking-tight leading-tight">Acceso Seguro</h2>
            <p className="text-on-surface-variant font-body text-lg opacity-70 leading-relaxed">
              Por favor, ingresa tus credenciales para continuar al Portal de Administración Institucional.
            </p>
          </header>

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Username/Email Field */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1" htmlFor="email">Correo Electrónico</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="ejemplo@icep.com"
                  className={`block w-full pl-14 pr-4 py-5 bg-surface-container-high/50 border-none rounded-2xl focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all duration-300 placeholder:text-outline/50 font-medium ${errors.email ? 'ring-2 ring-error/20 bg-error/5' : ''}`}
                />
              </div>
              {errors.email && <p className="text-[10px] font-bold text-error uppercase tracking-widest ml-1">{errors.email.message}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-3">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant/60" htmlFor="password">Contraseña</label>
                <a className="text-[10px] font-black text-on-primary-container hover:text-primary transition-colors uppercase tracking-widest" href="#">¿Olvidaste tu contraseña?</a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••••••"
                  className={`block w-full pl-14 pr-14 py-5 bg-surface-container-high/50 border-none rounded-2xl focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all duration-300 placeholder:text-outline/50 font-medium ${errors.password ? 'ring-2 ring-error/20 bg-error/5' : ''}`}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-5 flex items-center text-on-surface-variant/40 hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-[10px] font-bold text-error uppercase tracking-widest ml-1">{errors.password.message}</p>}
            </div>

            {/* Options */}
            <div className="flex items-center group cursor-pointer select-none">
              <div className="relative flex items-center h-5">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  className="h-5 w-5 rounded-lg border-outline-variant/30 text-primary focus:ring-primary/20 bg-white transition-all cursor-pointer"
                />
              </div>
              <label htmlFor="remember" className="ml-3 block text-[11px] font-bold text-on-surface-variant/80 tracking-tight cursor-pointer group-hover:text-primary transition-colors">
                Recordar este dispositivo por 30 días
              </label>
            </div>

            {/* Action Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 px-8 bg-tertiary-fixed text-on-tertiary-fixed font-headline font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-2xl shadow-tertiary-fixed/20 hover:shadow-tertiary-fixed/40 active:scale-[0.98] transition-all duration-500 flex items-center justify-center gap-3 disabled:opacity-50 group"
              >
                <span>{isSubmitting ? 'Verificando...' : 'Iniciar Sesión en el Portal'}</span>
                {!isSubmitting && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          </form>

          {/* Status Indicators */}
          <div className="flex flex-wrap gap-4 pt-10">
            <div className="status-jewel shadow-xl shadow-black/5">
              <div className="status-dot bg-tertiary-fixed" />
              <span className="opacity-60">System Online</span>
            </div>
            <div className="status-jewel shadow-xl shadow-black/5">
              <div className="status-dot bg-on-primary-container" />
              <span className="opacity-60">SSL Encrypted</span>
            </div>
          </div>

          <footer className="pt-12 border-t border-outline-variant/10">
            <p className="text-[10px] font-medium text-on-surface-variant/50 leading-relaxed uppercase tracking-widest text-center">
              Acceso autorizado únicamente • Auditoría de seguridad habilitada
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
