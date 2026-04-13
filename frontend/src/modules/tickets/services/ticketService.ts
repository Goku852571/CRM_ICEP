import api from '../../../shared/services/api';

export interface Ticket {
  id: number;
  title: string;
  description: string;
  area_id: number;
  requester_id: number;
  assignee_id: number | null;
  priority: 'normal' | 'urgent' | 'priority';
  status: 'open' | 'in_progress' | 'paused' | 'closed' | 'cancelled' | 'waiting_approval' | 'changes_requested';
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  area?: { id: number; name: string };
  requester?: { id: number; name: string; avatar?: string };
  assignee?: { id: number; name: string; avatar?: string };
  histories?: History[];
  replies?: TicketReply[];
  resources?: TicketResource[];
}

export interface TicketResource {
  id: number;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  url: string;
  created_at: string;
}

export interface TicketReply {
  id: number;
  user_id: number;
  message: string;
  created_at: string;
  user: { id: number; name: string };
  resources?: TicketResource[];
}

export interface History {
  id: number;
  action: string;
  old_value: string;
  new_value: string;
  reason: string;
  created_at: string;
  user: { id: number; name: string };
}

export interface Area {
  id: number;
  name: string;
}

export const getTickets = async (filters: any = {}) => {
  const response = await api.get('/tickets', { params: filters });
  return response.data;
};

export const getTicket = async (id: number) => {
  const response = await api.get(`/tickets/${id}`);
  return response.data;
};

export const createTicket = async (data: any, files?: File[]) => {
  if (files && files.length > 0) {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
       if (data[key] !== null && data[key] !== undefined) {
         formData.append(key, data[key]);
       }
    });
    files.forEach(file => {
      formData.append('resources[]', file);
    });
    const response = await api.post('/tickets', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } else {
    const response = await api.post('/tickets', data);
    return response.data;
  }
};

export const updateTicketStatus = async (id: number, status: string, reason: string) => {
  const response = await api.patch(`/tickets/${id}/status`, { status, reason });
  return response.data;
};

export const updateTicketPriority = async (id: number, priority: string, reason: string) => {
  const response = await api.patch(`/tickets/${id}/priority`, { priority, reason });
  return response.data;
};

export const getAreas = async () => {
  const response = await api.get('/areas');
  return response.data;
};

export const replyToTicket = async (ticketId: number, message: string, files: File[]) => {
  const formData = new FormData();
  formData.append('message', message);
  files.forEach(file => {
    formData.append('resources[]', file);
  });

  const response = await api.post(`/tickets/${ticketId}/replies`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};
