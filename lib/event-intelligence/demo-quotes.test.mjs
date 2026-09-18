import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDemoQuoteRequests, saveDemoQuoteRequest } from './demo-quotes.ts';

test('demo requests survive reload and retries do not duplicate provider opportunities', () => {
  const storage = new Map();
  globalThis.window = { localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) } };
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
