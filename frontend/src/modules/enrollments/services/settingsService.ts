import api from '@/shared/services/api';

export const getEnrollmentValidationSetting = async () => {
    // This is public
    const response = await api.get('/public/system/settings/enrollment');
    return response.data;
};

export const updateEnrollmentValidationSetting = async (enabled: boolean) => {
    // This is protected (Admin)
    const response = await api.patch('/system/settings/enrollment', { enabled });
    return response.data;
};
