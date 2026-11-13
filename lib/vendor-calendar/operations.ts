import { onDay, shiftDate, todayIn, wallTime, type CalendarEntry } from './model';

export type AvailabilityWindow = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
};

export const reviewLabels = {
  overlap: 'Potential overlap',
  hours: 'Outside working hours',
  capacity: 'Configured capacity reached',
  within: 'Within configured hours',
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

export type WeeklyInterval = { day: number; start: string; end: string };
export type SchedulingSettings = {
  timezone: string | null;
  weeklyHours: WeeklyInterval[] | null;
  serviceRules: { service_id: string; capacity: number | null; setup_minutes: number; breakdown_minutes: number }[];
};

export const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function hoursOnDate(hours: WeeklyInterval[], date: string) {
  return hours.filter(slot => slot.day === new Date(date + 'T12:00:00Z').getUTCDay());
}

export function exceptionEndDate(window: AvailabilityWindow) {
  return window.end_time.slice(0, 5) < window.start_time.slice(0, 5) ? shiftDate(window.date, 1) : window.date;
}

export function exceptionLabel(window: AvailabilityWindow) {
  const endDate = exceptionEndDate(window);
  return window.status + ' · ' + window.start_time.slice(0, 5) + ' to ' +
    (endDate !== window.date ? 'next day ' : '') + window.end_time.slice(0, 5);
}

type Interval = [number, number];
const intersects = (a: Interval, b: Interval) => a[0] < b[1] && b[0] < a[1];
const confirmed = (entry: CalendarEntry) => entry.status.toLowerCase() === 'confirmed';

function interval(date: string, start: string, endDate: string, end: string, zone: string): Interval | null {
  const a = wallTime(date, start, zone);
  const b = wallTime(endDate, end, zone);
  return Number.isFinite(a) && Number.isFinite(b) && a < b ? [a, b] : null;
}

function covered(target: Interval, slots: Interval[]) {
  let cursor = target[0];
  for (const [start, end] of slots.sort((a, b) => a[0] - b[0])) {
    if (start > cursor) break;
    cursor = Math.max(cursor, end);
    if (cursor >= target[1]) return true;
  }
  return false;
}

function peakOverlap(target: Interval, commitments: Interval[]) {
  const points = commitments.flatMap(([start, end]) => [
    { time: Math.max(start, target[0]), change: 1 },
    { time: Math.min(end, target[1]), change: -1 },
  ]).sort((a, b) => a.time - b.time || a.change - b.change);
  let count = 0;
  let peak = 0;
  for (const point of points) {
    count += point.change;
    peak = Math.max(peak, count);
  }
  return peak;
}

export function scheduleReviews(entry: CalendarEntry, entries: CalendarEntry[], availability: AvailabilityWindow[], settings: SchedulingSettings = { timezone: null, weeklyHours: null, serviceRules: [] }): ScheduleReview[] {
  if (inactive(entry)) return [];
  const reviews: ScheduleReview[] = [];
  const { timezone, weeklyHours, serviceRules } = settings;
  const ruleFor = (item: CalendarEntry) => serviceRules.find(rule => rule.service_id === (item.service_id ?? item.manual?.service_id));
  const service = entry.service_id ?? entry.manual?.service_id;
  const rule = ruleFor(entry);
  const notice = (key: string, kind: ScheduleReview['kind'], message: string, availability?: boolean) =>
    reviews.push({ key, kind, message, availability });

  if (!hasTimes(entry)) {
    notice('missing-time', 'incomplete', 'A complete date and time are needed to review scheduling.');
    return reviews;
  }
  if (!timezone) notice('business-zone', 'incomplete', 'Set the business timezone to review local hours, exceptions and capacity.', true);
  if (!entry.timezone) notice('missing-zone', 'incomplete', timezone
    ? 'Event timezone is unrecorded. Review uses the configured business timezone provisionally.'
    : 'Confirm the event timezone before relying on time comparisons.');
  if (!service) notice('missing-service', 'incomplete', 'Service association is missing. Capacity and buffers cannot be confirmed.');
  else if (!rule?.capacity) notice('missing-capacity', 'incomplete', 'Capacity not configured for this service.', true);
  if (weeklyHours === null) notice('missing-hours', 'incomplete', 'Hours not configured.', true);

  const zone = entry.timezone ?? timezone;
  if (!zone) return reviews;
  const rangeOf = (item: CalendarEntry, fallback: string): Interval | null => {
    if (!hasTimes(item)) return null;
    const value = interval(item.date!, item.start_time!, item.end_date ?? item.date!, item.end_time!, item.timezone ?? fallback);
    if (!value) return null;
    const buffers = ruleFor(item);
    return [value[0] - (buffers?.setup_minutes ?? 0) * 60000, value[1] + (buffers?.breakdown_minutes ?? 0) * 60000];
  };
  const target = rangeOf(entry, zone);
  if (!target) {
    notice('wall-time', 'incomplete', 'Review the event’s local times. A time may be ambiguous or nonexistent during a daylight-saving transition.');
    return reviews;
  }

  const earliest = shiftDate(entry.date!, -4);
  const latest = shiftDate(entry.end_date ?? entry.date!, 4);
  const seen = new Set([entryKey(entry)]);
  const hard: Interval[] = [];
  const provisional: Interval[] = [];
  for (const other of entries) {
    const key = entryKey(other);
    if (seen.has(key) || inactive(other)) continue;
    seen.add(key);
    if (other.date && (other.date > latest || (other.end_date ?? other.date) < earliest)) continue;
    const range = rangeOf(other, timezone ?? zone);
    const otherService = other.service_id ?? other.manual?.service_id;
    if (!range) {
      if (!otherService || !service || otherService === service) {
        reviews.push({ key, kind: 'incomplete', event: other, message: other.name + ' needs a reliable date, time or timezone.' });
      }
      continue;
    }
    if (!intersects(target, range)) continue;
    const certain = Boolean(entry.timezone && other.timezone && confirmed(other));
    const tentative = !confirmed(other) || !other.timezone || !entry.timezone;
    reviews.push({ key, kind: tentative ? 'tentative' : 'overlap', event: other,
      message: other.name + ' · ' + timeRange(other) + '. Operational overlap includes configured buffers.' +
        (!otherService ? ' Service association is unknown.' : '') +
        (!other.timezone || !entry.timezone ? ' Confirm the booking or event timezone. This comparison is provisional.' : '') });
    if (timezone && service && otherService === service && confirmed(other)) (certain ? hard : provisional).push(range);
  }
  if (rule?.capacity && timezone && peakOverlap(target, [...hard, ...provisional]) >= rule.capacity) {
    const tentative = peakOverlap(target, hard) < rule.capacity;
    notice('capacity', 'capacity', (tentative ? 'Using provisional timezones, ' : '') +
      'existing commitments reach the configured limit of ' + rule.capacity + ' during this operational interval.');
  }
  const exceptionZone = timezone ?? entry.timezone;
  if (!exceptionZone) return reviews;

  const open: Interval[] = [];
  let ambiguous = false;
  for (const window of availability) {
    if (window.date < earliest || window.date > latest || window.start_time === window.end_time) continue;
    const range = interval(window.date, window.start_time, exceptionEndDate(window), window.end_time, exceptionZone);
    if (!range) { ambiguous = true; continue; }
    if (!intersects(target, range)) continue;
    if (window.status === 'available') open.push(range);
    else if (window.status === 'blocked' || window.status === 'tentative') {
      notice('exception:' + window.id, window.status === 'blocked' ? 'blocked' : 'tentative',
        window.date + ' · ' + exceptionLabel(window) + ' · ' + exceptionZone +
        (!timezone ? '. Business timezone needs confirmation.' : ''), true);
    }
  }
  if (weeklyHours !== null && timezone) {
    const businessDate = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
    const from = businessDate(target[0]);
    const through = businessDate(target[1] - 1);
    for (let day = shiftDate(from, -1); day <= through; day = shiftDate(day, 1)) {
      for (const slot of hoursOnDate(weeklyHours, day)) {
        const endDate = slot.end < slot.start ? shiftDate(day, 1) : day;
        const range = interval(day, slot.start, endDate, slot.end, timezone);
        if (range && intersects(range, target)) open.push(range);
        if (!range) ambiguous = true;
      }
    }
    if (!ambiguous) {
      if (covered(target, open)) notice('working-hours', 'within',
        (entry.timezone ? '' : 'Using the business timezone provisionally, ') +
        'operating hours cover this interval. Review any other concerns before confirming availability.', true);
      else notice('working-hours', 'hours', 'Part or all of the operational interval is outside weekly hours and extra available windows.', true);
    }
  }
  if (ambiguous) notice('ambiguous-hours', 'incomplete', 'Review working hours or exceptions near this date for ambiguous daylight-saving times.', true);
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
