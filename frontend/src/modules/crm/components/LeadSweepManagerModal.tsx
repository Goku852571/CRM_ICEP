import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Settings2, RefreshCcw, AlertTriangle, Save, Filter, RefreshCw } from 'lucide-react';
import { sweepLeads, getCrmSettings, updateCrmSettings } from '../services/leadService';
import { getCourses, Course } from '../../courses/services/courseService';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alerts';
import clsx from 'clsx';

interface LeadSweepManagerModalProps {
  onClose: () => void;
  onSwept: () => void;
}

export default function LeadSweepManagerModal({ onClose, onSwept }: LeadSweepManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'sweep' | 'settings'>('sweep');
  const [courseFilterId, setCourseFilterId] = useState<string>('');
  const [staleDays, setStaleDays] = useState<number>(5);
  const queryClient = useQueryClient();

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => getCourses().then(res => res.data as Course[])
  });

  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['crmSettings'],
    queryFn: getCrmSettings,
  });

  useEffect(() => {
    if (settings?.lead_stale_days) {
      setStaleDays(settings.lead_stale_days);
    }
  }, [settings]);

  const sweepMutation = useMutation({
    mutationFn: (courseId?: number) => sweepLeads(courseId),
    onSuccess: (data) => {
      showSuccess('Barrido Exitoso', `${data.swept_count} leads fueron reactivados.`);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      onSwept();
    },
    onError: () => {
      showError('Error', 'No se pudo realizar el barrido.');
    }
  });

  const settingsMutation = useMutation({
    mutationFn: (days: number) => updateCrmSettings({ lead_stale_days: days }),
    onSuccess: () => {
      showSuccess('Configuración Guardada', 'Se actualizaron los días de inactividad de leads.');
      queryClient.invalidateQueries({ queryKey: ['crmSettings'] });
    },
    onError: () => {
      showError('Error', 'No se pudo guardar la configuración.');
    }
  });

  const handleSweep = async () => {
    const confirmed = await showConfirm(
      '¿Estás seguro?',
      'Alerta: Esto reactivará leads perdidos y los moverá a Contactados para un nuevo seguimiento.'
    );

    if (confirmed) {
      sweepMutation.mutate(courseFilterId ? parseInt(courseFilterId) : undefined);
    }
  };

  const handleSaveSettings = () => {
    if (staleDays < 1) {
      showError('Error', 'Debe ser al menos 1 día.');
      return;
    }
    settingsMutation.mutate(staleDays);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 custom-scrollbar">
      <div 
        className="absolute inset-0 bg-scrim/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex-none p-6 pb-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
              <RefreshCcw size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-headline font-bold text-on-surface">
                Gestor de Barrido
              </h2>
              <p className="text-sm font-medium text-on-surface-variant">
                Control de Leads y Alertas
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-variant text-on-surface-variant transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-none px-6 mt-6 border-b border-outline-variant/30 flex gap-4">
          <button
            onClick={() => setActiveTab('sweep')}
            className={clsx(
              "pb-3 text-sm font-bold tracking-wide transition-all border-b-2",
              activeTab === 'sweep' 
                ? "border-primary text-primary" 
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            )}
          >
            Nuevo Barrido
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={clsx(
              "pb-3 text-sm font-bold tracking-wide transition-all border-b-2",
              activeTab === 'settings' 
                ? "border-primary text-primary" 
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            )}
          >
            Ajustes (Estancamiento)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col custom-scrollbar">
          {activeTab === 'sweep' ? (
            <>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800">
                <AlertTriangle size={24} className="shrink-0" />
                <p className="text-sm font-medium">
                  El barrido reactivará <strong className="font-bold">todos</strong> los leads que esten marcados como "Perdidos".
                  Estos contactos serán movidos a "Contactados" y se les asignará el indicativo de "Nuevo Barrido".
                </p>
              </div>

              <div className="space-y-4 flex-1">
                <label className="block text-sm font-bold text-on-surface flex items-center gap-2">
                  <Filter size={16} className="text-outline"/> Filtrar por Curso (Opcional)
                </label>
                <select
                  value={courseFilterId}
                  onChange={(e) => setCourseFilterId(e.target.value)}
                  className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-fixed"
                >
                  <option value="">-- Todos los Cursos --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 mt-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-surface-container-high text-on-surface hover:bg-surface-variant transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSweep}
                  disabled={sweepMutation.isPending}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-primary text-on-primary hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {sweepMutation.isPending ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
                  Ejecutar Barrido
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4 flex-1">
                <label className="block text-sm font-bold text-on-surface flex items-center gap-2">
                  <Settings2 size={16} className="text-outline"/> Días de Inactividad (Lead Stale Days)
                </label>
                <p className="text-xs text-on-surface-variant font-medium">
                  Define el límite de días que un lead puede permanecer estancado antes de enviar notificaciones.
                </p>
                <input
                  type="number"
                  min="1"
                  value={staleDays}
                  onChange={(e) => setStaleDays(parseInt(e.target.value) || 0)}
                  disabled={isLoadingSettings}
                  className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary-fixed"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 mt-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-surface-container-high text-on-surface hover:bg-surface-variant transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={settingsMutation.isPending || isLoadingSettings}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-primary text-on-primary hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {settingsMutation.isPending ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                  Guardar Ajustes
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
