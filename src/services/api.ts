import axios, { AxiosError, AxiosInstance, CanceledError, InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';
import { ACCOUNT_DISABLED_MESSAGE, getBaseURL, SESSION_EXPIRED_MESSAGE } from '../constants/config';
import { isJwtExpired } from '../utils/jwt';
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

let sessionEnding = false;

/**
 * Déconnexion + retour au login. Plusieurs écrans lancent leurs requêtes en même temps :
 * seule la première requête refusée déclenche la déconnexion, les autres sont ignorées.
 */
async function invalidateSessionAndGoToLogin(message: string): Promise<void> {
  if (sessionEnding) return;
  sessionEnding = true;
  try {
    const { useAuthStore } = await import('../stores/authStore');
    await useAuthStore.getState().logout(message);
    router.replace('/(auth)/login' as never);
  } finally {
    sessionEnding = false;
  }
}

/** Erreur d'une requête annulée parce que la session est terminée : inutile de l'afficher. */
export function isSessionEndedError(error: unknown): boolean {
  return error instanceof CanceledError && error.message === SESSION_ENDED;
}
const SESSION_ENDED = 'SESSION_ENDED';

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
      // Jeton expiré (date `exp` du JWT) : on ne l'envoie pas, le serveur le refuserait.
      if (isJwtExpired(token)) {
        await invalidateSessionAndGoToLogin(SESSION_EXPIRED_MESSAGE);
        throw new CanceledError(SESSION_ENDED);
      }
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
      if (__DEV__) {
        console.warn('[api] session refusée', status, url, error.response?.data);
      }
      await invalidateSessionAndGoToLogin(
        isAccountDisabled(error.response?.data) ? ACCOUNT_DISABLED_MESSAGE : SESSION_EXPIRED_MESSAGE
      );
    }
    return Promise.reject(error);
  }
);

export default api;
