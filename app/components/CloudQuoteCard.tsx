"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { QuoteRequestRow } from "@/lib/repositories/quotesRepository";
import type { BookingRow } from "@/lib/repositories/bookingsRepository";
import { getRequestServiceName } from "@/lib/repositories/messagesRepository";
import { getProviderName } from "@/lib/customer-cloud/events";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { requestStatus } from "@/lib/requests/lifecycle";
import { formatMoney } from "@/lib/utils/format";
export function CloudQuoteCard({
  quote,
  eventName,
  booking,
}: {
  quote: QuoteRequestRow;
  eventName: string;
  booking?: BookingRow;
}) {
  const [name, setName] = useState("Provider request");
  const [service, setService] = useState("Event service");
  useEffect(() => {
    let active = true;
    const client = createBrowserSupabaseClient();
    void Promise.all([
      getProviderName(client, quote.vendor_id, quote.venue_id),
      getRequestServiceName(client, quote.service_id, quote.venue_id),
    ])
      .then(([provider, serviceName]) => {
        if (active) {
          setName(provider);
          setService(serviceName);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [quote.vendor_id, quote.venue_id, quote.service_id]);
  return (
    <article className="hub-card min-w-0 p-5">
      <div className="flex flex-wrap justify-between gap-2">
        <h3 className="font-semibold">{name}</h3>
        <span className="text-sm ui-muted">
          {requestStatus(quote.status, !!booking, false, quote.quote_revision)}
        </span>
      </div>
      <p className="mt-2 text-sm ui-muted">
        {service} · {eventName}
      </p>
      {quote.vendor_final_price != null && (
        <p className="mt-3 text-lg font-semibold">
          {formatMoney(quote.vendor_final_price)}
        </p>
      )}
      <p className="mt-2 text-xs ui-muted">
        Updated{" "}
        {new Date(quote.updated_at ?? quote.created_at).toLocaleString()}
      </p>
      <Link
        className="hub-button mt-4 inline-block"
        href={`/account/requests/${quote.id}`}
      >
        Open request and conversation
      </Link>
    </article>
  );
}
