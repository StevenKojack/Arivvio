import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('./') && !/\.(ts|mjs)$/.test(specifier)) return next(`${specifier}.ts`, context);
  return next(specifier, context);
} });
const { getInitialStages, inferStageDetails } = await import('./stages.ts');
const { saveDemoPlannerSession, loadDemoPlannerSession } = await import('./demo-session.ts');
const recognition = (type, text) => ({ identity: { canonicalEventType: type }, normalizedQuery: text.toLowerCase() });

test('one wedding retains separate ceremony and reception times and places', () => {
  const query = 'I’m planning a wedding with a church ceremony at 3 PM and a reception at a banquet hall at 5 PM.';
  const parts = getInitialStages(recognition('wedding', query), query);
  assert.equal(parts.length, 2);
  assert.deepEqual(parts.map(({ id, startTime, location }) => ({ id, startTime, location })), [
    { id: 'ceremony', startTime: '15:00', location: 'church' },
    { id: 'reception', startTime: '17:00', location: 'banquet hall' },
  ]);
});
test('simple birthday does not acquire event parts', () => {
  const query = 'Birthday at my house from 5 to 9 for 30 people.';
  assert.deepEqual(getInitialStages(recognition('birthday', query), query), []);
});
test('part timing is reusable beyond weddings and preserves minutes and noon', () => {
  const parts = inferStageDetails([{ id: 'conference', label: 'Conference', order: 1 }, { id: 'dinner', label: 'Dinner', order: 2 }], 'Conference at 12 PM and dinner at 6:30 PM at a restaurant');
  assert.equal(parts[0].startTime, '12:00');
  assert.equal(parts[0].location, undefined);
  assert.equal(parts[1].startTime, '18:30');
  assert.equal(parts[1].location, 'restaurant');
});
test('saved planner keeps overall budget and distinct allocations, notes and service associations', () => {
  const store = new Map();
  globalThis.window = { localStorage: { getItem: (key) => store.get(key), setItem: (key, value) => store.set(key, value) } };
  try {
    const state = { query: 'Wedding', budget: 40000, guestCount: 180, stages: [
      { id: 'ceremony', label: 'Ceremony', order: 1, guestCount: 150, date: '2026-12-12', startTime: '15:00', location: 'Church', services: ['Photographer'], notes: 'Quiet arrival' },
      { id: 'reception', label: 'Reception', order: 2, guestCount: 180, startTime: '17:00', location: 'Banquet hall', budget: 25000 },
    ] };
    saveDemoPlannerSession(state);
    assert.deepEqual(loadDemoPlannerSession(), state);
    saveDemoPlannerSession({ ...state, stages: [] });
    assert.deepEqual(loadDemoPlannerSession().stages, []);
  } finally { delete globalThis.window; }
});
