/** Lundi de la semaine calendaire (lundi = début), heure locale minuit. */
export function getMondayOfDate(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function toISODateString(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function weekStartISO(mondayLocal: Date): string {
  const d = new Date(mondayLocal);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Jours du lundi au dimanche inclus dans la semaine, jusqu’à aujourd’hui inclus. */
export function buildValidWeekDates(monday: Date, today = new Date()): { iso: string; display: string }[] {
  const out: { iso: string; display: string }[] = [];
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  end.setHours(23, 59, 59, 999);

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    day.setHours(12, 0, 0, 0);
    if (day <= end) {
      const iso = toISODateString(day);
      const display = day.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      out.push({ iso, display });
    }
  }
  return out;
}

export function generateDurationOptions(): string[] {
  const opts: string[] = [];
  for (let h = 1; h <= 4; h++) {
    opts.push(`${h}h00`);
    if (h < 4) opts.push(`${h}h30`);
  }
  return opts;
}

export function durationStringToMinutes(duration: string): number {
  const parts = duration.split('h').map((p) => Number(p) || 0);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  return hours * 60 + minutes;
}

export function minutesToDurationString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m < 10 ? '0' : ''}${m}`;
}

export function parseBackendDateToISODate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    return toISODateString(d);
  } catch {
    return iso.slice(0, 10);
  }
}
