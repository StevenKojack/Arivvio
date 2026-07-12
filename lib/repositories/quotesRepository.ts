import type { PublicTableRow } from "@/lib/supabase/database.types";
import type { QuoteStatus } from "@/lib/types/domain";
import type { ArivvioSupabaseClient } from "./types";

export type QuoteRequestCreateInput = {
  endTime?: string | null;
  estimatedPrice?: number | null;
  eventId: string;
  guestCount?: number | null;
  message?: string | null;
  plannerId: string;
  serviceId?: string | null;
  startTime?: string | null;
  vendorId?: string | null;
  venueId?: string | null;
};

export async function createQuoteRequest(
  supabase: ArivvioSupabaseClient,
  input: QuoteRequestCreateInput,
) {
  const { data, error } = await supabase
    .from("quote_requests")
    .insert({
      estimated_price: input.estimatedPrice ?? null,
      event_id: input.eventId,
      guest_count: input.guestCount ?? null,
      message: input.message ?? null,
      planner_id: input.plannerId,
      requested_end_time: input.endTime ?? null,
      requested_start_time: input.startTime ?? null,
      service_id: input.serviceId ?? null,
      status: "pending",
      vendor_final_price: null,
      vendor_id: input.vendorId ?? null,
      venue_id: input.venueId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createQuoteRequests(
  supabase: ArivvioSupabaseClient,
  records: QuoteRequestCreateInput[],
) {
  if (!records.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("quote_requests")
    .insert(
      records.map((record) => ({
        estimated_price: record.estimatedPrice ?? null,
        event_id: record.eventId,
        guest_count: record.guestCount ?? null,
        message: record.message ?? null,
        planner_id: record.plannerId,
        requested_end_time: record.endTime ?? null,
        requested_start_time: record.startTime ?? null,
        service_id: record.serviceId ?? null,
        status: "pending" as const,
        vendor_final_price: null,
        vendor_id: record.vendorId ?? null,
        venue_id: record.venueId ?? null,
      })),
    )
    .select("*");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getQuoteRequestsForEvents(
  supabase: ArivvioSupabaseClient,
  eventIds: string[],
) {
  if (!eventIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("quote_requests")
    .select("*")
    .in("event_id", eventIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getQuoteRequestsForVendors(
  supabase: ArivvioSupabaseClient,
  vendorIds: string[],
) {
  if (!vendorIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("quote_requests")
    .select("*")
    .in("vendor_id", vendorIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function updateQuoteRequestResponse(
  supabase: ArivvioSupabaseClient,
  input: {
    quoteId: string;
    status: Extract<QuoteStatus, "accepted" | "declined" | "countered">;
    vendorFinalPrice?: number | null;
  },
) {
  const { data, error } = await supabase
    .from("quote_requests")
    .update({
      status: input.status,
      vendor_final_price: input.vendorFinalPrice ?? null,
    })
    .eq("id", input.quoteId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateQuoteStatus(
  supabase: ArivvioSupabaseClient,
  quoteId: string,
  status: Extract<QuoteStatus, "accepted" | "declined" | "countered" | "cancelled">,
) {
  const { data, error } = await supabase
    .from("quote_requests")
    .update({ status })
    .eq("id", quoteId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export type QuoteRequestRow = PublicTableRow<"quote_requests">;
