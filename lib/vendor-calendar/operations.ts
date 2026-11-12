import { onDay, overlap, shiftDate, todayIn, type CalendarEntry } from './model';

export type AvailabilityWindow = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
};

export const reviewLabels = {
  overlap: 'Time overlap',
  tentative: 'Tentative concern',
  blocked: 'Blocked availability',
  incomplete: 'Schedule details needed',
} as const;

export type ScheduleReview = {
  key: string;
  kind: keyof typeof reviewLabels;
  message: string;
  event?: CalendarEntry;
  availability?: boolean;
};

export function entryKey(entry: CalendarEntry) {
  return entry.source + ':' + entry.id;
}

export function timeRange(entry: Pick<CalendarEntry, 'date' | 'end_date' | 'start_time' | 'end_time'>) {
  if (!entry.date) return 'Date needed';
  if (!entry.start_time || !entry.end_time) return entry.date + ' · Time needed';
  const endDate = entry.end_date && entry.end_date !== entry.date ? entry.end_date + ' ' : '';
  return entry.date + ' · ' + entry.start_time.slice(0, 5) + ' to ' + endDate + entry.end_time.slice(0, 5);
}

const inactive = (entry: CalendarEntry) => ['cancelled', 'completed'].includes(entry.status.toLowerCase());
const hasTimes = (entry: CalendarEntry) => !!(entry.date && entry.start_time && entry.end_time);

export function scheduleReviews(entry: CalendarEntry, entries: CalendarEntry[], availability: AvailabilityWindow[]): ScheduleReview[] {
  if (entry.status.toLowerCase() === 'cancelled') return [];
  const reviews: ScheduleReview[] = [];
  if (entry.source === 'ARIVVIO') {
    if (!hasTimes(entry)) return [{ key: 'missing-time', kind: 'incomplete', message: 'This booking needs a complete date and time before overlaps can be checked.' }];
    if (!entry.timezone) reviews.push({ key: 'missing-zone', kind: 'incomplete', message: 'The booking timezone is missing. Any time comparison is provisional.' });
  }
  if (!hasTimes(entry)) return reviews;

  const earliestDate = shiftDate(entry.date!, -2);
  const latestDate = shiftDate(entry.end_date ?? entry.date!, 2);
  const seen = new Set([entryKey(entry)]);
  for (const other of entries) {
    const key = entryKey(other);
    if (seen.has(key)) continue;
    seen.add(key);
    if (other.status.toLowerCase() === 'cancelled') continue;
    if (other.source === 'ARIVVIO' && !hasTimes(other)) {
      if (other.date && onDay(entry, other.date)) {
        reviews.push({ key, kind: 'incomplete', message: other.name + ' needs booking times for this date.', event: other });
      }
      continue;
    }
    if (!other.date || other.date > latestDate || (other.end_date ?? other.date) < earliestDate || !overlap(entry, other)) continue;
    const zoneMissing = !entry.timezone || !other.timezone;
    const tentative = zoneMissing || [entry, other].some(e => ['hold', 'tentative', 'pending'].includes(e.status.toLowerCase()));
    reviews.push({
      key, kind: tentative ? 'tentative' : 'overlap', event: other,
      message: other.name + ' · ' + timeRange(other) + (other.timezone ? ' · ' + other.timezone : '') +
        (zoneMissing ? '. Confirm the booking timezone before relying on this comparison.' : '. Review your team’s capacity.'),
    });
  }
  for (const window of availability) {
    if (window.status !== 'blocked' && window.status !== 'tentative') continue;
    if (window.date < earliestDate || window.date > latestDate) continue;
    const slot: CalendarEntry = {
      ...entry, ...window, timezone: null,
      end_date: window.end_time < window.start_time ? shiftDate(window.date, 1) : window.date,
    };
    if (window.start_time === window.end_time || !overlap(entry, slot)) continue;
    reviews.push({
      key: 'availability:' + window.id, kind: window.status === 'blocked' ? 'blocked' : 'tentative', availability: true,
      message: timeRange(slot) + ' · ' + window.status + ' in the business’s local availability. Confirm local times if your event uses a different timezone.',
    });
  }
  return reviews;
}

export function upcomingWork(entries: CalendarEntry[], today: (zone: string) => string = todayIn) {
  return entries.filter(entry => {
    if (inactive(entry)) return false;
    if (!entry.date) return true;
    const currentDate = today(entry.timezone ?? '');
    return entry.date >= currentDate || onDay(entry, currentDate);
  });
}

export function unfinishedCount(entry: CalendarEntry) {
  return entry.manual?.tasks.filter(task => !task.done).length ?? 0;
}
