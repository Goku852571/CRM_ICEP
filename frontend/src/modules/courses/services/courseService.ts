import api from '../../../shared/services/api';

export interface CourseAttachment {
    id: number;
    name: string;
    type: 'file' | 'url';
    path: string | null;
    url: string | null;
    mime_type: string | null;
    size: number | null;
    download_url: string;
}

export interface CourseQuestion {
    id: number;
    course_id: number;
    user_id: number;
    question: string;
    answer: string | null;
    status: 'pending' | 'answered' | 'closed';
    answered_at: string | null;
    created_at: string;
    asker: { id: number; name: string; email: string };
    answerer: { id: number; name: string } | null;
}

export interface Course {
    id: number;
    name: string;
    code?: string;
    description: string | null;
    cover_image: string | null;
    price: number;
    status: 'draft' | 'active' | 'inactive' | 'finished' | 'archived';
    start_date: string | null;
    area_id: number | null;
    created_by: number | null;
    area: { id: number; name: string } | null;
    creator: { id: number; name: string } | null;
    attachments: CourseAttachment[];
    questions: CourseQuestion[];
    created_at: string;
}

export const getCourses = async (params?: any) => {
    const response = await api.get('/courses', { params });
    return response.data;
};

export const getCourse = async (id: number) => {
    const response = await api.get(`/courses/${id}`);
    return response.data;
};

export const createCourse = async (formData: FormData) => {
    const response = await api.post('/courses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const updateCourse = async (id: number, formData: FormData) => {
    formData.append('_method', 'PUT');
    const response = await api.post(`/courses/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const deleteCourse = async (id: number) => {
    const response = await api.delete(`/courses/${id}`);
    return response.data;
};

export const addAttachment = async (courseId: number, formData: FormData) => {
    const response = await api.post(`/courses/${courseId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const deleteAttachment = async (courseId: number, attachmentId: number) => {
    const response = await api.delete(`/courses/${courseId}/attachments/${attachmentId}`);
    return response.data;
};

export const getCourseQuestions = async (courseId: number) => {
    const response = await api.get(`/courses/${courseId}/questions`);
    return response.data;
};

export const askQuestion = async (courseId: number, question: string) => {
    const response = await api.post(`/courses/${courseId}/questions`, { question });
    return response.data;
};

export const answerQuestion = async (courseId: number, questionId: number, answer: string, status: string) => {
    const response = await api.patch(`/courses/${courseId}/questions/${questionId}/answer`, { answer, status });
    return response.data;
};

export const getCoursesForEnrollment = async () => {
    const response = await api.get('/courses/for-enrollment');
    return response.data;
};

export const updateCourseStatus = async (id: number, status: string) => {
    const response = await api.patch(`/courses/${id}`, { status });
    return response.data;
};

const STATUS_MAP = {
    draft:    { label: 'Borrador',   color: 'bg-gray-100 text-gray-600'    },
    active:   { label: 'Activo',     color: 'bg-green-100 text-green-700'  },
    inactive: { label: 'Inactivo',   color: 'bg-yellow-100 text-yellow-700'},
    finished: { label: 'Finalizado', color: 'bg-blue-100 text-blue-700'    },
    archived: { label: 'Archivado',  color: 'bg-red-100 text-red-600'      },
};
export { STATUS_MAP };
