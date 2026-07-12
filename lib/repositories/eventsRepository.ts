import type { PublicTableRow } from "@/lib/supabase/database.types";
import type { EventStatus } from "@/lib/types/domain";
import type { ArivvioSupabaseClient } from "./types";

export type EventCreateInput = {
  address?: string | null;
  budgetMax?: number | null;
  budgetMin?: number | null;
  city?: string | null;
  date?: string | null;
  endTime?: string | null;
  eventType: string;
  guestCount?: number | null;
  plannerId: string;
  startTime?: string | null;
  status?: EventStatus;
  title: string;
  venueNeeded: boolean;
};

export type EventWorkspace = {
  cartItems: PublicTableRow<"cart_items">[];
  event: PublicTableRow<"events">;
  quotes: PublicTableRow<"quote_requests">[];
  bookings: PublicTableRow<"bookings">[];
};

export async function createEvent(
  supabase: ArivvioSupabaseClient,
  input: EventCreateInput,
) {
  const { data, error } = await supabase
    .from("events")
    .insert({
      address: input.address ?? null,
      budget_max: input.budgetMax ?? null,
      budget_min: input.budgetMin ?? null,
      city: input.city ?? null,
      date: input.date ?? null,
      end_time: input.endTime ?? null,
      event_type: input.eventType,
      guest_count: input.guestCount ?? null,
      planner_id: input.plannerId,
      start_time: input.startTime ?? null,
      status: input.status ?? "planning",
      title: input.title,
      venue_needed: input.venueNeeded,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getEventById(
  supabase: ArivvioSupabaseClient,
  eventId: string,
) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPlannerEvents(
  supabase: ArivvioSupabaseClient,
  plannerId: string,
) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("planner_id", plannerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getEventsByIds(
  supabase: ArivvioSupabaseClient,
  eventIds: string[],
) {
  if (!eventIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .in("id", eventIds);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getEventWorkspace(
  supabase: ArivvioSupabaseClient,
  eventId: string,
): Promise<EventWorkspace> {
  const [event, cartItems, quotes, bookings] = await Promise.all([
    getEventById(supabase, eventId),
    getCartItemsForEvent(supabase, eventId),
    getQuoteRequestsForEvent(supabase, eventId),
    getBookingsForEvent(supabase, eventId),
  ]);

  return { bookings, cartItems, event, quotes };
}

async function getCartItemsForEvent(
  supabase: ArivvioSupabaseClient,
  eventId: string,
) {
  const { data, error } = await supabase
    .from("cart_items")
    .select("*")
    .eq("event_id", eventId);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function getQuoteRequestsForEvent(
  supabase: ArivvioSupabaseClient,
  eventId: string,
) {
  const { data, error } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("event_id", eventId);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function getBookingsForEvent(
  supabase: ArivvioSupabaseClient,
  eventId: string,
) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}
