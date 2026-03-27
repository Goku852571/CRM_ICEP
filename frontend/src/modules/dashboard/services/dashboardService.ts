import api from '../../../shared/services/api';

export interface DashboardStats {
  overview: {
    label: string;
    value: number | string;
    icon: string;
    color: string;
  }[];
  recent_activity: {
    id: number;
    user: string;
    action: string;
    time: string;
    roles: string[];
  }[];
  chart_data: {
    name: string;
    tickets: number;
    enrollments: number;
  }[];
}

export const getDashboardStats = async () => {
  const response = await api.get('/dashboard/stats');
  return response.data.data as DashboardStats;
};
