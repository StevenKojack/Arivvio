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
  assert.deepEqual(result.map(review => [review.kind, review.event.id]), [
    ['overlap', 'other'], ['tentative', 'held'], ['tentative', 'booking'], ['incomplete', 'missing time'],
  ]);
  assert.match(result[2].message, /Confirm the booking timezone/);
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
  assert.deepEqual(scheduleReviews(main, [], windows).map(review => [review.kind, review.availability]), [
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
