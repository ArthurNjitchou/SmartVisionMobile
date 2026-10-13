import api from './api';
import { API_ENDPOINTS } from '../constants/config';
import type { UserDetailsResponse } from '../types/announcement.types';

export const userService = {
  async getUserDetails(userId: string): Promise<UserDetailsResponse> {
    const { data } = await api.get<UserDetailsResponse>(
      API_ENDPOINTS.USER_DETAIL.sharedDetails(userId)
    );
    return data;
  },
};
