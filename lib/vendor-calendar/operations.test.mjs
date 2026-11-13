import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    return next(specifier === './model' ? './model.ts' : specifier, context);
  },
});
const { scheduleReviews, upcomingWork, unfinishedCount } = await import('./operations.ts');

const event = (id, extra = {}) => ({
  id, name: id, source: 'External Event', status: 'Confirmed', timezone: 'America/Los_Angeles',
  date: '2026-11-05', end_date: '2026-11-05', start_time: '16:00', end_time: '18:00', ...extra,
});

test('reviews distinguish known overlap, holds, provisional bookings, and incomplete bookings without duplicates', () => {
  const main = event('main');
  const other = event('other', { timezone: 'America/New_York', start_time: '19:00', end_time: '20:00' });
  const held = event('held', { status: 'Hold' });
  const booking = event('booking', { source: 'ARIVVIO', timezone: null });
  const incomplete = event('missing time', { source: 'ARIVVIO', start_time: null, end_time: null });
  const cancelled = event('cancelled', { status: 'Cancelled' });
  const adjacent = event('adjacent', { start_time: '18:00', end_time: '19:00' });
  const result = scheduleReviews(main, [main, other, held, booking, booking, incomplete, cancelled, adjacent], []);
  assert.deepEqual(result.filter(review => review.event).map(review => [review.kind, review.event.id]), [
    ['overlap', 'other'], ['tentative', 'held'], ['tentative', 'booking'], ['incomplete', 'missing time'],
  ]);
  assert.match(result.find(review => review.event?.id === "booking").message, /Confirm the booking or event timezone/);
  assert.deepEqual(scheduleReviews(cancelled, [main], []), []);
  assert.deepEqual(scheduleReviews(incomplete, [main], []).map(review => review.kind), ['incomplete']);
});

test('overnight windows classify blocked and tentative availability without counting adjacent windows', () => {
  const main = event('overnight', { start_time: '23:00', end_time: '02:00', end_date: '2026-11-06' });
  const windows = [
    { id: 'blocked', status: 'blocked', date: '2026-11-05', start_time: '22:00', end_time: '00:30' },
    { id: 'tentative', status: 'tentative', date: '2026-11-06', start_time: '01:00', end_time: '02:30' },
    { id: 'adjacent', status: 'blocked', date: '2026-11-06', start_time: '02:00', end_time: '03:00' },
    { id: 'available', status: 'available', date: '2026-11-06', start_time: '01:00', end_time: '02:30' },
  ];
  assert.deepEqual(scheduleReviews(main, [], windows).filter(review => review.key.startsWith("exception:")).map(review => [review.kind, review.availability]), [
    ['blocked', true], ['tentative', true],
  ]);
});

test('upcoming preparation includes overnight events and excludes past, completed and cancelled work', () => {
  const active = event('active', { end_date: '2026-11-06', manual: { tasks: [{ done: true }, { done: false }] } });
  const undated = event('undated booking', { date: null, source: 'ARIVVIO' });
  const entries = [active, undated, event('past'), event('cancelled', { status: 'Cancelled' }), event('completed', { status: 'Completed' })];
  assert.deepEqual(upcomingWork(entries, () => '2026-11-06').map(entry => entry.id), ['active', 'undated booking']);
  assert.equal(unfinishedCount(active), 1);
  assert.equal(unfinishedCount(undated), 0);
});

const configured = (weeklyHours = [], serviceRules = []) => ({
  timezone: 'America/Los_Angeles', weeklyHours, serviceRules,
});
const service = { service_id: 'dj', capacity: 3, setup_minutes: 0, breakdown_minutes: 0 };

