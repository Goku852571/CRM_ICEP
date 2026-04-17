import api from "@/shared/services/api";

export interface SystemOption {
  id: number;
  category: string;
  value: string;
  label: string;
  is_active: boolean;
  sort_order: number;
}

export const getSystemOptions = async (category?: string) => {
  const params = category ? { category } : {};
  const response = await api.get('/system/options', { params });
  return response.data;
};

export const getGroupedOptions = async () => {
  const response = await api.get('/system/options/grouped');
  return response.data;
};

export const createSystemOption = async (data: Omit<SystemOption, 'id'>) => {
  const response = await api.post('/system/options', data);
  return response.data;
};

export const updateSystemOption = async (id: number, data: Partial<SystemOption>) => {
  const response = await api.put(`/system/options/${id}`, data);
  return response.data;
};

export const deleteSystemOption = async (id: number) => {
  const response = await api.delete(`/system/options/${id}`);
  return response.data;
};
