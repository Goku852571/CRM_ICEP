import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getEnrollments, getCourses, EnrollmentForm, Course } from '../services/enrollmentService';
import { useAuth } from '@/shared/hooks/useAuth';
import { Plus, Search, Link as LinkIcon, CheckCircle2, Clock, XCircle, FileText } from 'lucide-react';
import EnrollmentFormModal from '../components/EnrollmentFormModal';
import EnrollmentDetailModal from '../components/EnrollmentDetailModal';

const StatusMap: Record<string, { label: string, color: string }> = {
  pending_send: { label: 'Pendiente Envío', color: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Enviado', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completado', color: 'bg-yellow-100 text-yellow-700' },
  in_review: { label: 'En Revisión', color: 'bg-purple-100 text-purple-700' },
  approved: { label: 'Aprobado', color: 'bg-green-100 text-green-700' },
  incomplete: { label: 'Incompleto', color: 'bg-orange-100 text-orange-700' },
  void: { label: 'Anulado', color: 'bg-red-100 text-red-700' }
};

export default function EnrollmentListPage() {
  const { hasPermission, user } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentForm[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | null>(null);

  const [filters, setFilters] = useState({
    status: '',
    advisor_id: ''
  });

  const location = useLocation();
  const fetchData = async () => {
    setLoading(true);
    try {
      const payloadFilters = { ...filters };
      if (!hasPermission('enrollments.view_all')) {
        payloadFilters.advisor_id = String(user?.id);
      }

      const [enrollmentsResponse, coursesResponse] = await Promise.all([
        getEnrollments(payloadFilters),
        getCourses()
      ]);
      setEnrollments(enrollmentsResponse.data);
      setCourses(coursesResponse.data);
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Check for deep link from notification state
    if (location.state?.selectedEnrollmentId) {
      setSelectedEnrollmentId(location.state.selectedEnrollmentId);
    }
  }, [filters, location.state]);

  const copyToClipboard = (uuid: string) => {
    const link = `${window.location.origin}/enrollment/${uuid}`;
    navigator.clipboard.writeText(link);
    alert('¡Enlace copiado al portapapeles!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-primary">Matrículas Postventa</h1>
          <p className="text-sm text-gray-500 mt-1">Generación y seguimiento de formularios de registro para estudiantes</p>
        </div>
        {hasPermission('enrollments.create') && (
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition font-medium shadow-md shadow-blue-500/20"
          >
            <Plus size={20} />
            Generar Formulario
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex gap-4">
          <select 
            className="border-gray-200 border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-shadow bg-white"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))}
          >
            <option value="">Cualquier estado</option>
            {Object.entries(StatusMap).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          {hasPermission('enrollments.view_all') && (
             <input
               type="text"
               placeholder="Filtrar ID de Asesor"
               className="border-gray-200 border rounded-xl px-4 py-2 text-sm outline-none w-48 bg-white"
               value={filters.advisor_id}
               onChange={(e) => setFilters({...filters, advisor_id: e.target.value})}
             />
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white text-gray-400 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 border-b border-gray-100">UUID / Curso</th>
                <th className="px-6 py-4 border-b border-gray-100">Estudiante</th>
                <th className="px-6 py-4 border-b border-gray-100">Estado</th>
                <th className="px-6 py-4 border-b border-gray-100">Asesor</th>
                <th className="px-6 py-4 border-b border-gray-100">Fechas</th>
                <th className="px-6 py-4 border-b border-gray-100 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                      Cargando formularios...
                    </div>
                  </td>
                </tr>
              ) : enrollments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                     No hay formularios generados aún.
                  </td>
                </tr>
              ) : (
                enrollments.map(form => (
                  <tr key={form.id} className="hover:bg-gray-50/50 transition duration-150 group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded w-max">
                          {form.uuid.split('-')[0]}...
                        </span>
                        <span className="font-semibold text-gray-900 truncate max-w-[200px]" title={form.course?.name}>
                          {form.course?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {form.student_name ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{form.student_name}</span>
                          <span className="text-gray-500 text-xs">{form.student_phone || form.student_email || 'Sin contacto'}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No especificado aún</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${StatusMap[form.status].color}`}>
                        {StatusMap[form.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700 font-medium">{form.advisor?.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-gray-500">
                        <span>Creado: {new Date(form.created_at).toLocaleDateString()}</span>
                        {form.completed_at && <span className="text-green-600 font-medium">Llenado: {new Date(form.completed_at).toLocaleDateString()}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => copyToClipboard(form.uuid)}
                           title="Copiar Enlace"
                           className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                         >
                           <LinkIcon size={16} />
                         </button>
                         <button 
                           onClick={() => setSelectedEnrollmentId(form.id)}
                           title="Ver Detalle"
                           className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                         >
                           <FileText size={16} />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <EnrollmentFormModal 
          courses={courses}
          onClose={() => setIsFormOpen(false)} 
          onSuccess={() => { setIsFormOpen(false); fetchData(); }} 
        />
      )}

      {selectedEnrollmentId && (
        <EnrollmentDetailModal 
          enrollmentId={selectedEnrollmentId}
          onClose={() => setSelectedEnrollmentId(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}
