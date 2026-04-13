import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCatalogItems, deleteCatalogItem } from '../services/courseCatalogService';
import { X, Plus, Search, Trash2, Edit2, ShieldCheck, Award, CheckSquare, Loader2, Image as ImageIcon } from 'lucide-react';
import { showConfirmDanger, showSuccess, showError } from '@/shared/utils/alerts';
import { CourseCatalogFormModal } from '@/modules/courses/components/CourseCatalogFormModal';

interface Props {
    onClose: () => void;
}

export default function CourseCatalogManager({ onClose }: Props) {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const { data: items, isLoading } = useQuery({
        queryKey: ['course-catalog', searchTerm],
        queryFn: () => getCatalogItems({ search: searchTerm }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteCatalogItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['course-catalog'] });
            showSuccess('Eliminado', 'El elemento ha sido eliminado del catálogo.');
        },
        onError: () => showError('Error', 'No se pudo eliminar el elemento.'),
    });

    const handleDelete = async (id: number) => {
        const confirmed = await showConfirmDanger('¿Eliminar elemento?', 'Esta acción no se puede deshacer.');
        if (confirmed) deleteMutation.mutate(id);
    };

    const handleEdit = (item: any) => {
        setSelectedItem(item);
        setIsFormOpen(true);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'endorsement': return <Award size={18} className="text-yellow-500" />;
            case 'sponsorship': return <ShieldCheck size={18} className="text-cyan-500" />;
            case 'certificate': return <CheckSquare size={18} className="text-orange-500" />;
            default: return <Plus size={18} />;
        }
    };

    const getTypeName = (type: string) => {
        switch (type) {
            case 'endorsement': return 'Aval';
            case 'sponsorship': return 'Auspicio';
            case 'certificate': return 'Certificado';
            default: return type;
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-primary tracking-tight">Gestión de Catálogo</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Administra avales, auspicios y certificados para tus cursos</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => { setSelectedItem(null); setIsFormOpen(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
                        >
                            <Plus size={16} /> Nuevo Item
                        </button>
                        <button onClick={onClose} className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Sub-Header: Search */}
                <div className="px-8 py-4 border-b border-gray-100 flex items-center gap-4">
                    <div className="relative flex-1 group">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre o tipo..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 transition-all"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-gray-200">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                            <Loader2 size={40} className="animate-spin" />
                            <span className="text-xs font-bold uppercase tracking-widest">Cargando Catálogo...</span>
                        </div>
                    ) : items?.data?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-300 text-center max-w-sm mx-auto">
                            <Plus size={64} className="opacity-20" />
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">El catálogo está vacío</h3>
                                <p className="text-sm font-medium">Empieza agregando items que se repitan en tus cursos para ahorrar tiempo.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {items?.data?.map((item: any) => (
                                <div key={item.id} className="group bg-white rounded-2xl p-5 border-2 border-gray-50 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 relative">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center border border-gray-100">
                                            {item.image ? (
                                                <img src={`/storage/${item.image}`} alt={item.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <ImageIcon size={24} className="text-gray-200" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                {getTypeIcon(item.type)}
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{getTypeName(item.type)}</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-primary truncate group-hover:text-primary transition-colors">{item.name}</h4>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleEdit(item)}
                                            className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all"
                                        >
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Edit2 size={12} /> Editar
                                            </div>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/30 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Total de elementos: {items?.data?.length || 0} • Los cambios afectarán solo a futuras selecciones.
                    </p>
                </div>
            </div>

            {isFormOpen && (
                <CourseCatalogFormModal 
                    item={selectedItem}
                    onClose={() => setIsFormOpen(false)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['course-catalog'] });
                        setIsFormOpen(false);
                    }}
                />
            )}
        </div>
    );
}
