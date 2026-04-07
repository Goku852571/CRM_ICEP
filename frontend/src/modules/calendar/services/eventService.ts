import api from '../../../shared/services/api';

export interface CalendarEvent {
    id: number;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
    color: string;
    icon?: string;
    meeting_link?: string;
    image_path?: string;
    image_url?: string;
    user_id: number;
    creator?: { id: number; name: string };
    participants?: { id: number; name: string; avatar_url?: string }[];
}

export const getEvents = async () => {
    const response = await api.get('/events');
    return response.data;
};

export const createEvent = async (data: any) => {
    const isFormData = data instanceof FormData;
    const response = await api.post('/events', data, {
        headers: {
            'Content-Type': isFormData ? 'multipart/form-data' : 'application/json'
        }
    });
    return response.data;
};

export const updateEvent = async (id: number, data: any) => {
    // Laravel doesn't handle PUT with FormData/Files well sometimes, 
    // we use a POST with _method=PUT or just update the logic.
    // For simplicity with hybrid data:
    const isFormData = data instanceof FormData;
    if (isFormData) {
        data.append('_method', 'PUT');
        const response = await api.post(`/events/${id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }
    const response = await api.put(`/events/${id}`, data);
    return response.data;
};

export const deleteEvent = async (id: number) => {
    const response = await api.delete(`/events/${id}`);
    return response.data;
};
