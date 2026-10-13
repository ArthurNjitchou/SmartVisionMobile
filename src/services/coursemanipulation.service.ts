import { AxiosError } from 'axios';
import { API_ENDPOINTS } from '../constants/config';
import type {
  ReportHistoryResponse,
  UpsertWeeklyReportPayload,
  WeeklyCourseReportBackend,
} from '../types/courseReport.types';
import api from './api';

export interface TeacherStudentData {
  studentId: string;
  email: string;
  firstName: string;
  lastName: string;
  domicile?: string;
  studentProfile?: {
    birthdate?: string | null;
    class?: string | null;
    section?: string | null;
    school?: { name?: string; address?: string; city?: string; zone?: string } | null;
  } | null;
  parents?: Array<{
    parentId: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
  }>;
}

export interface TeacherCourseOfferingResponse {
  data?: any[];
  meta?: { totalItems?: number; totalPages?: number; currentPage?: number };
}

export const coursemanipulationService = {
  async getStudentsOfTeacher(teacherId: string): Promise<TeacherStudentData[]> {
    const { data } = await api.post<TeacherStudentData[]>(
      API_ENDPOINTS.TEACHER.STUDENTS_OF_TEACHER,
      { teacherId }
    );
    return Array.isArray(data) ? data : [];
  },

  async getTeacherCourseOffering(
    teacherId: string,
    page = 1,
    limit = 10
  ): Promise<TeacherCourseOfferingResponse> {
    const { data } = await api.post<TeacherCourseOfferingResponse>(
      API_ENDPOINTS.TEACHER.COURSE_OFFERING,
      { teacherId, pagination: { page, limit } }
    );
    return data || { data: [], meta: { totalItems: 0 } };
  },

  async getTeacherPostulations(teacherId: string): Promise<any[]> {
    const { data } = await api.post<any[]>(API_ENDPOINTS.POSTULATION.FOR_TEACHER, {
      teacherId,
    });
    return Array.isArray(data) ? data : [];
  },

  async createPostulation(teacherId: string, courseOfferingId: string): Promise<void> {
    await api.post(API_ENDPOINTS.POSTULATION.CREATE, { teacherId, courseOfferingId });
  },

  async deleteTeacherPostulation(teacherId: string, courseOfferingId: string): Promise<void> {
    await api.post(API_ENDPOINTS.POSTULATION.DELETE, { teacherId, courseOfferingId });
  },

  async getWeeklyReport(
    teacherId: string,
    studentId: string,
    weekStart: string
  ): Promise<WeeklyCourseReportBackend | null> {
    try {
      const { data } = await api.get<WeeklyCourseReportBackend>(
        API_ENDPOINTS.COURSE_REPORT.currentWeekGet(teacherId, studentId),
        { params: { weekStart } }
      );
      if (data && typeof data === 'object' && Array.isArray((data as WeeklyCourseReportBackend).entries)) {
        return data as WeeklyCourseReportBackend;
      }
      return null;
    } catch (e) {
      const err = e as AxiosError;
      if (err.response?.status === 404) return null;
      throw e;
    }
  },

  async upsertWeeklyReport(payload: UpsertWeeklyReportPayload): Promise<WeeklyCourseReportBackend> {
    const { data } = await api.post<WeeklyCourseReportBackend>(
      API_ENDPOINTS.COURSE_REPORT.CURRENT_WEEK_UPSERT,
      payload
    );
    return data;
  },

  async getReportHistory(studentId: string, teacherId: string): Promise<ReportHistoryResponse | null> {
    const { data } = await api.get<ReportHistoryResponse | { weeks?: ReportHistoryResponse['data']['weeks'] }>(
      API_ENDPOINTS.COURSE_REPORT.HISTORY,
      { params: { studentId, teacherId } }
    );
    if (!data || typeof data !== 'object') return null;
    const maybe = data as ReportHistoryResponse;
    if (maybe.data?.weeks) return maybe;
    const loose = data as { weeks?: ReportHistoryResponse['data']['weeks'] };
    if (loose.weeks) {
      return {
        success: true,
        message: '',
        data: {
          teacherId,
          studentId,
          startDate: '',
          endDate: '',
          totalWeeks: loose.weeks.length,
          completedWeeks: loose.weeks.filter((w) => w.completed).length,
          weeks: loose.weeks,
        },
      };
    }
    return null;
  },
};
