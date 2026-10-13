/**
 * Convertit des secondes en format lisible (heures/minutes)
 */
export function convertSecondsToDuration(seconds: number): string {
  if (!seconds) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours > 0 ? `${hours}h` : ''}${minutes > 0 ? `${minutes}m` : '0m'}`;
}

/**
 * Convertit des minutes en format lisible (heures/minutes)
 */
export function convertMinutesToDuration(minutes: number): string {
  if (!minutes || minutes < 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  let out = '';
  if (hours > 0) out += `${hours}h`;
  if (remainingMinutes > 0) out += `${remainingMinutes}m`;
  return out || '0m';
}

/**
 * Convertit des jours en format lisible
 */
export function convertDaysToDuration(days: number): string {
  if (!days || days < 0) return '0 jour';
  return days === 1 ? '1 jour' : `${days} jours`;
}
