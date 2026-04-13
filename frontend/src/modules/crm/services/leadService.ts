import api from '../../../shared/services/api';

export interface LeadInteraction {
  id: number;
  lead_id: number;
  user_id: number;
  type: 'call' | 'whatsapp' | 'email' | 'meeting';
  result: 'no_response' | 'interested' | 'call_back' | 'not_interested' | 'sold' | string;
  notes: string | null;
  interacted_at: string;
  user?: {
    id: number;
    name: string;
  };
}

export interface Lead {
  id: number;
  uuid: string;
  student_id: string;
  name: string;
  email: string | null;
  phone: string;
  city: string | null;
  id_number: string | null;
  profession: string | null;
  country: string | null;
  source: string;
  status: 'new' | 'contacted' | 'interested' | 'following_up' | 'ready_to_close' | 'closed_won' | 'lost';
  course_interest_id: number | null;
  advisor_id: number | null;
  created_at: string;
  updated_at: string;
  course?: { id: number; name: string };
  advisor?: { id: number; name: string };
  interactions?: LeadInteraction[];
  enrollment?: { id: number; uuid: string; status: string };
}

export const getLeads = async (params?: Record<string, any>) => {
  const response = await api.get('/leads', { params });
  return response.data;
};

export const getLead = async (id: number) => {
  const response = await api.get(`/leads/${id}`);
  return response.data;
};

export const createLead = async (data: Partial<Lead>) => {
  const response = await api.post('/leads', data);
  return response.data;
};

export const updateLead = async (id: number, data: Partial<Lead>) => {
  const response = await api.put(`/leads/${id}`, data);
  return response.data;
};

export const updateLeadStatus = async (id: number, status: string) => {
  const response = await api.patch(`/leads/${id}/status`, { status });
  return response.data;
};

export const addLeadInteraction = async (id: number, data: Partial<LeadInteraction>) => {
  const response = await api.post(`/leads/${id}/interactions`, data);
  return response.data;
};

export const deleteLead = async (id: number) => {
  const response = await api.delete(`/leads/${id}`);
  return response.data;
};

export const getLeadStats = async () => {
  const response = await api.get('/leads/stats');
  return response.data;
};

export const importLeads = async (file: File, advisors?: number[], courseId?: number) => {
  const formData = new FormData();
  formData.append('file', file);
  if (advisors && advisors.length > 0) {
    advisors.forEach(id => formData.append('advisors[]', id.toString()));
  }
  if (courseId) {
    formData.append('course_id', courseId.toString());
  }

  const response = await api.post('/leads/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const downloadLeadTemplate = async () => {
  try {
    const response = await api.get('/leads/template/download', {
      responseType: 'blob',
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_importacion_leads.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('Error downloading template:', error);
  }
};
