import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '../constants/config';
import { User } from '../types/user.types';

/** Normalise un jeton lu depuis le stockage (legacy JSON ou chaîne brute). */
export function normalizeStoredToken(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed);
      return typeof parsed === 'string' && parsed.trim() ? parsed.trim() : null;
    } catch {
      return null;
    }
  }
  return trimmed;
}

export const storage = {
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  },

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};

// Helpers spécifiques pour l'authentification
export const authStorage = {
  async getToken(): Promise<string | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      return normalizeStoredToken(raw);
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    const normalized = normalizeStoredToken(token);
    if (!normalized) return;
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, normalized);
  },

  async removeToken(): Promise<void> {
    return storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  async getUserData(): Promise<User | null> {
    return storage.getItem<User>(STORAGE_KEYS.USER_DATA);
  },

  async setUserData(userData: User): Promise<void> {
    return storage.setItem(STORAGE_KEYS.USER_DATA, userData);
  },

  async clearAuth(): Promise<void> {
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
      storage.removeItem(STORAGE_KEYS.USER_DATA),
    ]);
  },
};

/** Cookies lisibles par JS (pas les HttpOnly). path=/ et variante domaine courant. */
function clearWebCookies(): void {
  if (typeof document === 'undefined') return;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const name = part.split('=')[0]?.trim();
    if (!name) continue;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    if (hostname) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${hostname}`;
      if (hostname.startsWith('www.')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${hostname.slice(4)}`;
      }
    }
  }
}

/**
 * Déconnexion : sur le web, vide sessionStorage, cookies (accessibles en JS), AsyncStorage.
 * Sur natif : supprime token + user uniquement.
 */
export async function clearSessionStorageForLogout(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.clear();
      } catch {
        /* ignore */
      }
      try {
        clearWebCookies();
      } catch {
        /* ignore */
      }
    }
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.error('AsyncStorage.clear (web):', e);
    }
    return;
  }
  await authStorage.clearAuth();
}
