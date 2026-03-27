import api from '../../../shared/services/api';

export interface CalendarEvent {
    id: number;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
    color: string;
    user_id: number;
    creator?: { id: number; name: string };
}

export const getEvents = async () => {
    const response = await api.get('/events');
    return response.data;
};

export const createEvent = async (data: any) => {
    const response = await api.post('/events', data);
    return response.data;
};

export const updateEvent = async (id: number, data: any) => {
    const response = await api.put(`/events/${id}`, data);
    return response.data;
};

export const deleteEvent = async (id: number) => {
    const response = await api.delete(`/events/${id}`);
    return response.data;
};
