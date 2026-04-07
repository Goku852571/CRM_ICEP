import api from '../../../shared/services/api';

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  html_body: string;
  variables_hint?: string[];
  created_at: string;
  created_by_user?: { id: number; name: string };
}

export interface EmailCampaign {
  id: number;
  name: string;
  subject: string;
  html_body: string;
  template_id?: number;
  sender_name: string;
  sender_email: string;
  recipient_type: 'leads' | 'course' | 'selected';
  recipient_course_id?: number;
  recipient_lead_ids?: number[];
  status: 'draft' | 'sending' | 'sent' | 'failed';
  sent_at?: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  created_by_user?: { id: number; name: string };
  course?: { id: number; name: string };
}

export interface EmailSettings {
  driver: 'smtp' | 'mailgun' | 'ses';
  host?: string;
  port: number;
  username?: string;
  password?: string;
  encryption?: 'tls' | 'ssl' | '';
  from_address: string;
  from_name: string;
}

// Settings
export const getEmailSettings = async () => {
    const response = await api.get('/email/settings');
    return response.data;
};

export const saveEmailSettings = async (data: EmailSettings) => {
    const response = await api.post('/email/settings', data);
    return response.data;
};

export const testEmailSettings = async (testEmail: string) => {
    const response = await api.post('/email/settings/test', { test_email: testEmail });
    return response.data;
};

// Templates
export const getEmailTemplates = async () => {
    const response = await api.get('/email/templates');
    return response.data;
};

export const createEmailTemplate = async (data: Partial<EmailTemplate>) => {
    const response = await api.post('/email/templates', data);
    return response.data;
};

export const updateEmailTemplate = async (id: number, data: Partial<EmailTemplate>) => {
    const response = await api.put(`/email/templates/${id}`, data);
    return response.data;
};

export const deleteEmailTemplate = async (id: number) => {
    const response = await api.delete(`/email/templates/${id}`);
    return response.data;
};

// Campaigns
export const getEmailCampaigns = async () => {
    const response = await api.get('/email/campaigns');
    return response.data;
};

export const createEmailCampaign = async (data: Partial<EmailCampaign>) => {
    const response = await api.post('/email/campaigns', data);
    return response.data;
};

export const sendEmailCampaign = async (id: number) => {
    const response = await api.post(`/email/campaigns/${id}/send`);
    return response.data;
};

export const deleteEmailCampaign = async (id: number) => {
    const response = await api.delete(`/email/campaigns/${id}`);
    return response.data;
};

export const previewRecipients = async (data: { recipient_type: string; recipient_course_id?: number; recipient_lead_ids?: number[] }) => {
    const response = await api.post('/email/preview-recipients', data);
    return response.data;
};
