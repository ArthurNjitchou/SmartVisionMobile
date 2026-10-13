import { isAxiosError } from 'axios';

/**
 * Extrait un message texte depuis le corps JSON du backend (`message`, `error`, chaîne brute).
 */
export function backendText(data: unknown): string | undefined {
  if (data == null) return undefined;
  if (typeof data === 'string') {
    const t = data.trim();
    return t || undefined;
  }
  if (typeof data !== 'object') return undefined;
  const o = data as Record<string, unknown>;
  const direct = o.message ?? o.error;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  if (typeof o.error === 'object' && o.error !== null) {
    const nested = (o.error as { message?: unknown }).message;
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
  }
  return undefined;
}

/** Messages backend (ex. anglais) → français pour l’UI, si le texte correspond exactement. */
const BACKEND_TO_FR: Record<string, string> = {
  'Email or password incorrect.': 'Email ou mot de passe incorrect.',
  'Email or password required.': 'Email et mot de passe requis.',
  'Server Error':
    'Erreur serveur. Réessayez plus tard ou contactez l’agence.',
};

function localizeBackendMessage(msg: string): string {
  return BACKEND_TO_FR[msg] ?? msg;
}

/**
 * Messages explicites pour l’écran login : privilégie le texte du backend, réseau, serveur.
 */
export function getLoginErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return 'Une erreur inattendue est survenue.';
  }

  const status = error.response?.status;
  const raw = backendText(error.response?.data);
  const fromApi = raw ? localizeBackendMessage(raw) : undefined;

  if (status === 401 || status === 403) {
    return fromApi ?? 'Email ou mot de passe incorrect.';
  }

  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      return 'Délai dépassé. Vérifiez votre connexion réseau.';
    }
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return 'Impossible de joindre le serveur. Vérifiez votre connexion internet.';
    }
    return 'Problème de connexion au serveur.';
  }

  if (status !== undefined && status >= 500) {
    return (
      fromApi ??
      'Le serveur est temporairement indisponible. Réessayez plus tard ou contactez l’agence.'
    );
  }

  if (status !== undefined && status >= 400) {
    return fromApi ?? 'La connexion a échoué.';
  }

  return fromApi ?? 'Une erreur est survenue.';
}
