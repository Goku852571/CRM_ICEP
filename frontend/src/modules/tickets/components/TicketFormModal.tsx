import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Area, createTicket } from '../services/ticketService';
import { User as AppUser } from '@/modules/users/services/userService';
import { X, Paperclip, User as UserIcon } from 'lucide-react';

const ticketSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(255),
  description: z.string().min(10, 'La descripción debe ser detallada (min 10 caracteres)'),
  assignee_id: z.string().optional(),
  priority: z.enum(['normal', 'urgent', 'priority']).default('normal'),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

interface Props {
  areas: Area[];
  users: AppUser[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function TicketFormModal({ areas, users, onClose, onSuccess }: Props) {
  const [apiError, setApiError] = useState('');
  const [ticketFiles, setTicketFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setTicketFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setTicketFiles(prev => prev.filter((_, i) => i !== index));
  };

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      priority: 'normal'
    }
  });

  const selectedAssigneeId = watch('assignee_id');

  const onSubmit = async (data: TicketFormValues) => {
    try {
      setApiError('');
      await createTicket({
        ...data,
        area_id: areas[0]?.id || 1, // Default area as requested to remove from UI
        assignee_id: data.assignee_id ? parseInt(data.assignee_id) : null
      }, ticketFiles);
      onSuccess();
    } catch (error: any) {
      setApiError(error.response?.data?.message || 'Error al crear el ticket');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold font-primary text-gray-900">Crear Nuevo Ticket</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-xl transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {apiError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100">
              {apiError}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Título del Problema</label>
            <input
              type="text"
              {...register('title')}
              placeholder="Ej: Acceso denegado a plataforma"
              className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-colors ${errors.title ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
            />
            {errors.title && <span className="text-xs text-red-500 font-medium mt-1 inline-block">{errors.title.message}</span>}
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Asignar Responsable (opcional)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setValue('assignee_id', '')}
                className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${!selectedAssigneeId ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-2 border-2 border-white shadow-sm">
                  ?
                </div>
                <span className="text-[10px] font-black uppercase text-gray-500">Sin asignar</span>
              </button>

              {users.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setValue('assignee_id', u.id.toString())}
                  className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${selectedAssigneeId === u.id.toString() ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden mb-2 border-2 border-white shadow-sm bg-gray-100 flex items-center justify-center">
                    {u.avatar ? (
                      <img src={u.avatar.startsWith('http') ? u.avatar : `/api/v1${u.avatar}`} alt={u.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-gray-500">{u.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase text-gray-700 text-center line-clamp-1">{u.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Prioridad</label>
            <select
                {...register('priority')}
                className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-colors"
            >
                <option value="normal">🟢 Normal</option>
                <option value="urgent">🟠 Urgente</option>
                <option value="priority">🔴 Prioridad Máxima</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción Detallada</label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder="Explica el problema paso a paso..."
              className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-colors resize-none ${errors.description ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
            />
            {errors.description && <span className="text-xs text-red-500 font-medium mt-1 inline-block">{errors.description.message}</span>}
          </div>

          <div>
             <label className="block text-sm font-semibold text-gray-700 mb-1">Archivos Adjuntos (opcional)</label>
             {ticketFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                  {ticketFiles.map((f, i) => (
                    <span key={i} className="flex items-center gap-1 text-xs bg-white border border-gray-200 px-2 py-1 rounded-md shadow-sm">
                      {f.name} 
                      <button type="button" onClick={() => removeFile(i)} className="text-red-500 hover:text-red-700 font-bold ml-1"><X size={12}/></button>
                    </span>
                  ))}
                </div>
             )}
             <div className="flex items-center gap-3">
                <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition text-sm font-medium w-full justify-center"
                >
                  <Paperclip size={16} /> Agregar Recursos (Imágenes / PDF)
                </button>
             </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isSubmitting ? 'Creando Ticket...' : 'Crear Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
