import api from './api';
import { API_ENDPOINTS } from '../constants/config';

export interface AgencyItem {
  id?: string;
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  manager?: string;
}

interface UserAgenciesResponse {
  agencies?: AgencyItem[];
}

export const agencyService = {
  async getAllUserAgencywithdetails(userId: string): Promise<AgencyItem[]> {
    const { data } = await api.post<UserAgenciesResponse>(
      API_ENDPOINTS.AGENCY.getUserAgenciesWithDetails,
      { userId }
    );
    return Array.isArray(data?.agencies) ? data.agencies : [];
  },
};
