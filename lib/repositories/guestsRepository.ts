import type { PublicTableRow } from "@/lib/supabase/database.types";
import type { RsvpStatus } from "@/lib/types/domain";
import type { ArivvioSupabaseClient } from "./types";

export type GuestInput = {
  email?: string | null;
  eventId: string;
  name: string;
  phone?: string | null;
  plusOnes: number;
  rsvpStatus: RsvpStatus;
};

export async function getGuestsForEvent(
  supabase: ArivvioSupabaseClient,
  eventId: string,
) {
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createGuest(
  supabase: ArivvioSupabaseClient,
  input: GuestInput,
) {
  const { data, error } = await supabase
    .from("guests")
    .insert({
      email: input.email ?? null,
      event_id: input.eventId,
      name: input.name,
      phone: input.phone ?? null,
      plus_ones: input.plusOnes,
      rsvp_status: input.rsvpStatus,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateGuest(
  supabase: ArivvioSupabaseClient,
  guestId: string,
  input: Omit<GuestInput, "eventId">,
) {
  const { data, error } = await supabase
    .from("guests")
    .update({
      email: input.email ?? null,
      name: input.name,
      phone: input.phone ?? null,
      plus_ones: input.plusOnes,
      rsvp_status: input.rsvpStatus,
    })
    .eq("id", guestId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteGuest(
  supabase: ArivvioSupabaseClient,
  guestId: string,
) {
  const { error } = await supabase.from("guests").delete().eq("id", guestId);

  if (error) {
    throw error;
  }
}

export type GuestRow = PublicTableRow<"guests">;
