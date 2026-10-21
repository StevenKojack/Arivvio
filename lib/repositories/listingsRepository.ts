import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
export type ListingRecord = {
  id: string;
  business_name: string;
  category: string;
  description: string | null;
  service_area_city: string | null;
  base_address: string | null;
  website_url: string | null;
  phone: string | null;
  email: string | null;
  owner_id: string | null;
  approval_status: string;
  claimed_at?: string | null;
};
export type ClaimRecord = {
  id: string;
  vendor_id: string;
  status: string;
  relationship: string;
  business_email: string | null;
  business_phone: string | null;
  verification_note: string | null;
  claimant_email?: string;
  created_at: string;
};
export type LeadRecord = {
  id: string;
  vendor_id: string;
  event_id: string;
  status: string;
  customer_note: string | null;
  stage_label: string | null;
  requested_start_time: string | null;
  requested_end_time: string | null;
  quote_request_id: string | null;
  business_name: string;
  event_title: string;
  event_date?: string;
  event_city?: string;
  planner_email?: string;
  service_name?: string;
  created_at: string;
};
export type ListingWorkspace = {
  listings: ListingRecord[];
  services: { vendor_id: string; event_types_supported: string[] }[];
  tags: { vendor_id: string; tag: string }[];
  claims: ClaimRecord[];
  leads: LeadRecord[];
  sources: {
    id: string;
    vendor_id: string;
    source_url: string;
    supported_fields: string[];
    note: string;
  }[];
  notes: { id: string; lead_id: string; note: string; created_at: string }[];
};
export async function listingOperation<T>(
  operation: string,
  payload: Record<string, Json | undefined> = {},
): Promise<T> {
  const { data, error } = await createBrowserSupabaseClient().rpc(
    "listing_operation",
    { operation, payload },
  );
  if (error) throw new Error(error.message);
  return data as T;
}
export const leadLabel = (status: string) =>
  ({
    new: "ARIVVIO is reaching out",
    contacted: "Business contacted",
    interested: "Business interested",
    declined: "Business unavailable",
    unreachable: "Unable to reach business",
    converted: "Business joined ARIVVIO. You can now message them directly.",
    closed: "Request closed",
    withdrawn: "Request withdrawn",
  })[status] ?? "ARIVVIO is reviewing your request";
