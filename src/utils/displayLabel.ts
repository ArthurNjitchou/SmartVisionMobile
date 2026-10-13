/**
 * Affiche une valeur API dans un <Text> : string/number ou entité { id, name, description }.
 */
export function displayLabel(value: unknown, fallback = 'Non definie'): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') {
    const t = value.trim();
    return t || fallback;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o.name === 'string' && o.name.trim()) return o.name.trim();
    if (typeof o.description === 'string' && o.description.trim()) return o.description.trim();
  }
  return fallback;
}
