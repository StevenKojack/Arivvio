import type { PublicTableRow } from "@/lib/supabase/database.types";
import type { ArivvioSupabaseClient } from "./types";

export type BookingCreateInput = {
  balanceDue: number;
  depositAmount: number;
  eventId: string;
  finalPrice: number;
  plannerId: string;
  quoteRequestId: string;
  serviceId?: string | null;
  vendorId?: string | null;
  venueId?: string | null;
};

export async function createBooking(
  supabase: ArivvioSupabaseClient,
  input: BookingCreateInput,
) {
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      balance_due: input.balanceDue,
      booking_status: "confirmed",
      booking_timeline: [
        {
          at: new Date().toISOString(),
          label: "Booking created from accepted quote",
        },
      ],
      deposit_amount: input.depositAmount,
      event_id: input.eventId,
      final_price: input.finalPrice,
      payment_status: "not_started",
      planner_notes: null,
      planner_id: input.plannerId,
      quote_request_id: input.quoteRequestId,
      service_id: input.serviceId ?? null,
      vendor_notes: null,
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

export async function getBookingsForPlannerEvents(
  supabase: ArivvioSupabaseClient,
  eventIds: string[],
) {
  if (!eventIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .in("event_id", eventIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getBookingsForVendors(
  supabase: ArivvioSupabaseClient,
  vendorIds: string[],
) {
  if (!vendorIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .in("vendor_id", vendorIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getBookingById(
  supabase: ArivvioSupabaseClient,
  bookingId: string,
) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateBookingNotes(
  supabase: ArivvioSupabaseClient,
  input: {
    bookingId: string;
    plannerNotes?: string | null;
    vendorNotes?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("bookings")
    .update({
      planner_notes: input.plannerNotes,
      vendor_notes: input.vendorNotes,
    })
    .eq("id", input.bookingId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export type BookingRow = PublicTableRow<"bookings">;
