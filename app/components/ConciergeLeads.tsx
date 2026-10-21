"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  listingOperation,
  leadLabel,
  type LeadRecord,
  type ClaimRecord,
} from "@/lib/repositories/listingsRepository";
export function ConciergeLeads({ eventId }: { eventId?: string }) {
  const [leads, setLeads] = useState<LeadRecord[]>([]),
    [claims, setClaims] = useState<ClaimRecord[]>([]),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    listingOperation<{ leads: LeadRecord[]; claims: ClaimRecord[] }>("mine")
      .then((r) => {
        if (live) {
          setLeads(r.leads);
          setClaims(r.claims);
          setError("");
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [revision]);
  async function withdraw(id: string) {
    if (!confirm("Withdraw this concierge request?")) return;
    setBusy(true);
    try {
      await listingOperation("withdraw", { id });
      setRevision((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to withdraw.");
    } finally {
      setBusy(false);
    }
  }
  const rows = leads.filter((l) => !eventId || l.event_id === eventId);
  return (
    <section className="mt-6 space-y-3">
      <h2 className="text-xl font-semibold">ARIVVIO concierge</h2>
      {error && <p role="alert">{error}</p>}
      {!rows.length && !error && (
        <p className="text-sm ui-muted">
          Requests for businesses that have not joined ARIVVIO will appear here.
        </p>
      )}
      {rows.map((l) => (
        <article
          key={l.id}
          className="rounded-xl border ui-border ui-surface p-5"
        >
          <h3 className="font-semibold">{l.business_name}</h3>
          <p className="mt-1 text-sm ui-muted">
            {l.event_title}
            {l.stage_label ? ` · ${l.stage_label}` : ""}
          </p>
          <p className="mt-3 text-sm">{leadLabel(l.status)}</p>
          <p className="mt-2 text-sm whitespace-pre-wrap">{l.customer_note}</p>
          {l.quote_request_id ? (
            <Link
              className="mt-3 inline-block underline"
              href={`/account/requests/${l.quote_request_id}`}
            >
              Open conversation
            </Link>
          ) : (
            !["closed", "withdrawn", "declined", "unreachable"].includes(
              l.status,
            ) && (
              <button
                disabled={busy}
                onClick={() => withdraw(l.id)}
                className="mt-3 text-sm underline"
              >
                Withdraw request
              </button>
            )
          )}
        </article>
      ))}
      {!eventId &&
        claims.map((c) => (
          <p key={c.id} className="rounded-xl border p-4">
            Business claim: {c.status}.{" "}
            {c.status === "approved" ? (
              <Link href="/vendor/dashboard" className="underline">
                Your ARIVVIO listing is ready. Review it in Vendor Hub.
              </Link>
            ) : (
              "ARIVVIO reviews ownership before granting access."
            )}
          </p>
        ))}
    </section>
  );
}
