import type { RequestInboxItem } from '../repositories/messagesRepository';

export const requestStages = [
  'New inquiries', 'Needs attention', 'Awaiting customer decision', 'Recorded bookings', 'Closed',
] as const;

export function vendorRequestStage(row: RequestInboxItem): typeof requestStages[number] {
  const { status } = row.quote;
  if (['declined', 'cancelled', 'expired'].includes(status) || row.booking?.booking_status === 'cancelled') return 'Closed';
  if (row.booking_id) return 'Recorded bookings';
  if (status === 'pending') return 'New inquiries';
  if (row.needs_reply) return 'Needs attention';
  return 'Awaiting customer decision';
}

export function vendorRequestLabel(row: RequestInboxItem) {
  const { status, quote_revision } = row.quote;
  if (['declined', 'cancelled', 'expired'].includes(status)) return status === 'cancelled' ? 'Withdrawn' : status;
  if (row.booking_id) return row.booking?.booking_status === 'cancelled' ? 'Booking cancelled' : 'Booking recorded';
  if (status === 'accepted') return 'Accepted · booking not recorded';
  if (status === 'sent' || status === 'countered') return quote_revision > 1 || status === 'countered' ? 'Revised quote' : 'Quote sent';
  return 'Pending inquiry';
}

export function vendorRequestsForBranch(rows: RequestInboxItem[], vendorId: string) {
  return rows.filter(row => row.quote.vendor_id === vendorId || (row.quote.vendor_id === null && row.booking?.vendor_id === vendorId));
}
