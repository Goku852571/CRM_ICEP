import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  X, UploadCloud, FileSpreadsheet, Download, 
  Users as UsersIcon, CheckCircle2, AlertCircle, BookOpen
} from 'lucide-react';
import { importLeads, downloadLeadTemplate } from '../services/leadService';
import { getUsers, User } from '@/modules/users/services/userService';
import { getCourses, Course } from '@/modules/enrollments/services/enrollmentService';
import { showSuccess, showError } from '@/shared/utils/alerts';
import clsx from 'clsx';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportLeadsModal({ onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<'round_robin' | 'specific'>('round_robin');
  const [selectedAdvisors, setSelectedAdvisors] = useState<number[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: usersPayload, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => getUsers(1, ''),
  });

  const { data: coursesPayload } = useQuery({
    queryKey: ['courses-for-enrollment'],
    queryFn: getCourses,
  });

  const usersArray: User[] = Array.isArray(usersPayload?.data) ? usersPayload.data : [];
  const courses: Course[] = Array.isArray(coursesPayload?.data) ? coursesPayload.data : [];

  const allAdvisors = usersArray.filter((u: User) =>
    u.roles?.some(r => {
      const name = r.name.toLowerCase();
      return name.includes('asesor') || name === 'advisor';
    })
  );

  useEffect(() => {
    if (allAdvisors.length > 0 && selectedAdvisors.length === 0) {
      setSelectedAdvisors(allAdvisors.map((a: User) => a.id));
    }
  }, [allAdvisors.length]);

  const importMutation = useMutation({
    mutationFn: (data: { file: File; adv?: number[]; courseId?: number }) =>
      importLeads(data.file, data.adv, data.courseId),
    onSuccess: (data: any) => {
      showSuccess(
        '¡Importación Exitosa!',
        `Se importaron ${data.imported} leads. Duplicados ignorados: ${data.duplicates}`
      );
      onSuccess();
    },
    onError: (error: any) => {
      showError('Error de importación', error.response?.data?.message || 'Revisa el formato del archivo');
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = () => {
    if (!file) { showError('Falta Archivo', 'Debes subir un archivo .csv o .xlsx'); return; }
    if (selectedAdvisors.length === 0) { showError('Falta Asesor', 'Selecciona al menos un asesor'); return; }
    importMutation.mutate({
      file,
      adv: selectedAdvisors,
      courseId: selectedCourseId !== '' ? selectedCourseId : undefined,
    });
  };

  const toggleAdvisor = (id: number) => {
    if (assignmentMode === 'specific') {
      setSelectedAdvisors([id]);
    } else {
      setSelectedAdvisors(prev =>
        prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm" onClick={onClose} />

      <div className="bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 font-body overflow-hidden border border-outline-variant/20 animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-5 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container-lowest relative overflow-hidden">
          <div className="absolute top-0 right-[-10%] w-64 h-64 bg-primary-fixed/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
          <div>
            <h2 className="text-xl font-headline font-extrabold text-primary flex items-center gap-2">
              <FileSpreadsheet className="text-primary-fixed-variant" size={22} />
              Importación Masiva de Contactos
            </h2>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5 opacity-70">
              Solo <strong>Nombre</strong> y <strong>Teléfono</strong> son obligatorios en el archivo
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-variant text-on-surface-variant rounded-full transition-colors active:scale-95">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">

          {/* Paso 1: Plantilla */}
          <section className="flex items-center justify-between bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20">
            <div>
              <h4 className="font-bold text-sm text-on-surface mb-0.5">1. Descarga la Plantilla Oficial</h4>
              <p className="text-xs text-on-surface-variant">Columnas obligatorias: <code className="bg-surface-container-high px-1 rounded">name</code>, <code className="bg-surface-container-high px-1 rounded">phone</code></p>
            </div>
            <button
              onClick={downloadLeadTemplate}
              className="flex items-center gap-2 bg-white border border-outline-variant shadow-sm px-4 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-variant transition-colors"
            >
              <Download size={14} /> Descargar CSV
            </button>
          </section>

          {/* Paso 2: Curso de Interés Global */}
          <section>
            <h4 className="font-bold text-sm text-on-surface mb-2 flex items-center gap-2">
              <BookOpen size={14} className="text-primary" />
              2. Curso de Interés <span className="text-on-surface-variant font-normal text-xs">(opcional — se aplicará a todos los contactos)</span>
            </h4>
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value !== '' ? Number(e.target.value) : '')}
              className="w-full text-sm font-medium bg-surface-container-low border border-outline-variant/30 rounded-xl p-2.5 focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">— Sin curso específico —</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {selectedCourseId !== '' && (
              <p className="text-[11px] text-primary font-semibold mt-1.5 ml-1">
                ✓ Se asignará este curso a todos los contactos que no tengan uno en el CSV.
              </p>
            )}
          </section>

          {/* Paso 3: Subir Archivo */}
          <section>
            <h4 className="font-bold text-sm text-on-surface mb-2">3. Sube tu Archivo <span className="text-error">*</span></h4>
            <div
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200',
                dragActive ? 'border-primary bg-primary-container/20' : 'border-outline-variant/40 hover:bg-surface-variant/30 hover:border-outline',
                file ? 'bg-secondary-container/20 border-secondary' : ''
              )}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv,.xlsx,.xls" className="hidden" />
              <div className="flex flex-col items-center gap-2">
                <div className={clsx('p-3 rounded-full', file ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-outline')}>
                  {file ? <CheckCircle2 size={28} /> : <UploadCloud size={28} />}
                </div>
                {file ? (
                  <div>
                    <p className="font-bold text-on-surface">{file.name}</p>
                    <p className="text-xs font-medium text-on-surface-variant mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                    <button onClick={e => { e.stopPropagation(); setFile(null); }} className="text-error text-xs font-bold mt-1.5 hover:underline">Quitar</button>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-on-surface text-sm">Arrastra tu archivo aquí o haz clic</p>
                    <p className="text-xs font-medium text-on-surface-variant">.CSV o .XLSX — Máximo 5MB</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Paso 4: Asignación */}
          <section>
            <h4 className="font-bold text-sm text-on-surface mb-3 flex items-center gap-2">
              <UsersIcon size={14} className="text-primary" />
              4. Asignación de Asesor <span className="text-error">*</span>
            </h4>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => { setAssignmentMode('round_robin'); setSelectedAdvisors(allAdvisors.map((a: User) => a.id)); }}
                className={clsx(
                  'p-3 rounded-xl border text-left transition-all',
                  assignmentMode === 'round_robin'
                    ? 'border-primary bg-primary-container/10 ring-2 ring-primary/20 shadow-sm'
                    : 'border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-variant'
                )}
              >
                <div className="flex items-center gap-2 mb-1 text-primary">
                  <UsersIcon size={15} />
                  <span className="font-bold text-xs">Reparto Automático</span>
                </div>
                <p className="text-[10px] text-on-surface-variant leading-tight">
                  Distribuye los contactos equitativamente entre los asesores marcados.
                </p>
              </button>

              <button
                type="button"
                onClick={() => { setAssignmentMode('specific'); setSelectedAdvisors([]); }}
                className={clsx(
                  'p-3 rounded-xl border text-left transition-all',
                  assignmentMode === 'specific'
                    ? 'border-primary bg-primary-container/10 ring-2 ring-primary/20 shadow-sm'
                    : 'border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-variant'
                )}
              >
                <div className="flex items-center gap-2 mb-1 text-primary">
                  <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[8px] font-bold text-white">1</div>
                  <span className="font-bold text-xs">Un Solo Asesor</span>
                </div>
                <p className="text-[10px] text-on-surface-variant leading-tight">
                  Toda la lista va al portafolio de un único asesor seleccionado.
                </p>
              </button>
            </div>

            {/* Advertencia */}
            <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
              <AlertCircle size={13} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[10px] text-amber-800 font-medium">
                Cada contacto pertenece exclusivamente a <strong>1 solo asesor</strong>. El sistema no permite compartir ni duplicar leads entre asesores.
              </p>
            </div>

            {/* Lista de Asesores */}
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
              <p className="text-[10px] font-bold text-on-surface-variant mb-3 uppercase tracking-wider">
                {assignmentMode === 'round_robin' ? 'Asesores para el reparto:' : 'Elige un asesor:'}
              </p>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                </div>
              ) : allAdvisors.length === 0 ? (
                <p className="text-sm text-error flex items-center gap-2"><AlertCircle size={16} /> No hay asesores registrados.</p>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {allAdvisors.map((advisor: User) => {
                    const isSelected = selectedAdvisors.includes(advisor.id);
                    return (
                      <button
                        key={advisor.id}
                        onClick={() => toggleAdvisor(advisor.id)}
                        className={clsx(
                          'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border',
                          isSelected
                            ? 'bg-primary text-on-primary border-primary shadow-sm'
                            : 'bg-white text-on-surface-variant border-outline-variant/40 hover:border-primary/50'
                        )}
                      >
                        <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black', isSelected ? 'bg-white/20 text-white' : 'bg-surface-container-high text-on-surface-variant')}>
                          {advisor.name.charAt(0).toUpperCase()}
                        </div>
                        {advisor.name}
                        {isSelected && <CheckCircle2 size={12} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-outline-variant/15 bg-surface-container-lowest flex items-center justify-between gap-3">
          <p className="text-[10px] text-on-surface-variant font-medium hidden sm:block">
            {selectedAdvisors.length > 0
              ? assignmentMode === 'round_robin'
                ? `${selectedAdvisors.length} asesor(es) en el reparto`
                : `Asignando a: ${allAdvisors.find(a => a.id === selectedAdvisors[0])?.name || '—'}`
              : 'Selecciona al menos 1 asesor'}
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={onClose} className="px-4 py-2 rounded-full text-sm font-bold text-on-surface-variant hover:bg-surface-variant transition-colors">
              Cancelar
            </button>
            <button
              disabled={!file || selectedAdvisors.length === 0 || importMutation.isPending}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-on-primary font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all active:scale-95 text-sm"
            >
              {importMutation.isPending ? 'Importando...' : '🚀 Importar Contactos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
