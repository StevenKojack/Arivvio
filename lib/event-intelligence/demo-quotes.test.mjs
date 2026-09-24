import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDemoQuoteRequests, saveDemoQuoteRequest } from './demo-quotes.ts';

test('demo requests survive reload and retries do not duplicate provider opportunities', () => {
  const storage = new Map();
  globalThis.window = { dispatchEvent: () => {}, localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) } };
  try {
    const request = { id: 'request-1', version: 1, source: 'ARIVVIO_DEMO', status: 'demo-created', event: { name: 'Wedding', profile: { stages: [{ id: 'ceremony', guestCount: 150 }, { id: 'reception', guestCount: 180 }] } }, opportunities: [{ id: 'request-1:vendor-a', stageIds: ['reception'], status: 'demo-not-sent' }], message: 'Please include setup' };
    saveDemoQuoteRequest(request);
    saveDemoQuoteRequest(request);
    assert.deepEqual(loadDemoQuoteRequests(), [request]);
    saveDemoQuoteRequest({ ...request, id: 'request-2' });
    assert.equal(loadDemoQuoteRequests().length, 2);
    assert.equal(loadDemoQuoteRequests()[0].id, 'request-2');
    storage.set('arivvio:demo-quote-requests:v1', 'broken');
    assert.deepEqual(loadDemoQuoteRequests(), []);
  } finally { delete globalThis.window; }
});

test('vendor responses remain scoped to their provider and preserve connected event data', async () => {
  const { respondToDemoOpportunity, updateDemoOpportunity, opportunityStatus } = await import('./demo-quotes.ts');
  const storage = new Map();
  globalThis.window = { dispatchEvent: () => {}, localStorage: { getItem: key => storage.get(key), setItem: (key,value) => storage.set(key,value) } };
  try {
    const request = { id: 'flow', version: 1, source: 'ARIVVIO_DEMO', event: { name: 'Wedding', profile: { stages: [{ id: 'reception', guestCount: 180, budget: 5000 }] } }, opportunities: [{ id: 'dj', providerId: '49', status: 'demo-not-sent', stageIds: ['reception'] }, { id: 'venue', providerId: '1', status: 'demo-not-sent', stageIds: [] }] };
    saveDemoQuoteRequest(request);
    const response = { status: 'quoted', price: 1200, note: 'Sound included', at: '2026-09-21T12:00:00Z' };
    assert.throws(() => respondToDemoOpportunity('flow', 'venue', '49', response));
    assert.throws(() => respondToDemoOpportunity('flow', 'dj', '49', { ...response, price: -1 }));
    respondToDemoOpportunity('flow', 'dj', '49', response);
    let saved = loadDemoQuoteRequests()[0];
    assert.deepEqual(saved.event, request.event);
    assert.deepEqual(saved.opportunities[1], request.opportunities[1]);
    assert.equal(opportunityStatus(saved.opportunities[0]), 'Demo quote ready');
    updateDemoOpportunity('flow', 'dj', item => ({ ...item, reviewedAt: 'today' }));
    assert.equal(opportunityStatus(loadDemoQuoteRequests()[0].opportunities[0]), 'Demo quote reviewed');
    respondToDemoOpportunity('flow', 'dj', '49', { ...response, price: 1300 });
    saved = loadDemoQuoteRequests()[0];
    assert.equal(saved.opportunities[0].reviewedAt, undefined);
    assert.equal(saved.opportunities[0].status, 'demo-not-sent');
    assert.equal(loadDemoQuoteRequests().length, 1);
  } finally { delete globalThis.window; }
});
