import { createBooking } from "@/lib/repositories/bookingsRepository";
import {
  markCartItemsQuoteRequested,
  type CartItemQuoteInput,
} from "@/lib/repositories/cartRepository";
import {
  createQuoteRequests,
  updateQuoteRequestResponse,
  updateQuoteStatus,
  type QuoteRequestRow,
} from "@/lib/repositories/quotesRepository";
import type { PublicTableRow } from "@/lib/supabase/database.types";
import type { QuoteStatus } from "@/lib/types/domain";
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

export async function respondToQuoteRequest(
  supabase: ArivvioSupabaseClient,
  input: {
    quoteId: string;
    status: Extract<QuoteStatus, "accepted" | "declined" | "countered">;
    vendorFinalPrice?: number | null;
  },
) {
  if (input.status === "countered" && !input.vendorFinalPrice) {
    throw new Error("Add a counter price before sending a counter.");
  }

  return updateQuoteRequestResponse(supabase, input);
}

export async function confirmAcceptedQuote(
  supabase: ArivvioSupabaseClient,
  quote: QuoteRequestRow,
) {
  if (quote.status !== "accepted") {
    throw new Error("Only accepted quotes can be confirmed.");
  }

  const finalPrice = Number(quote.vendor_final_price ?? quote.estimated_price ?? 0);
  const depositAmount = Math.round(finalPrice * 0.2);
  const booking = await createBooking(supabase, {
    balanceDue: Math.max(finalPrice - depositAmount, 0),
    depositAmount,
    eventId: quote.event_id,
    finalPrice,
    plannerId: quote.planner_id,
    quoteRequestId: quote.id,
    serviceId: quote.service_id,
    vendorId: quote.vendor_id,
    venueId: quote.venue_id,
  });

  await updateQuoteStatus(supabase, quote.id, "accepted");

  return booking;
}
