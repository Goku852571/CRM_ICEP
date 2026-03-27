import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Area, createTicket } from '../services/ticketService';
import { X } from 'lucide-react';

const ticketSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(255),
  description: z.string().min(10, 'La descripción debe ser detallada (min 10 caracteres)'),
  area_id: z.string().min(1, 'Debes seleccionar un área destino'),
  priority: z.enum(['normal', 'urgent', 'priority']).default('normal'),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

interface Props {
  areas: Area[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function TicketFormModal({ areas, onClose, onSuccess }: Props) {
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      priority: 'normal'
    }
  });

  const onSubmit = async (data: TicketFormValues) => {
    try {
      setApiError('');
      await createTicket({
        ...data,
        area_id: parseInt(data.area_id)
      });
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Área Destino</label>
              <select
                {...register('area_id')}
                className={`w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-colors ${errors.area_id ? 'border-red-500' : 'border-gray-200'}`}
              >
                <option value="">Selecciona un área...</option>
                {areas.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {errors.area_id && <span className="text-xs text-red-500 font-medium mt-1 inline-block">{errors.area_id.message}</span>}
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
