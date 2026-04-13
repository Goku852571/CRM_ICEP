import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createCatalogItem, updateCatalogItem } from '../services/courseCatalogService';
import { X, Upload, Loader2, Award, ShieldCheck, CheckSquare } from 'lucide-react';
import { showSuccess, showError } from '@/shared/utils/alerts';

interface Props {
    item: any | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function CourseCatalogFormModal({ item, onClose, onSuccess }: Props) {
    const { register, handleSubmit, formState: { errors }, watch } = useForm({
        defaultValues: {
            name: item?.name || '',
            type: item?.type || 'endorsement',
            description: item?.description || '',
            is_active: item?.is_active ?? true,
        }
    });

    const [imagePreview, setImagePreview] = useState<string | null>(
        item?.image ? `/storage/${item.image}` : null
    );
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const selectedType = watch('type');

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = ev => setImagePreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (data: any) => {
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(data).forEach(([k, v]) => {
                if (k === 'is_active') {
                    fd.append(k, v ? '1' : '0');
                } else if (v !== null && v !== undefined) {
                    fd.append(k, v as any);
                }
            });
            if (imageFile) fd.append('image', imageFile);

            if (item) {
                await updateCatalogItem(item.id, fd);
                showSuccess('Actualizado', 'Elemento actualizado correctamente.');
            } else {
                await createCatalogItem(fd);
                showSuccess('Creado', 'Nuevo elemento añadido al catálogo.');
            }
            onSuccess();
        } catch (e: any) {
            showError('Error', e.response?.data?.message || 'Ocurrió un error inesperado. Por favor, revisa que todos los campos sean válidos.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center px-8 py-6 border-b bg-gray-50/50">
                    <h2 className="text-xl font-black text-primary tracking-tight">
                        {item ? 'Editar Elemento' : 'Nuevo Elemento'}
                    </h2>
                    <button onClick={onClose} className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                    {/* Image Upload */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Imagen Representativa</label>
                        <div 
                            className="relative aspect-square w-32 mx-auto rounded-3xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 hover:border-primary/40 transition-all group cursor-pointer"
                            onClick={() => document.getElementById('catalog-img-upload')?.click()}
                        >
                            {imagePreview ? (
                                <img src={imagePreview} alt="preview" className="w-full h-full object-contain p-2" />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
                                    <Upload size={24} />
                                    <span className="text-[8px] font-bold uppercase">Subir</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                <Upload size={24} className="text-white" />
                            </div>
                        </div>
                        <input id="catalog-img-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Nombre / Entidad</label>
                        <input 
                            type="text" 
                            {...register('name', { required: true })}
                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
                            placeholder="Ej. MSP, Cruz Roja, Universidad..."
                        />
                        {errors.name && <span className="text-[10px] text-red-500 font-bold mt-1">Requerido</span>}
                    </div>

                    {/* Type Selection */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Tipo de Elemento</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'endorsement', label: 'Aval', icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-50' },
                                { id: 'sponsorship', label: 'Auspicio', icon: ShieldCheck, color: 'text-cyan-500', bg: 'bg-cyan-50' },
                                { id: 'certificate', label: 'Certificado', icon: CheckSquare, color: 'text-orange-500', bg: 'bg-orange-50' },
                            ].map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => {
                                        const event = { target: { name: 'type', value: t.id } };
                                        register('type').onChange(event as any);
                                    }}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                                        selectedType === t.id 
                                        ? `border-primary ${t.bg} shadow-md` 
                                        : 'border-transparent bg-gray-50 opacity-40 hover:opacity-100'
                                    }`}
                                >
                                    <t.icon size={20} className={t.color} />
                                    <span className="text-[9px] font-black uppercase">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <input type="hidden" {...register('type')} />

                    {/* Active Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border-2 border-transparent">
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-500">¿Visible en el catálogo?</p>
                            <p className="text-[8px] font-bold text-gray-400">Los items inactivos no aparecerán al crear cursos</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" {...register('is_active')} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={saving}
                            className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95 shadow-xl shadow-primary/20 disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : (item ? 'Actualizar Item' : 'Añadir Item')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
