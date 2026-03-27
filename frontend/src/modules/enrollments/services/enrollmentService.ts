import api from '../../../shared/services/api';

export interface EnrollmentForm {
  id: number;
  uuid: string;
  student_name: string | null;
  student_email: string | null;
  student_phone: string | null;
  student_city: string | null;
  student_id_number: string | null;
  status: 'pending_send' | 'sent' | 'completed' | 'in_review' | 'approved' | 'incomplete' | 'void';
  advisor_id: number;
  course_id: number;
  created_at: string;
  sent_at: string | null;
  completed_at: string | null;
  reviewed_at: string | null;
  advisor?: { id: number; name: string };
  course?: { id: number; name: string };
  histories?: any[];
}

export interface Course {
  id: number;
  name: string;
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

// Public Routes
export const getPublicEnrollment = async (uuid: string) => {
  const response = await api.get(`/public/enrollments/${uuid}`);
  return response.data;
};

export const submitPublicEnrollment = async (uuid: string, data: any) => {
  const response = await api.post(`/public/enrollments/${uuid}/submit`, data);
  return response.data;
};
