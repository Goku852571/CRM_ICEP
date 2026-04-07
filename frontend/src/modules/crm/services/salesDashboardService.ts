import api from '../../../shared/services/api';

export interface SalesDashboardData {
  conversion_rate: number;
  avg_response_time_minutes: number;
  pipeline_value: number;
  advisor_performance: {
    id: number;
    name: string;
    total: number;
    won: number;
    conversion: number;
    target: number;
  }[];
  leads_by_source: {
    source: string;
    count: number;
  }[];
}

export const getSalesDashboard = async (params?: Record<string, any>) => {
  const response = await api.get('/sales/dashboard', { params });
  return response.data as SalesDashboardData;
};

export const getAdvisorStats = async (id: number, params?: Record<string, any>) => {
  const response = await api.get(`/sales/advisor/${id}/stats`, { params });
  return response.data;
};

export const approveOpportunity = async (id: number) => {
  const response = await api.post(`/sales/opportunities/${id}/approve`);
  return response.data;
};

export const exportSalesDashboardReport = async (period: string) => {
  try {
    const response = await api.get('/sales/export', {
      params: { period },
      responseType: 'blob',
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte_ventas_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('Error downloading report:', error);
    throw error;
  }
};

