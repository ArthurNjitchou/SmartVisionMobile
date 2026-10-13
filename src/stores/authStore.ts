import { create } from 'zustand';
import { User, AuthResponse, LoginCredentials } from '../types/user.types';
import { authService } from '../services/auth.service';
import { getLoginErrorMessage } from '../utils/authErrors';
import { isAxiosError } from 'axios';
import { authStorage, clearSessionStorageForLogout } from '../utils/storage';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  /** `message` : affiché ensuite sur l'écran de connexion (ex. compte désactivé). */
  logout: (message?: string) => Promise<void>;
  initializeAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  // Important: true au démarrage pour laisser le temps de restaurer la session
  isLoading: true,
  error: null,

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const response: AuthResponse = await authService.signIn(credentials);
      
      // Sauvegarder le token et les données utilisateur
      await authStorage.setToken(response.token);
      await authStorage.setUserData(response.user);
      
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: unknown) {
      if (__DEV__ && isAxiosError(error)) {
        console.warn('[auth/login]', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      set({
        isLoading: false,
        error: getLoginErrorMessage(error),
        isAuthenticated: false,
      });
      throw error;
    }
  },

  logout: async (message?: string) => {
    await clearSessionStorageForLogout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: message ?? null,
    });
  },

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await authStorage.getToken();
      const userData = await authStorage.getUserData();

      if (token && userData) {
        set({
          user: userData,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        if (!token && userData) {
          await authStorage.clearAuth();
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
