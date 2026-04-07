import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Server, Mail, Shield, Save, Send,
  Settings as SettingsIcon, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react';
import { getEmailSettings, saveEmailSettings, testEmailSettings, EmailSettings } from '../services/emailService';
import { showSuccess, showError } from '@/shared/utils/alerts';
import clsx from 'clsx';

export default function EmailSettingsPage() {
  const [form, setForm] = useState<EmailSettings>({
    driver: 'smtp',
    host: '',
    port: 587,
    username: '',
    password: '',
    encryption: 'tls',
    from_address: '',
    from_name: ''
  });
  const [testEmail, setTestEmail] = useState('');

  const { data: settingsPayload, isLoading, refetch } = useQuery({
    queryKey: ['email-settings'],
    queryFn: getEmailSettings,
  });

  useEffect(() => {
    if (settingsPayload?.data) {
      const s = settingsPayload.data;
      setForm({
        ...s,
        password: '' // Don't show password
      });
    }
  }, [settingsPayload]);

  const saveMutation = useMutation({
    mutationFn: saveEmailSettings,
    onSuccess: () => {
      showSuccess('Configuración Guardada', 'El servidor de correo ha sido configurado.');
      refetch();
    },
    onError: (err: any) => showError('Error al guardar', err.response?.data?.message || 'Error desconocido'),
  });

  const testMutation = useMutation({
    mutationFn: testEmailSettings,
    onSuccess: () => showSuccess('Correo Enviado', 'Revisa la bandeja de entrada del correo de prueba.'),
    onError: (err: any) => showError('Error de envío', err.response?.data?.message || 'Revisa tu configuración SMTP'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const handleTest = () => {
    if (!testEmail) return showError('Atención', 'Ingresa un correo para la prueba.');
    testMutation.mutate(testEmail);
  };

  if (isLoading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={40} />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 font-body">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-outline-variant/15">
        <div>
          <h1 className="text-3xl font-headline font-extrabold text-primary flex items-center gap-3">
            <SettingsIcon className="text-secondary-fixed-variant" size={28} />
            Configuración de Correo (SMTP)
          </h1>
          <p className="text-on-surface-variant font-medium mt-1">
            Establece los parámetros del servidor para el envío de correos masivos y notificaciones.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Form Column */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-[2rem] p-8 border border-outline-variant/10 shadow-sm space-y-6">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 flex items-center gap-2">
                  <Server size={12} /> Servidor (Host)
                </label>
                <input
                  type="text" value={form.host}
                  onChange={e => setForm({ ...form, host: e.target.value })}
                  placeholder="smtp.example.com"
                  className="w-full h-12 bg-surface-container-low border-none rounded-2xl px-5 font-bold text-sm text-black placeholder:text-on-surface-variant/25 focus:ring-2 focus:ring-primary-fixed transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 flex items-center gap-2">
                  Puerto
                </label>
                <input
                  type="number" value={form.port}
                  onChange={e => setForm({ ...form, port: parseInt(e.target.value) })}
                  className="w-full h-12 bg-surface-container-low border-none rounded-2xl px-5 font-bold text-sm text-black focus:ring-2 focus:ring-primary-fixed transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 flex items-center gap-2">
                  Usuario
                </label>
                <input
                  type="text" value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  placeholder="marketing@icep.com"
                  className="w-full h-12 bg-surface-container-low border-none rounded-2xl px-5 font-bold text-sm text-black focus:ring-2 focus:ring-primary-fixed transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 flex items-center gap-2">
                  <Shield size={12} /> Contraseña
                </label>
                <input
                  type="password" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={settingsPayload?.data ? "•••••••• (Sin cambios)" : "Ingresa contraseña"}
                  className="w-full h-12 bg-surface-container-low border-none rounded-2xl px-5 font-bold text-sm text-black focus:ring-2 focus:ring-primary-fixed transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 flex items-center gap-2">
                  Seguridad (SSL/TLS)
                </label>
                <select
                  value={form.encryption}
                  onChange={e => setForm({ ...form, encryption: e.target.value as any })}
                  className="w-full h-12 bg-surface-container-low border-none rounded-2xl px-5 font-bold text-sm text-black focus:ring-2 focus:ring-primary-fixed transition-all outline-none"
                >
                  <option value="tls">TLS (Recomendado)</option>
                  <option value="ssl">SSL</option>
                  <option value="">Ninguna</option>
                </select>
              </div>
            </div>

            <div className="h-px bg-outline-variant/10 w-full" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 flex items-center gap-2">
                  Correo del Remitente
                </label>
                <input
                  type="email" value={form.from_address}
                  onChange={e => setForm({ ...form, from_address: e.target.value })}
                  placeholder="no-reply@icep.com"
                  className="w-full h-12 bg-surface-container-low border-none rounded-2xl px-5 font-bold text-sm text-black focus:ring-2 focus:ring-primary-fixed transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 flex items-center gap-2">
                  Nombre del Remitente
                </label>
                <input
                  type="text" value={form.from_name}
                  onChange={e => setForm({ ...form, from_name: e.target.value })}
                  placeholder="ICEP — Admisiones"
                  className="w-full h-12 bg-surface-container-low border-none rounded-2xl px-5 font-bold text-sm text-black focus:ring-2 focus:ring-primary-fixed transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="flex items-center gap-2 px-8 py-3 bg-primary text-on-primary font-headline font-bold rounded-2xl shadow-lg shadow-primary/20 hover:opacity-95 transition-all disabled:opacity-50 active:scale-95"
              >
                {saveMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>

        {/* Test Column */}
        <div className="space-y-6">
          <section className="bg-gradient-to-br from-secondary-container/30 to-surface-container-lowest p-6 rounded-[2rem] border border-secondary-container/20 space-y-4">
            <h3 className="font-headline font-bold text-lg text-primary flex items-center gap-2">
              <Send size={18} className="text-secondary" />
              Prueba de Conexión
            </h3>
            <p className="text-xs text-on-surface-variant/80 font-medium">
              Si ya guardaste los cambios, envía un correo de prueba para verificar que los datos sean correctos.
            </p>
            <div className="space-y-3">
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="Ingresa un correo..."
                className="w-full h-11 bg-white border border-outline-variant/30 rounded-xl px-4 text-xs font-bold focus:ring-2 focus:ring-secondary outline-none"
              />
              <button
                onClick={handleTest}
                disabled={testMutation.isPending}
                className="w-full py-3 bg-secondary-container text-on-secondary-container font-black text-xs uppercase tracking-widest rounded-xl hover:bg-secondary-container/80 transition-colors flex items-center justify-center gap-2"
              >
                {testMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : 'Enviar Correo de Prueba'}
              </button>
            </div>
          </section>

          <section className="bg-surface-container-low p-6 rounded-[2rem] border border-outline-variant/10 space-y-3">
            <div className="flex items-center gap-2 text-warning font-bold text-xs uppercase tracking-wider">
              <AlertCircle size={14} /> Recomendación
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Recomendamos el uso de puertos <strong>587 (TLS)</strong> o <strong>465 (SSL)</strong> para evitar que los correos sean bloqueados o lleguen como SPAM. Para correos masivos mas grandes de 1,000 registros, considera usar servicios especializados como Mailgun o AWS SES.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