test('weekly hours handle split and overnight shifts, closed days, and explicit exceptions', () => {
  const target = event('Friday', { date: '2026-11-06', end_date: '2026-11-07', start_time: '23:00', end_time: '02:00', service_id: 'dj' });
  const settings = configured([
    { day: 5, start: '09:00', end: '12:00' },
    { day: 5, start: '22:00', end: '02:00' },
  ], [service]);
  assert.ok(scheduleReviews(target, [], [], settings).some(r => r.kind === 'within'));
  const midday = { ...target, start_time: '13:00', end_time: '14:00', end_date: target.date };
  assert.ok(scheduleReviews(midday, [], [], settings).some(r => r.kind === 'hours'));
  const extra = { id: 'extra', date: target.date, status: 'available', start_time: '12:30', end_time: '14:30' };
  const block = { ...extra, id: 'block', status: 'blocked', start_time: '13:15', end_time: '13:30' };
  assert.deepEqual(scheduleReviews(midday, [], [extra, block], settings).map(r => r.kind), ['blocked', 'within']);
  assert.deepEqual(scheduleReviews(midday, [], [block], configured(null, [service])).map(r => r.kind), ['incomplete', 'blocked']);
});

test('capacity counts peak confirmed same-service commitments once and excludes cancelled and holds', () => {
  const target = event('new', { service_id: 'dj' });
  const booking = event('booked', { service_id: 'dj', source: 'ARIVVIO' });
  const first = event('external', { service_id: 'dj' });
  const third = event('third', { service_id: 'dj' });
  const entries = [booking, booking, first, event('cancelled', { service_id: 'dj', status: 'Cancelled' }),
    event('held', { service_id: 'dj', status: 'Hold' }), event('unrelated', { service_id: 'photo' })];
  const settings = configured(null, [service]);
  assert.equal(scheduleReviews(target, entries, [], settings).some(r => r.kind === 'capacity'), false);
  const results = scheduleReviews(target, [...entries, third], [], settings);
  assert.equal(results.filter(r => r.event?.id === 'booked').length, 1);
  assert.ok(results.some(r => r.kind === 'capacity'));
  assert.ok(results.some(r => r.kind === 'tentative'));
  assert.ok(scheduleReviews(target, entries, [], configured()).some(r => r.key === 'missing-capacity'));
});

test('buffers cross dates and timezones without altering event times or counting touching endpoints', () => {
  const target = event('early', { service_id: 'dj', start_time: '00:30', end_time: '01:30' });
  const earlier = event('earlier', { service_id: 'photo', timezone: 'America/New_York', start_time: '00:00', end_time: '02:00' });
  const settings = configured(null, [{ ...service, setup_minutes: 60, breakdown_minutes: 45 },
    { ...service, service_id: 'photo', breakdown_minutes: 45 }]);
  assert.ok(scheduleReviews(target, [earlier], [], settings).some(r => r.event?.id === 'earlier'));
  assert.equal(scheduleReviews(target, [{ ...earlier, end_time: '01:45' }], [], settings).some(r => r.kind === 'overlap'), false);
  assert.equal(target.start_time, '00:30');
  const late = event('late', { service_id: 'dj', start_time: '22:30', end_time: '23:30' });
  const block = { id: 'tomorrow', date: '2026-11-06', status: 'blocked', start_time: '00:00', end_time: '00:20' };
  assert.ok(scheduleReviews(late, [], [block], settings).some(r => r.kind === 'blocked'));
});

test('daylight-saving ambiguity and unknown zones produce review instead of certainty', () => {
  for (const [date, start_time] of [['2026-03-08','02:30'], ['2026-11-01','01:30']]) {
    const target = event('dst', { date, end_date: date, start_time, end_time: '04:00' });
    assert.ok(scheduleReviews(target, [], [], configured()).some(r => r.key === 'wall-time'));
  }
  const target = event('unknown', { timezone: null, service_id: 'dj' });
  const reviews = scheduleReviews(target, [], [], { ...configured([], [service]), timezone: null });
  assert.ok(reviews.some(r => r.key === 'business-zone'));
  assert.equal(reviews.some(r => ['within','capacity'].includes(r.kind)), false);
});
