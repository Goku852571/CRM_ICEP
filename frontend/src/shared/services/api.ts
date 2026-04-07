import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import Swal from 'sweetalert2';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor — always attach token if present
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Only redirect if the failing request is NOT the /auth/me bootstrap call
      const url = error.config?.url || '';
      if (!url.includes('/auth/me')) {
        localStorage.removeItem('token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    if (error.response?.status === 403) {
      Swal.fire({
        icon: 'error',
        title: 'Acceso Denegado',
        text: 'No tienes los permisos necesarios para realizar esta acción o acceder a esta información.',
        confirmButtonColor: '#3085d6',
      });
    }

    return Promise.reject(error);
  }
);

export default api;
