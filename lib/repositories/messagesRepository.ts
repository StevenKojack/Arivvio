import type { ArivvioSupabaseClient } from "./types";
import type { QuoteRequestRow } from "./quotesRepository";
import type { BookingRow } from "./bookingsRepository";
import type { PublicTableRow } from "../supabase/database.types";
import { validateMessage } from "../requests/lifecycle";
export type RequestContext = {
  title: string;
  event_type: string;
  date: string | null;
  date_hint: string | null;
  city: string | null;
  guest_count: number | null;
  start_time: string | null;
  end_time: string | null;
  stages: {
    label: string;
    start_time: string | null;
    end_time: string | null;
  }[];
};
export type RequestInboxItem = {
  quote: QuoteRequestRow;
  context: RequestContext;
  provider_name: string;
  service_name: string;
  booking_id: string | null;
  booking: BookingRow | null;
  needs_reply: boolean;
  last_activity: string;
};
export type QuoteThread = {
  quote: QuoteRequestRow;
  context: RequestContext;
  provider_name: string;
  service_name: string;
  booking: BookingRow | null;
  viewer_role: "customer" | "vendor";
  viewer_id: string;
  read_only: boolean;
  schedule_conflicts: number;
  messages: PublicTableRow<"messages">[];
};
export async function getQuoteThread(
  client: ArivvioSupabaseClient,
  request: string,
) {
  const { data, error } = await client.rpc("get_quote_thread", { request });
  if (error) throw new Error(error.message);
  return data as unknown as QuoteThread;
}
export async function getRequestInbox(
  client: ArivvioSupabaseClient,
  audience: "customer" | "vendor",
) {
  const { data, error } = await client.rpc("get_request_inbox", { audience });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RequestInboxItem[];
}
export async function sendQuoteMessage(
  client: ArivvioSupabaseClient,
  request: string,
  body: string,
) {
  const { data, error } = await client.rpc("send_quote_message", {
    request,
    message_body: validateMessage(body),
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getRequestServiceName(
  client: ArivvioSupabaseClient,
  serviceId: string | null,
  venueId: string | null,
) {
  if (!serviceId) return venueId ? "Venue" : "Event service";
  const { data, error } = await client
    .from("vendor_services")
    .select("service_name")
    .eq("id", serviceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.service_name ?? "Event service";
}
