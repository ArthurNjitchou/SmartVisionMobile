import api from './api';
import { API_ENDPOINTS } from '../constants/config';
import type { ReportFilters, ReportItem } from '../types/report.types';

function buildQuery(filters: ReportFilters): string {
  const params = new URLSearchParams();
  if (filters.studentId) params.append('studentId', filters.studentId);
  if (filters.teacherId) params.append('teacherId', filters.teacherId);
  if (filters.agencyId) params.append('agencyId', filters.agencyId);
  if (filters.status) params.append('status', filters.status);
  if (filters.year) params.append('year', filters.year);
  if (filters.month) params.append('month', filters.month);
  if (filters.date) params.append('date', filters.date);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  return params.toString();
}

export const reportService = {
  async getAllReportFiles(filters: ReportFilters): Promise<ReportItem[]> {
    const query = buildQuery(filters);
    const path = `${API_ENDPOINTS.REPORT.list}?${query}`;
    const response = await api.get<unknown>(path);
    const payload = response.data as any;
    const list = payload?.data?.data ?? payload?.data ?? payload;
    return Array.isArray(list) ? list : [];
  },
};
