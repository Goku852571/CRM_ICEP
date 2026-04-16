import api from '../../../shared/services/api';

export interface EnrollmentForm {
  id: number;
  uuid: string;
  student_name: string | null;
  student_email: string | null;
  student_phone: string | null;
  student_city: string | null;
  student_id_number: string | null;
  status: 'pending_send' | 'sent' | 'completed' | 'payment_pending' | 'payment_confirmed' | 'in_review' | 'approved' | 'incomplete' | 'void';
  advisor_id: number;
  course_id: number;
  created_at: string;
  sent_at: string | null;
  completed_at: string | null;
  reviewed_at: string | null;
  // Payment fields
  bank_transaction_id: string | null;
  payment_voucher_path: string | null;
  payment_requested_to: number | null;
  payment_confirmed_by: number | null;
  payment_confirmed_at: string | null;
  // Financial / audit fields
  sale_value: number | null;
  requires_billing: boolean;
  bank_name: string | null;
  payment_concept: string | null;
  total_paid: number;
  balance_due: number | null;
  advisor?: { id: number; name: string };
  course?: { id: number; name: string; code?: string; enrollment_value?: number; installments_count?: number; installment_value?: number; min_price?: number };
  histories?: any[];
  paymentRequestedTo?: { id: number; name: string; avatar?: string | null };
  paymentConfirmedBy?: { id: number; name: string; avatar?: string | null };
  payments?: {
    id: number;
    amount: number;
    bank_transaction_id: string;
    payment_voucher_path: string;
    payment_concept: string;
    bank_name: string;
    status: string;
    payment_requested_to: number | null;
    payment_confirmed_by: number | null;
    payment_confirmed_at: string | null;
    created_at: string;
    installment_number: number;
    paymentConfirmedBy?: { id: number; name: string };
    paymentRequestedTo?: { id: number; name: string };
  }[];
}

export interface AuditSummary {
  total_records: number;
  total_sale_value: number;
  total_paid: number;
  total_balance_due: number;
  billing_count: number;
  payment_confirmed: number;
}

export interface Course {
  id: number;
  name: string;
  code?: string;
  enrollment_value?: number;
  installments_count?: number;
  installment_value?: number;
  min_price?: number;
}

export interface Jefe {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
}

export const getEnrollments = async (filters: any = {}) => {
  const response = await api.get('/enrollments', { params: filters });
  return response.data;
};

export const getEnrollment = async (id: number) => {
  const response = await api.get(`/enrollments/${id}`);
  return response.data;
};

export const createEnrollment = async (data: any) => {
  const response = await api.post('/enrollments', data);
  return response.data;
};

export const updateEnrollmentStatus = async (id: number, status: string, notes: string = '') => {
  const response = await api.patch(`/enrollments/${id}/status`, { status, notes });
  return response.data;
};

export const getCourses = async () => {
  const response = await api.get('/courses/for-enrollment');
  return response.data;
};

export const exportEnrollments = async (filters: any = {}) => {
  const response = await api.get('/enrollments/export', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};

/** Obtiene la lista de usuarios con rol jefe/admin (para envío del comprobante) */
export const getJefes = async (): Promise<Jefe[]> => {
  const response = await api.get('/users/jefes');
  return response.data.data;
};

export interface PaymentUpdatePayload {
  bank_transaction_id: string;
  amount: number;
  bank_name?: string;
}


/** Asesor sube comprobante de pago */
export const submitPaymentVoucher = async (
  enrollmentId: number,
  payload: {
    bank_transaction_id: string;
    payment_concept: string;
    payment_voucher: File;
    installment_number: number;
    payment_requested_to: number;
    amount: number;
    sale_value?: number;
    requires_billing?: boolean;
    bank_name?: string;
  }
) => {
  const formData = new FormData();
  formData.append('bank_transaction_id', payload.bank_transaction_id);
  formData.append('payment_concept', payload.payment_concept);
  formData.append('payment_voucher', payload.payment_voucher);
  formData.append('installment_number', payload.installment_number.toString());
  formData.append('payment_requested_to', payload.payment_requested_to.toString());
  formData.append('amount', String(payload.amount));
  if (payload.sale_value !== undefined && payload.sale_value !== null) formData.append('sale_value', String(payload.sale_value));
  if (payload.requires_billing !== undefined) formData.append('requires_billing', payload.requires_billing ? '1' : '0');
  if (payload.bank_name) formData.append('bank_name', payload.bank_name);

  const response = await api.post(`/enrollments/${enrollmentId}/payment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/** Jefe confirma o rechaza el pago */
export const confirmPayment = async (
  enrollmentId: number,
  action: 'confirm' | 'reject',
  notes?: string
) => {
  const response = await api.post(`/enrollments/${enrollmentId}/confirm-payment`, { action, notes });
  return response.data;
};

/** Actualizar datos de un pago confirmado */
export const updateEnrollmentPayment = async (enrollmentId: number, paymentId: number, payload: PaymentUpdatePayload) => {
  const response = await api.patch(`/enrollments/${enrollmentId}/payments/${paymentId}`, payload);
  return response.data;
};


// ── AUDITORÍA FINANCIERA ─────────────────────────────────────────────────────

/** Obtiene el listado de matrículas con datos financieros para el jefe/admin */
export const getEnrollmentAuditData = async (filters: {
  start_date?: string;
  end_date?: string;
  advisor_id?: number;
  status?: string;
  requires_billing?: boolean;
} = {}): Promise<{ data: EnrollmentForm[]; summary: AuditSummary }> => {
  const response = await api.get('/sales/enrollment-audit', { params: filters });
  return response.data;
};

/** Actualización inline de datos financieros (solo jefe/admin) */
export const updateEnrollmentFinancials = async (
  id: number,
  payload: {
    sale_value?: number | null;
    requires_billing?: boolean;
    bank_name?: string | null;
    payment_concept?: string | null;
    total_paid?: number | null;
  }
) => {
  const response = await api.patch(`/sales/enrollments/${id}/financials`, payload);
  return response.data;
};

/** Descarga el CSV de control de matrículas con formato del Excel original */
export const exportDetailedReport = async (filters: { start_date?: string; end_date?: string } = {}) => {
  const response = await api.get('/sales/enrollment-audit/export', {
    params: filters,
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `control_matriculas_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ── Public Routes ────────────────────────────────────────────────────────────
export const getPublicEnrollment = async (uuid: string) => {
  const response = await api.get(`/public/enrollments/${uuid}`);
  return response.data;
};

export const submitPublicEnrollment = async (uuid: string, data: any) => {
  const response = await api.post(`/public/enrollments/${uuid}/submit`, data);
  return response.data;
};
