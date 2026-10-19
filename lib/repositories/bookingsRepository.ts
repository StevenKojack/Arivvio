import type { PublicTableRow } from "@/lib/supabase/database.types";
import type { ArivvioSupabaseClient } from "./types";

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
  client: ArivvioSupabaseClient,
  bookingId: string,
  note: string,
) {
  const { data, error } = await client.rpc("save_booking_note", {
    booking: bookingId,
    note,
  });
  if (error) throw new Error(error.message);
  return data;
}
export type BookingRow = PublicTableRow<"bookings">;
