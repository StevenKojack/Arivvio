import test from 'node:test';
import assert from 'node:assert/strict';
import { vendorRequestStage, vendorRequestLabel, vendorRequestsForBranch } from './vendor-workspace.ts';

const inquiry = (status, extras = {}) => ({
  quote: { status, vendor_id: 'branch-a', quote_revision: 0 },
  needs_reply: false, booking_id: null, booking: null, ...extras,
});

test('pending, vendor attention, waiting, and terminal stages follow saved request data', () => {
  assert.equal(vendorRequestStage(inquiry('pending', { needs_reply: true })), 'New inquiries');
  assert.equal(vendorRequestStage(inquiry('sent', { needs_reply: true })), 'Needs attention');
  assert.equal(vendorRequestStage(inquiry('sent')), 'Awaiting customer decision');
  assert.equal(vendorRequestStage(inquiry('declined', { needs_reply: true })), 'Closed');
  assert.equal(vendorRequestLabel(inquiry('cancelled')), 'Withdrawn');
});

test('a revised quote keeps its stage and acceptance without a booking is not booked', () => {
  const revised = inquiry('sent');
  revised.quote.quote_revision = 2;
  assert.equal(vendorRequestLabel(revised), 'Revised quote');
  assert.equal(vendorRequestStage(revised), 'Awaiting customer decision');
  assert.equal(vendorRequestLabel(inquiry('accepted')), 'Accepted · booking not recorded');
  assert.notEqual(vendorRequestStage(inquiry('accepted')), 'Recorded bookings');
});

test('a recorded booking retains its identity and cancelled bookings are closed', () => {
  const recorded = inquiry('accepted', {
    booking_id: 'booking-a', booking: { id: 'booking-a', vendor_id: 'branch-a', booking_status: 'confirmed' },
  });
  assert.equal(vendorRequestStage(recorded), 'Recorded bookings');
  assert.equal(vendorRequestLabel(recorded), 'Booking recorded');
  const other = inquiry('pending', { quote: { status: 'pending', vendor_id: 'branch-b' } });
  assert.deepEqual(vendorRequestsForBranch([recorded, other], 'branch-a'), [recorded]);
  assert.equal(recorded.booking_id, 'booking-a');
  recorded.booking.booking_status = 'cancelled';
  assert.equal(vendorRequestStage(recorded), 'Closed');
});
