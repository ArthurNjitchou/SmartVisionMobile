import api from './api';
import { API_ENDPOINTS } from '../constants/config';
import type { PaginatedAnnouncements } from '../types/announcement.types';

export interface AnnouncementPagination {
  page: number;
  limit: number;
}

export const announcementService = {
  async getPublishedAnnouncementsByRole(
    role: string,
    pagination: AnnouncementPagination = { page: 1, limit: 10 }
  ): Promise<PaginatedAnnouncements> {
    const { data } = await api.post<PaginatedAnnouncements>(
      API_ENDPOINTS.ANNOUNCEMENT.publishedByRole(role),
      pagination || {}
    );
    return data;
  },

  async getPublishedAnnouncementsByRoleAndAgency(
    role: string,
    agencyIds: string[],
    pagination: AnnouncementPagination = { page: 1, limit: 10 }
  ): Promise<PaginatedAnnouncements> {
    const { data } = await api.post<PaginatedAnnouncements>(
      API_ENDPOINTS.ANNOUNCEMENT.publishedByRoleAndAgency(role),
      {
        agencyId: agencyIds,
        pagination: pagination || { page: 1, limit: 10 },
      }
    );
    return data;
  },

  async getPublishedForParent(
    pagination: AnnouncementPagination = { page: 1, limit: 10 }
  ): Promise<PaginatedAnnouncements> {
    return this.getPublishedAnnouncementsByRole('parent', pagination);
  },
};
