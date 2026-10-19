"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getRequestInbox,
  type RequestInboxItem,
} from "@/lib/repositories/messagesRepository";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { requestPriority, requestStatus } from "@/lib/requests/lifecycle";
import { formatMoney } from "@/lib/utils/format";
export function RequestInbox({
  audience,
  compact = false,
}: {
  audience: "customer" | "vendor";
  compact?: boolean;
}) {
  const [rows, setRows] = useState<RequestInboxItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    const client = createBrowserSupabaseClient();
    void getRequestInbox(client, audience)
      .then((value) => {
        if (active) {
          setRows(value);
          setError("");
        }
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Unable to load requests.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && active) {
        active = false;
        setLoading(false);
        setRows([]);
        setError("Sign in to see your requests.");
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [audience, reload]);
  const vendor = audience === "vendor";
  const groups = [
    "Needs your attention",
    vendor ? "Awaiting customer decision" : "Waiting on provider",
    "Booked",
    "Closed",
  ];
  const sorted = [...rows].sort(
    (a, b) =>
      requestPriority(a.quote.status, !!a.booking_id, a.needs_reply, vendor) -
        requestPriority(
          b.quote.status,
          !!b.booking_id,
          b.needs_reply,
          vendor,
        ) || b.last_activity.localeCompare(a.last_activity),
  );
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">
            {vendor ? "Inquiries and conversations" : "Requests / Vendors"}
          </h2>
          <p className="mt-2 text-sm ui-muted">
            {vendor
              ? "Reply, send a quote, and keep each customer’s details together."
              : "Review quotes and continue the conversation with your providers."}
          </p>
        </div>
        <button
          className="hub-button"
          onClick={() => setReload((value) => value + 1)}
        >
          Refresh requests
        </button>
      </div>
      {loading && <p role="status">Loading requests…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && !rows.length && (
        <p className="hub-card p-6 ui-muted">
          {vendor
            ? "New inquiries will appear here when a customer requests your services."
            : "Open an account event and browse providers to request a quote."}
        </p>
      )}
      {groups.map((group, index) => {
        const items = sorted.filter(
          (row) =>
            requestPriority(
              row.quote.status,
              !!row.booking_id,
              row.needs_reply,
              vendor,
            ) === index,
        );
        if (!items.length || (compact && index === 3)) return null;
        return (
          <div key={group}>
            <h3 className="mb-3 font-semibold">
              {group} · {items.length}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {(compact ? items.slice(0, 4) : items).map((row) => (
                <Link
                  key={row.quote.id}
                  className="hub-card block min-w-0 p-5 transition hover:shadow-md"
                  href={`/account/requests/${row.quote.id}`}
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <h4 className="font-semibold">
                      {vendor ? row.context.title : row.provider_name}
                    </h4>
                    <span className="text-sm ui-muted">
                      {requestStatus(
                        row.quote.status,
                        !!row.booking_id,
                        vendor,
                        row.quote.quote_revision,
                      )}
                    </span>
                  </div>
                  <p className="mt-2 text-sm ui-muted">
                    {row.service_name} ·{" "}
                    {vendor ? row.provider_name : row.context.title}
                  </p>
                  {row.quote.vendor_final_price != null && (
                    <p className="mt-3 text-lg font-semibold">
                      {formatMoney(row.quote.vendor_final_price)}
                    </p>
                  )}
                  <p className="mt-3 text-xs ui-muted">
                    {row.needs_reply ? "Reply needed · " : ""}Updated{" "}
                    {new Date(row.last_activity).toLocaleString()}
                  </p>
                  <p className="mt-3 text-sm font-semibold">
                    Open conversation →
                  </p>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
