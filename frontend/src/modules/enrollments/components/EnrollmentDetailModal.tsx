import { useState, useEffect } from 'react';
import { getEnrollment, updateEnrollmentStatus, EnrollmentForm } from '../services/enrollmentService';
import { X, Clock, User, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';

interface Props {
  enrollmentId: number;
  onClose: () => void;
  onUpdate: () => void;
}

const StatusMap: Record<string, { label: string, color: string }> = {
  pending_send: { label: 'Pendiente Envío', color: 'bg-gray-100 text-gray-800' },
  sent: { label: 'Enviado', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completado', color: 'bg-yellow-100 text-yellow-800' },
  in_review: { label: 'En Revisión', color: 'bg-purple-100 text-purple-800' },
  approved: { label: 'Aprobado', color: 'bg-green-100 text-green-800' },
  incomplete: { label: 'Incompleto', color: 'bg-orange-100 text-orange-800' },
  void: { label: 'Anulado', color: 'bg-red-100 text-red-800' }
};

export default function EnrollmentDetailModal({ enrollmentId, onClose, onUpdate }: Props) {
  const { hasPermission } = useAuth();
  const [enrollment, setEnrollment] = useState<EnrollmentForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusConfirm, setStatusConfirm] = useState<string | null>(null);
  const [statusNotes, setStatusNotes] = useState('');

  const fetchDetail = async () => {
    try {
      const data = await getEnrollment(enrollmentId);
      setEnrollment(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [enrollmentId]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateEnrollmentStatus(enrollmentId, newStatus, statusNotes);
      setStatusConfirm(null);
      setStatusNotes('');
      onUpdate();
      fetchDetail();
    } catch (error) {
      alert('Error al cambiar el estado');
    }
  };

  if (loading || !enrollment) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white p-8 rounded-2xl flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500 font-medium">Cargando detalles...</p>
        </div>
      </div>
    );
  }

  const publicLink = `${window.location.origin}/enrollment/${enrollment.uuid}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white h-full sm:h-[calc(100vh-2rem)] w-full max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col pt-0 pb-0 overflow-hidden slide-in-from-right duration-300 animate-in">
        
        <div className="flex items-center justify-between p-6 border-b bg-gray-50/50">
          <div>
            <span className="text-xs font-mono font-bold text-gray-400 bg-white px-2 py-0.5 rounded border mb-1 inline-block">
              {enrollment.uuid.split('-')[0]}
            </span>
            <h2 className="text-xl font-bold font-primary text-gray-900 leading-tight">
              Matrícula en {enrollment.course?.name}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white text-gray-400 border hover:text-gray-600 hover:bg-gray-50 rounded-xl transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
            <div className="flex-1 overflow-hidden pr-4">
               <p className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1">Enlace Público</p>
               <p className="text-sm font-mono text-blue-600 truncate">{publicLink}</p>
            </div>
            <button 
              onClick={() => { navigator.clipboard.writeText(publicLink); alert('Copiado'); }}
              className="bg-white border border-blue-200 text-blue-700 font-medium px-4 py-2 rounded-lg text-sm hover:bg-blue-50 flex items-center gap-2"
            >
               <LinkIcon size={16} /> Copiar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">Datos del Estudiante</span>
              <p className="font-semibold text-gray-900 text-lg">{enrollment.student_name || 'No proporcionado'}</p>
              <p className="text-sm text-gray-600 mt-1">{enrollment.student_email}</p>
              <p className="text-sm text-gray-600">{enrollment.student_phone}</p>
              <p className="text-sm text-gray-600">{enrollment.student_id_number && `ID: ${enrollment.student_id_number}`}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
               <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-2">Información del Sistema</span>
               <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-500">Asesor</span>
                   <span className="font-medium text-gray-900">{enrollment.advisor?.name}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-500">Estado</span>
                   <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${StatusMap[enrollment.status].color}`}>
                    {StatusMap[enrollment.status].label}
                   </span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-500">Creado</span>
                   <span className="font-medium text-gray-900 text-xs">{new Date(enrollment.created_at).toLocaleDateString()}</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Cambiar estado administrativo */}
          {hasPermission('enrollments.approve') && (
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                 <AlertCircle size={16} /> Control de Estado Administrativo
              </h3>
              
              {!statusConfirm ? (
                <div className="flex flex-wrap gap-2">
                  {Object.keys(StatusMap).filter(k => k !== enrollment.status && ['in_review', 'approved', 'incomplete', 'void', 'sent'].includes(k)).map(status => (
                    <button 
                      key={status} 
                      onClick={() => setStatusConfirm(status)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${StatusMap[status].color} hover:opacity-80 border-transparent`}
                    >
                      Marcar {StatusMap[status].label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 shadow-sm animate-in fade-in">
                  <p className="text-sm font-bold text-gray-700 mb-2">Observaciones para cambiar a <span className={`px-2 py-0.5 rounded text-xs ml-1 ${StatusMap[statusConfirm].color}`}>{StatusMap[statusConfirm].label}</span>:</p>
                  <input 
                    type="text" 
                    value={statusNotes}
                    onChange={e => setStatusNotes(e.target.value)}
                    placeholder="Ej: Documentación validada correctamente..."
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg p-2 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all mb-3"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setStatusConfirm(null)} className="px-3 py-1.5 text-sm text-gray-500 font-bold">Cancelar</button>
                    <button 
                      onClick={() => handleStatusChange(statusConfirm)}
                      className="px-4 py-1.5 text-sm bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition"
                    >
                      Actualizar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Historial */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Clock size={16} /> Historial del Enlace
            </h3>
            
            <div className="space-y-5 pl-4 border-l-2 border-gray-100">
              {enrollment.histories?.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay historial.</p>
              ) : (
                enrollment.histories?.map((history: any) => (
                  <div key={history.id} className="relative">
                    <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-blue-200 border-2 border-white"></div>
                    <div>
                      <div className="flex items-center gap-2">
                         <span className="font-bold text-gray-900 text-sm">{history.user?.name || 'ESTUDIANTE'}</span>
                         <span className="text-[10px] text-gray-400 font-medium px-2 py-0.5 rounded-full bg-gray-50 border">{new Date(history.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Cambió estado a <span className={`inline-flex px-1.5 py-0.5 rounded font-bold text-[10px] ${StatusMap[history.new_status]?.color || 'bg-gray-100 text-gray-800'}`}>{StatusMap[history.new_status]?.label || history.new_status}</span>
                      </p>
                      {history.notes && (
                        <div className="mt-2 bg-gray-50 border border-gray-100 p-2.5 rounded-lg text-xs italic text-gray-500 border-l-2 border-l-blue-300">
                          {history.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
