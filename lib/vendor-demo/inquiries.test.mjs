import test from 'node:test';
import assert from 'node:assert/strict';
import { inquiryEvent } from './inquiries.ts';
import { seedHub, scheduleWarnings } from './model.ts';

test('inquiries create stable tentative calendar events with linked stages and normal capacity checks', () => {
  const request = { id: 'request', event: { name: 'Wedding', date: '2026-10-24', startTime: '15:00', endTime: '23:00', guestCount: 180, budget: 40000, location: 'Reception hall', requirements: 'Microphone', profile: { stages: [{ id: 'ceremony', label: 'Ceremony' }, { id: 'reception', label: 'Reception', startTime: '17:00', location: 'Hall' }] } }, message: 'Setup included?' };
  const opportunity = { id: 'request:49', startTime: '17:00', endTime: '22:00', service: 'DJ', stageIds: ['reception'] };
  const event = inquiryEvent(request, opportunity);
  assert.equal(event.id, inquiryEvent(request, opportunity).id);
  assert.equal(event.requestId, request.id);
  assert.equal(event.status, 'Tentative');
  assert.equal(event.source, 'ARIVVIO');
  assert.match(event.notes, /Reception/);
  assert.doesNotMatch(event.notes, /Ceremony/);
  const hub = seedHub({ name: 'Demo' });
  hub.events = [{ ...event, id: 'external', source: 'MANUAL' }];
  assert.ok(scheduleWarnings(hub, event).some(warning => warning.includes('overlaps')));
  hub.events = [event];
  assert.ok(!scheduleWarnings(hub, event).some(warning => warning.includes('overlaps')));
});
