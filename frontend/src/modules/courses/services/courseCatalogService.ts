import api from '../../../shared/services/api';

export interface CourseCatalogItem {
    id: number;
    name: string;
    type: 'endorsement' | 'sponsorship' | 'certificate';
    image: string | null;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

export const getCatalogItems = async (params?: any) => {
    const response = await api.get('/course-catalog', { params });
    return response.data;
};

export const createCatalogItem = async (formData: FormData) => {
    const response = await api.post('/course-catalog', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const updateCatalogItem = async (id: number, formData: FormData) => {
    formData.append('_method', 'PUT');
    const response = await api.post(`/course-catalog/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const deleteCatalogItem = async (id: number) => {
    const response = await api.delete(`/course-catalog/${id}`);
    return response.data;
};
