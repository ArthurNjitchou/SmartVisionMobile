import { create } from 'zustand';
import { User, AuthResponse, LoginCredentials } from '../types/user.types';
import { authService } from '../services/auth.service';
import { getLoginErrorMessage } from '../utils/authErrors';
import { isAxiosError } from 'axios';
import { authStorage, clearSessionStorageForLogout } from '../utils/storage';
import { MOBILE_ROLES, SESSION_EXPIRED_MESSAGE, UNSUPPORTED_ROLE_MESSAGE } from '../constants/config';
import { isJwtExpired } from '../utils/jwt';

/** Seuls les parents et enseignants ont un espace dans l'application mobile. */
function isMobileRole(role: string | undefined): boolean {
  return (MOBILE_ROLES as readonly string[]).includes(role ?? '');
}

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

      // Identifiants valides mais rôle sans espace mobile (admin, élève…) : on ne garde
      // pas la session et on explique pourquoi (les erreurs d'identifiants restent inchangées).
      if (!isMobileRole(response.user?.role)) {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: UNSUPPORTED_ROLE_MESSAGE,
        });
        return;
      }
      
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

      if (token && isJwtExpired(token)) {
        // Session restaurée mais jeton expiré (7 jours) : on ne lance aucune requête,
        // on renvoie directement au login avec une explication.
        await authStorage.clearAuth();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: SESSION_EXPIRED_MESSAGE,
        });
      } else if (token && userData && !isMobileRole(userData.role)) {
        await authStorage.clearAuth();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: UNSUPPORTED_ROLE_MESSAGE,
        });
      } else if (token && userData) {
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
