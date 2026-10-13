import api from './api';
import { API_ENDPOINTS } from '../constants/config';

export interface NotificationItem {
  seen?: boolean;
}

export interface NotificationResponse {
  data?: NotificationItem[];
  meta?: {
    totalItems?: number;
  };
}

export const notificationService = {
  async getNotificationsByRecipientId(
    recipientId: string,
    filters: { seen?: boolean } = {},
    pagination: { page?: number; limit?: number } = { page: 1, limit: 10 }
  ): Promise<NotificationResponse> {
    const params: Record<string, string> = {
      page: String(pagination.page ?? 1),
      limit: String(pagination.limit ?? 10),
    };
    if (filters.seen !== undefined) {
      params.seen = String(filters.seen);
    }

    const { data } = await api.get<NotificationResponse>(
      API_ENDPOINTS.NOTIFICATION.byRecipient(recipientId),
      { params }
    );
    return data || { data: [], meta: { totalItems: 0 } };
  },
};
