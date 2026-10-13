import api from './api';
import { API_ENDPOINTS } from '../constants/config';
import { Class, Student } from '../types/teacher.types';

export const teacherService = {
  async getClasses(): Promise<Class[]> {
    const response = await api.get<Class[]>(API_ENDPOINTS.TEACHER.CLASSES);
    return response.data;
  },

  async getStudents(classId?: string): Promise<Student[]> {
    const url = classId
      ? `${API_ENDPOINTS.TEACHER.STUDENTS}?classId=${classId}`
      : API_ENDPOINTS.TEACHER.STUDENTS;
    const response = await api.get<Student[]>(url);
    return response.data;
  },
};
