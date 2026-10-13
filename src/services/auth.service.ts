import api from './api';
import { API_ENDPOINTS } from '../constants/config';
import { AuthResponse, LoginCredentials } from '../types/user.types';

export const authService = {
  async signIn(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(
      API_ENDPOINTS.AUTH.SIGNIN,
      credentials
    );
    return response.data;
  },

  /** Demande un lien de réinitialisation du mot de passe, reçu par email. */
  async sendPasswordResetEmail(email: string): Promise<void> {
    await api.post(API_ENDPOINTS.AUTH.SEND_RESET_EMAIL, { email });
  },
};
