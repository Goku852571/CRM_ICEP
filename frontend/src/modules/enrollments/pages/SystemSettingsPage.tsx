import { useState, useEffect } from 'react';
import { getSystemOptions, createSystemOption, updateSystemOption, deleteSystemOption, SystemOption } from '@/shared/services/systemOptionService';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alerts';
import { Plus, Edit2, Trash2, Settings2, CheckCircle, XCircle, Search, Save, X, Building2, CreditCard, Layers } from 'lucide-react';
import clsx from 'clsx';

const CATEGORIES = [
  { id: 'banks', label: 'Bancos', icon: <Building2 />, description: 'Bancos emisores para el depósito de cuotas.' },
  { id: 'payment_methods', label: 'Métodos de Pago', icon: <CreditCard />, description: 'Medios a través de los cuales se recibe el dinero.' },
  { id: 'education_levels', label: 'Niveles Académicos', icon: <Layers />, description: 'Opciones de nivel de estudio para el aspirante.' },
];

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState(CATEGORIES[0].id);
  const [options, setOptions] = useState<SystemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const response = await getSystemOptions(activeTab);
      setOptions(response.data);
    } catch (error) {
      console.error(error);
      showError('Error', 'No se pudieron cargar las configuraciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, [activeTab]);

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    try {
      await createSystemOption({ 
        category: activeTab,
        label: newLabel.trim(), 
        value: newLabel.trim().toLowerCase().replace(/\s+/g, '_'),
        is_active: true,
        sort_order: options.length
      });
      showSuccess('Éxito', 'Configuración guardada.');
      setNewLabel('');
      setIsAdding(false);
      fetchOptions();
    } catch (error: any) {
      showError('Error', error?.response?.data?.message || 'No se pudo guardar.');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editLabel.trim()) return;
    try {
      await updateSystemOption(id, { 
        label: editLabel.trim(),
        value: editLabel.trim().toLowerCase().replace(/\s+/g, '_')
      });
      showSuccess('Éxito', 'Actualizado correctamente.');
      setEditingId(null);
      fetchOptions();
    } catch (error: any) {
      showError('Error', error?.response?.data?.message || 'No se pudo actualizar.');
    }
  };

  const handleToggleStatus = async (option: SystemOption) => {
    try {
      await updateSystemOption(option.id, { is_active: !option.is_active });
      fetchOptions();
    } catch (error) {
      showError('Error', 'No se pudo cambiar el estado.');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm(
      '¿Eliminar Registro?',
      'Esta acción eliminará la opción de manera permanente. Considera solo desactivar si ya existen registros relacionados.',
      'Sí, eliminar',
      'Cancelar'
    );
    if (!confirmed) return;

    try {
      await deleteSystemOption(id);
      showSuccess('Eliminado', 'El registro ha sido borrado.');
      fetchOptions();
    } catch (error) {
      showError('Error', 'No se pudo eliminar.');
    }
  };

  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentCategory = CATEGORIES.find(c => c.id === activeTab);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-headline text-primary tracking-tight">Configuraciones del Sistema</h1>
          <p className="text-on-surface-variant font-medium text-sm">Personaliza las opciones y catálogos de los formularios del CRM.</p>
        </div>
      </div>

      {/* Tabs / Categories */}
      <div className="flex flex-wrap gap-4 overflow-x-auto pb-2 no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setActiveTab(cat.id); setEditingId(null); setIsAdding(false); }}
            className={clsx(
              "flex items-center gap-3 px-6 py-4 rounded-3xl transition-all duration-300 shadow-sm border whitespace-nowrap",
              activeTab === cat.id 
                ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-105" 
                : "bg-surface-container-low text-on-surface-variant border-outline-variant/10 hover:bg-white"
            )}
          >
            <div className={clsx("transition-transform duration-300", activeTab === cat.id ? "scale-110" : "opacity-50")}>
              {cat.icon}
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest">{cat.label}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white/40 p-6 rounded-[2.5rem] border border-outline-variant/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex-1">
                <h3 className="text-xl font-black text-primary mb-1">{currentCategory?.label}</h3>
                <p className="text-xs text-on-surface-variant/60 font-medium">{currentCategory?.description}</p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:w-80">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                    <input
                        type="text"
                        placeholder={`Filtrar ${currentCategory?.label.toLowerCase()}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/50 border border-outline-variant/10 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm"
                    />
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="h-12 w-12 md:w-auto md:px-6 rounded-2xl bg-primary text-white flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95"
                >
                    <Plus size={20} /> <span className="hidden md:inline font-black text-xs uppercase tracking-widest">Añadir</span>
                </button>
            </div>
        </div>

        {isAdding && (
            <div className="mb-8 p-6 rounded-[2rem] bg-primary/5 border-2 border-primary/10 animate-in slide-in-from-top-4 flex flex-col md:flex-row items-center gap-4">
               <input
                 autoFocus
                 placeholder={`Nombre para ${currentCategory?.label.toLowerCase()}...`}
                 value={newLabel}
                 onChange={(e) => setNewLabel(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                 className="flex-1 h-14 px-6 rounded-2xl bg-white border-2 border-primary/20 focus:border-primary outline-none text-lg font-black"
               />
               <div className="flex gap-2 w-full md:w-auto">
                 <button onClick={() => setIsAdding(false)} className="flex-1 md:flex-none px-6 h-14 font-bold text-on-surface-variant">Cancelar</button>
                 <button onClick={handleCreate} disabled={!newLabel.trim()} className="flex-1 md:flex-none px-10 h-14 bg-primary text-white font-black rounded-2xl shadow-lg hover:bg-primary-dark transition-all disabled:opacity-50">GUARDAR</button>
               </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-[2rem] bg-surface-container animate-pulse" />
                ))
            ) : filteredOptions.length === 0 ? (
                <div className="col-span-full py-20 text-center">
                    <Settings2 size={48} className="mx-auto text-on-surface-variant/20 mb-4" />
                    <p className="text-on-surface-variant/40 font-black uppercase text-xs tracking-widest italic">Vacíio por ahora</p>
                </div>
            ) : filteredOptions.map(option => (
                <div key={option.id} className={clsx(
                    "group relative p-6 rounded-[2rem] border-2 transition-all duration-300",
                    option.is_active ? "bg-white border-outline-variant/5 shadow-sm hover:border-primary/20 hover:shadow-xl" : "bg-surface-container-low border-transparent opacity-60 grayscale"
                )}>
                    {editingId === option.id ? (
                        <div className="space-y-4 animate-in zoom-in-95">
                            <input
                                autoFocus
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl border-2 border-primary focus:border-primary outline-none font-bold"
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setEditingId(null)} className="flex-1 h-9 rounded-lg font-bold text-xs uppercase">Cancelar</button>
                                <button onClick={() => handleUpdate(option.id)} className="flex-1 h-9 rounded-lg bg-primary text-white font-black text-xs uppercase">Ok</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-start mb-4">
                                <div className={clsx("h-10 w-10 rounded-xl flex items-center justify-center", option.is_active ? "bg-surface-container text-primary" : "bg-secondary/10")}>
                                    {currentCategory?.icon}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingId(option.id); setEditLabel(option.label); }} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(option.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            <h4 className="text-sm font-black text-primary uppercase tracking-tight truncate mb-4">{option.label}</h4>
                            <div className="flex items-center justify-between border-t border-outline-variant/5 pt-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${option.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">{option.is_active ? 'Activo' : 'Inactivo'}</span>
                                </div>
                                <button onClick={() => handleToggleStatus(option)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${option.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                                    {option.is_active ? 'Desactivar' : 'Activar'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
