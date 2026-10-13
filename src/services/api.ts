import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';
import { ACCOUNT_DISABLED_MESSAGE, getBaseURL } from '../constants/config';
import { authStorage } from '../utils/storage';

/**
 * True si la requête partait avec un Bearer (session supposée).
 * Évite de traiter un 401 sur POST /auth/signin (mauvais mot de passe) comme une session périmée.
 */
function requestHadBearer(config: InternalAxiosRequestConfig | undefined): boolean {
  if (!config?.headers) return false;
  const h = config.headers;
  const auth =
    typeof (h as { get?: (key: string) => string }).get === 'function'
      ? (h as { get: (key: string) => string }).get('Authorization')
      : (h as Record<string, unknown>).Authorization;
  return typeof auth === 'string' && auth.startsWith('Bearer ');
}

function isAuthFailure(status: number | undefined, data: unknown): boolean {
  if (status === 401) return true;
  if (status !== 403) return false;
  const message = String(
    (data as { error?: string; message?: string })?.error ||
      (data as { error?: string; message?: string })?.message ||
      ''
  ).toLowerCase();
  return message.includes('invalid token') || message.includes('token not present');
}

function isAccountDisabled(data: unknown): boolean {
  return (data as { code?: string } | undefined)?.code === 'ACCOUNT_DISABLED';
}

async function invalidateSessionAndGoToLogin(message?: string): Promise<void> {
  const { useAuthStore } = await import('../stores/authStore');
  await useAuthStore.getState().logout(message);
  router.replace('/(auth)/login' as never);
}

const api: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    config.baseURL = getBaseURL();

    const token = await authStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Jeton invalide / expiré → déconnexion. Les 403 métier (ex. collecte MeSomb) sont ignorés.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const hadBearer = requestHadBearer(error.config);
    const url = String(error.config?.url || '');
    const isPaymentCollect = url.includes('/payment/mesomb/collect');
    const isBusinessForbidden = status === 403 && isPaymentCollect;

    if (
      hadBearer &&
      isAuthFailure(status, error.response?.data) &&
      !isBusinessForbidden
    ) {
      await invalidateSessionAndGoToLogin(
        isAccountDisabled(error.response?.data) ? ACCOUNT_DISABLED_MESSAGE : undefined
      );
    }
    return Promise.reject(error);
  }
);

export default api;
