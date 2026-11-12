import type { RequestInboxItem } from '../repositories/messagesRepository';

export type PreparationTask = { title: string; done: boolean };

export type OperationFields = {
  proposed_amount: number | null;
  draft_notes: string;
  private_notes: string;
  tasks: PreparationTask[];
};

export type VendorOperation = OperationFields & {
  id: string;
  vendor_id: string;
  request_id: string | null;
  booking_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export const emptyOperation: OperationFields = {
  proposed_amount: null, draft_notes: '', private_notes: '', tasks: [],
};

export function submittedQuote(row: RequestInboxItem) {
  return row.quote.vendor_final_price ?? (row.quote.status === 'accepted' ? row.quote.estimated_price : null);
}

export function requestSchedule(row: RequestInboxItem) {
  const { date, start_time, end_time } = row.context;
  return date && start_time && end_time && end_time > start_time ? { date, start_time, end_time } : null;
}
