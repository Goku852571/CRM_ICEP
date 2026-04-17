import api from "@/shared/services/api";

export interface Bank {
  id: number;
  name: string;
  show_in_enrollment: boolean;
}

export const getBanks = async () => {
  const response = await api.get('/banks');
  return response.data;
};

export const createBank = async (data: Omit<Bank, 'id'>) => {
  const response = await api.post('/banks', data);
  return response.data;
};

export const updateBank = async (id: number, data: Partial<Bank>) => {
  const response = await api.put(`/banks/${id}`, data);
  return response.data;
};

export const deleteBank = async (id: number) => {
  const response = await api.delete(`/banks/${id}`);
  return response.data;
};
