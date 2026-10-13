import api from './api';
import { API_ENDPOINTS } from '../constants/config';
import { ParentChild, Grade } from '../types/parent.types';

export const parentService = {
  /** Liste des enfants du parent (route Angular / user service) */
  async getParentChildren(parentId: string): Promise<ParentChild[]> {
    const response = await api.get<unknown>(
      API_ENDPOINTS.USER.parentChildren(parentId)
    );
    const data = response.data;
    if (Array.isArray(data)) return data as ParentChild[];
    if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
      return (data as { data: ParentChild[] }).data;
    }
    return [];
  },

  /** Ancienne route si encore utilisée côté backend */
  async getChildren(): Promise<ParentChild[]> {
    const response = await api.get<ParentChild[]>(API_ENDPOINTS.PARENT.CHILDREN);
    const data = response.data;
    return Array.isArray(data) ? data : [];
  },

  async getGrades(childId?: string): Promise<Grade[]> {
    const url = childId
      ? `${API_ENDPOINTS.PARENT.GRADES}?childId=${childId}`
      : API_ENDPOINTS.PARENT.GRADES;
    const response = await api.get<Grade[]>(url);
    return response.data;
  },
};
