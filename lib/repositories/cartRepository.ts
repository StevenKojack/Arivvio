import type { PublicTableRow } from "@/lib/supabase/database.types";
import type { ItemType } from "@/lib/types/domain";
import type { ArivvioSupabaseClient } from "./types";

export type CartItemCreateInput = {
  endTime?: string | null;
  estimatedPrice?: number | null;
  eventId: string;
  itemType: ItemType;
  quantity?: number;
  serviceId?: string | null;
  startTime?: string | null;
  vendorId?: string | null;
  venueId?: string | null;
};

export type CartItemQuoteInput = Pick<
  PublicTableRow<"cart_items">,
  | "end_time"
  | "estimated_price"
  | "event_id"
  | "id"
  | "service_id"
  | "start_time"
  | "vendor_id"
  | "venue_id"
>;

export async function createCartItem(
  supabase: ArivvioSupabaseClient,
  input: CartItemCreateInput,
) {
  const { data, error } = await supabase
    .from("cart_items")
    .insert({
      end_time: input.endTime ?? null,
      estimated_price: input.estimatedPrice ?? null,
      event_id: input.eventId,
      item_type: input.itemType,
      quantity: input.quantity ?? 1,
      service_id: input.serviceId ?? null,
      start_time: input.startTime ?? null,
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

export async function updateCartItemTime(
  supabase: ArivvioSupabaseClient,
  input: {
    cartItemId: string;
    endTime: string;
    estimatedPrice: number;
    eventId: string;
    startTime: string;
  },
) {
  const { error } = await supabase
    .from("cart_items")
    .update({
      end_time: input.endTime,
      estimated_price: input.estimatedPrice,
      start_time: input.startTime,
    })
    .eq("id", input.cartItemId)
    .eq("event_id", input.eventId);

  if (error) {
    throw error;
  }
}

export async function markCartItemsQuoteRequested(
  supabase: ArivvioSupabaseClient,
  input: { eventId: string; ids: string[] },
) {
  if (!input.ids.length) {
    return;
  }

  const { error } = await supabase
    .from("cart_items")
    .update({ status: "quote_requested" })
    .eq("event_id", input.eventId)
    .in("id", input.ids);

  if (error) {
    throw error;
  }
}
