import {
  markCartItemsQuoteRequested,
  type CartItemQuoteInput,
} from "@/lib/repositories/cartRepository";
import {
  createQuoteRequests,
  type QuoteRequestRow,
} from "@/lib/repositories/quotesRepository";
import type { PublicTableRow } from "@/lib/supabase/database.types";
import type { ArivvioSupabaseClient } from "@/lib/repositories/types";

export async function requestQuotesFromCart(
  supabase: ArivvioSupabaseClient,
  input: {
    cartItems: CartItemQuoteInput[];
    event: Pick<PublicTableRow<"events">, "guest_count" | "id">;
    message?: string;
    plannerId: string;
  },
) {
  const quoteableItems = input.cartItems.filter(
    (item) => item.vendor_id || item.service_id || item.venue_id,
  );

  if (!quoteableItems.length) {
    return [];
  }

  const quoteRequests = await createQuoteRequests(
    supabase,
    quoteableItems.map((item) => ({
      endTime: item.end_time,
      estimatedPrice: item.estimated_price,
      eventId: input.event.id,
      guestCount: input.event.guest_count,
      message: input.message ?? null,
      plannerId: input.plannerId,
      serviceId: item.service_id,
      startTime: item.start_time,
      vendorId: item.vendor_id,
      venueId: item.venue_id,
    })),
  );

  await markCartItemsQuoteRequested(supabase, {
    eventId: input.event.id,
    ids: quoteableItems.map((item) => item.id),
  });

  return quoteRequests;
}

export async function confirmAcceptedQuote(
  client: ArivvioSupabaseClient,
  quote: QuoteRequestRow,
) {
  const { data, error } = await client.rpc("accept_quote_and_create_booking", {
    request: quote.id,
    expected_revision: quote.quote_revision,
  });
  if (error) throw new Error(error.message);
  return data;
}
