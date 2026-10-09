"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { QuoteRequestRow } from "@/lib/repositories/quotesRepository";
import type { BookingRow } from "@/lib/repositories/bookingsRepository";
import { confirmAcceptedQuote } from "@/lib/services/quoteService";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils/format";
import { CustomerDialog } from "./CustomerDialog";
export function CloudQuoteCard({
  quote,
  eventName,
  booking,
  onBooked,
}: {
  quote: QuoteRequestRow;
  eventName: string;
  booking?: BookingRow;
  onBooked: (booking: BookingRow) => void;
}) {
  const offerPrice = quote.vendor_final_price ?? quote.estimated_price;
  const [name, setName] = useState("Provider request");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const client = createBrowserSupabaseClient();
    void (async () => {
      const result = quote.vendor_id
        ? await client
            .from("vendor_businesses")
            .select("business_name")
            .eq("id", quote.vendor_id)
            .maybeSingle()
        : await client
            .from("venues")
            .select("name")
            .eq("id", quote.venue_id ?? "")
            .maybeSingle();
      if (active && result.data)
        setName(
          "business_name" in result.data
            ? result.data.business_name
            : result.data.name,
        );
    })();
    return () => {
      active = false;
    };
  }, [quote.vendor_id, quote.venue_id]);
  async function book() {
    setBusy(true);
    setError("");
    try {
      const row = await confirmAcceptedQuote(
        createBrowserSupabaseClient(),
        quote,
      );
      onBooked(row);
      setConfirm(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to confirm. Reload the request and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="hub-card min-w-0 p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <h3 className="font-semibold">{name}</h3>
        <span className="text-sm ui-muted">
          {booking ? "Booked" : quote.status}
        </span>
      </div>
      <Link
        href={`/events/${quote.event_id}`}
        className="mt-2 inline-block text-sm underline"
      >
        {eventName}
      </Link>
      <p className="mt-3 text-lg font-semibold">
        {offerPrice != null
          ? `${formatMoney(offerPrice)}${quote.status === "accepted" || quote.vendor_final_price != null ? "" : " estimated"}`
          : "Awaiting provider price"}
      </p>
      {quote.message && (
        <p className="mt-2 whitespace-pre-wrap text-sm ui-muted">
          {quote.message}
        </p>
      )}
      {!booking &&
        quote.status === "accepted" &&
        offerPrice != null && (
          <button className="hub-primary mt-4" onClick={() => setConfirm(true)}>
            Review and confirm offer
          </button>
        )}
      {booking && (
        <p className="mt-3 text-sm ui-muted">
          Booking saved. No payment has been collected.
        </p>
      )}
      {confirm && (
        <CustomerDialog
          title="Confirm provider offer"
          onClose={() => {
            if (!busy) setConfirm(false);
          }}
        >
          <p>
            Confirm {name} for {eventName} at{" "}
            {formatMoney(offerPrice)}?
          </p>
          <p className="my-4 text-sm ui-muted">
            This creates an ARIVVIO booking record. It does not collect payment
            or replace any separate provider agreement.
          </p>
          <button
            className="hub-primary"
            disabled={busy}
            onClick={() => void book()}
          >
            {busy ? "Saving…" : "Confirm booking without payment"}
          </button>
          <button
            className="hub-button ml-3"
            disabled={busy}
            onClick={() => setConfirm(false)}
          >
            Keep reviewing
          </button>
          {error && (
            <p className="mt-3" role="alert">
              {error}
            </p>
          )}
        </CustomerDialog>
      )}
    </article>
  );
}
