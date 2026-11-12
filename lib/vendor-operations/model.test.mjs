import test from 'node:test';
import assert from 'node:assert/strict';
import { submittedQuote, requestSchedule } from './model.ts';
import { vendorBookingLink, vendorCalendarLink, vendorRequestLink } from '../vendor-calendar/links.ts';

test('submitted quotes keep their recorded amount independently of the booking price', () => {
  assert.equal(submittedQuote({ quote: { status: 'accepted', vendor_final_price: 1200 }, booking: { final_price: 1500 } }), 1200);
  assert.equal(submittedQuote({ quote: { status: 'pending', vendor_final_price: null, estimated_price: 1500 } }), null);
  assert.equal(submittedQuote({ quote: { status: 'accepted', vendor_final_price: null, estimated_price: 1500 } }), 1500);
});

test('a scheduling review requires recorded dates and a complete same-day time range', () => {
  const context = { date: '2026-12-10', start_time: '16:00', end_time: '18:00' };
  assert.deepEqual(requestSchedule({ context }), context);
  assert.equal(requestSchedule({ context: { ...context, end_time: null } }), null);
  assert.equal(requestSchedule({ context: { ...context, end_time: '01:00' } }), null);
  assert.equal(requestSchedule({ context: { ...context, date: null } }), null);
});

test('booking, request and calendar links preserve branch and original source IDs', () => {
  const url = link => new URL(link, 'https://fixture.test').searchParams;
  assert.equal(url(vendorBookingLink('branch-a', 'booking-7')).get('booking'), 'booking-7');
  assert.equal(url(vendorCalendarLink('branch-a', { event: 'ARIVVIO:booking-7' })).get('event'), 'ARIVVIO:booking-7');
  assert.equal(url(vendorRequestLink('branch-a', 'quote-8')).get('request'), 'quote-8');
  assert.equal(url(vendorRequestLink('branch-a', 'quote-8')).get('business'), 'branch-a');
});
