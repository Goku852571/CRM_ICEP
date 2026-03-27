import api from '../../../shared/services/api';

export interface User {
  id: number;
  name: string;
  email: string;
  roles: Role[];
  permissions?: any[];
}

export interface Role {
  id: number;
  name: string;
}

export const getUsers = async (page = 1, search = '') => {
  const response = await api.get('/users', {
    params: { page, search }
  });
  return response.data;
};

export const getRoles = async () => {
  const response = await api.get('/roles');
  return response.data;
};

export const createUser = async (data: any) => {
  const response = await api.post('/users', data);
  return response.data;
};

export const updateUser = async (id: number, data: any) => {
  const response = await api.put(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: number) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};
