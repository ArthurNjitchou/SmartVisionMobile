import { getBaseURL } from '../constants/config';

/** Complète une URL média si le backend renvoie un chemin relatif */
export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path || typeof path !== 'string') return undefined;
  const trimmed = path.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const base = getBaseURL().replace(/\/$/, '');
  const rel = trimmed.replace(/^\//, '');
  return `${base}/${rel}`;
}
