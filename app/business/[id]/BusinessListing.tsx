"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  listingOperation,
  type ListingRecord,
  type ClaimRecord,
} from "@/lib/repositories/listingsRepository";
export function BusinessListing({
  id,
  initialEventId,
  initialServiceId,
  initialMode,
}: {
  id: string;
  initialEventId?: string;
  initialServiceId?: string;
  initialMode?: string;
}) {
  const [eventId, setEventId] = useState(initialEventId ?? ""),
    [serviceId, setServiceId] = useState(initialServiceId ?? "");
  const [listing, setListing] = useState<ListingRecord | null>(null),
    [signedIn, setSignedIn] = useState(false),
    [events, setEvents] = useState<{ id: string; title: string }[]>([]),
    [services, setServices] = useState<{ id: string; service_name: string }[]>(
      [],
    ),
    [mode, setMode] = useState(initialMode === "claim" ? "claim" : "request"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [claim, setClaim] = useState<ClaimRecord | null>(null);
  useEffect(() => {
    let live = true;
    const client = createBrowserSupabaseClient();
    (async () => {
      const [business, serviceRows, auth] = await Promise.all([
        client.from("vendor_businesses").select("*").eq("id", id).single(),
        client
          .from("vendor_services")
          .select("id,service_name")
          .eq("vendor_id", id)
          .eq("active", true),
        client.auth.getUser(),
      ]);
      if (business.error) throw business.error;
      if (!live) return;
      setListing(business.data);
      setServices(serviceRows.data ?? []);
      setSignedIn(!!auth.data.user);
      if (auth.data.user) {
        const [ev, mine] = await Promise.all([
          client
            .from("events")
            .select("id,title")
            .not("status", "in", "(cancelled,completed)"),
          listingOperation<{ claims: ClaimRecord[] }>("mine"),
        ]);
        if (!live) return;
        if (ev.error) throw ev.error;
        setEvents(ev.data ?? []);
        setClaim(
          mine.claims.find(
            (c) => c.vendor_id === id && c.status === "pending",
          ) ?? null,
        );
      }
    })().catch((e) => {
      if (live) setMessage(e.message ?? "Listing unavailable.");
    });
    return () => {
      live = false;
    };
  }, [id]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const values = Object.fromEntries(
      new FormData(e.currentTarget).entries(),
    ) as Record<string, string>;
    try {
      if (mode === "claim") {
        const c = await listingOperation<ClaimRecord>("claim", {
          ...values,
          vendor_id: id,
        });
        setClaim(c);
        setMessage(
          "Claim submitted. ARIVVIO will review ownership before granting access.",
        );
      } else {
        await listingOperation("lead", { ...values, vendor_id: id });
        setMessage(
          "ARIVVIO is reaching out. Your request is saved in your account.",
        );
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to submit.");
    } finally {
      setBusy(false);
    }
  }
  const field = "mt-1 w-full rounded-lg border ui-border ui-surface p-3";
  const next = new URLSearchParams({
    mode,
    ...(initialEventId ? { eventId: initialEventId } : {}),
    ...(initialServiceId ? { serviceId: initialServiceId } : {}),
  });
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/marketplace" className="text-sm underline">
        Back to Marketplace
      </Link>
      {!listing ? (
        <p className="mt-6" role="status">
          {message || "Loading business..."}
        </p>
      ) : (
        <>
          <p className="mt-8 text-sm ui-muted">
            {listing.owner_id
              ? "Business-managed listing"
              : "Public business listing"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            {listing.business_name}
          </h1>
          <p className="mt-3">{listing.description}</p>
          <p className="mt-2 ui-muted">
            {listing.service_area_city || "Service area not confirmed"}
          </p>
          {!listing.owner_id ? (
            <>
              <p className="mt-6 rounded-xl ui-soft p-4 text-sm">
                This business has not claimed its ARIVVIO profile. Pricing,
                availability and responses have not been confirmed.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => setMode("request")}
                  aria-pressed={mode === "request"}
                  className="rounded-lg border p-3"
                >
                  Request through ARIVVIO
                </button>
                <button
                  onClick={() => setMode("claim")}
                  aria-pressed={mode === "claim"}
                  className="rounded-lg border p-3"
                >
                  Own this business? Claim this listing
                </button>
              </div>
              {!signedIn ? (
                <Link
                  className="mt-6 inline-block underline"
                  href={`/auth/login?next=${encodeURIComponent(`/business/${id}?${next}`)}`}
                >
                  Sign in to request or claim this business
                </Link>
              ) : mode === "claim" && claim?.status === "pending" ? (
                <p className="mt-6">
                  Claim submitted. Your claim is awaiting review.
                </p>
              ) : (
                <form onSubmit={submit} className="mt-6 space-y-5">
                  {mode === "request" ? (
                    <>
                      <p>
                        We will reach out and let this business know you are
                        interested. This does not reserve a date or create a
                        booking.
                      </p>
                      <label className="block">
                        Your event
                        <select
                          name="event_id"
                          required
                          value={eventId}
                          onChange={(e) => setEventId(e.target.value)}
                          className={field}
                        >
                          <option value="">Choose an event</option>
                          {events.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      {!events.length && (
                        <Link href="/account" className="underline">
                          Create or save an event to your account first.
                        </Link>
                      )}
                      <label className="block">
                        Service
                        <select
                          name="service_id"
                          value={serviceId}
                          onChange={(e) => setServiceId(e.target.value)}
                          className={field}
                        >
                          <option value="">General inquiry</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.service_name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        Event part, if relevant
                        <input
                          name="stage_label"
                          maxLength={120}
                          placeholder="For example, reception"
                          className={field}
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <label>
                          Start time
                          <input
                            type="time"
                            name="start_time"
                            className={field}
                          />
                        </label>
                        <label>
                          End time
                          <input
                            type="time"
                            name="end_time"
                            className={field}
                          />
                        </label>
                      </div>
                      <label className="block">
                        What would you like them to know?
                        <textarea
                          name="customer_note"
                          maxLength={4000}
                          rows={4}
                          className={field}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="block">
                        Your relationship to the business
                        <input
                          name="relationship"
                          required
                          maxLength={200}
                          className={field}
                        />
                      </label>
                      <label className="block">
                        Business email
                        <input
                          name="business_email"
                          type="email"
                          maxLength={254}
                          className={field}
                        />
                      </label>
                      <label className="block">
                        Business phone
                        <input
                          name="business_phone"
                          type="tel"
                          maxLength={80}
                          className={field}
                        />
                      </label>
                      <label className="block">
                        How can we verify your ownership?
                        <textarea
                          name="verification_note"
                          maxLength={2000}
                          rows={4}
                          className={field}
                        />
                      </label>
                      <p className="text-sm ui-muted">
                        Provide a business email or phone. Submitting a claim
                        does not grant editing access.
                      </p>
                    </>
                  )}
                  <button
                    disabled={busy || (mode === "request" && !events.length)}
                    className="rounded-lg ui-primary px-5 py-3 disabled:opacity-50"
                  >
                    {busy
                      ? "Saving..."
                      : mode === "claim"
                        ? "Submit claim"
                        : "Confirm concierge request"}
                  </button>
                </form>
              )}
            </>
          ) : (
            <p className="mt-6">
              This business has joined ARIVVIO.{" "}
              <Link href="/marketplace" className="underline">
                View services and request a quote in Marketplace.
              </Link>
            </p>
          )}
          {message && (
            <p role="status" className="mt-6 rounded-xl ui-soft p-4">
              {message}{" "}
              <Link href="/account" className="underline">
                View your account
              </Link>
            </p>
          )}
          <Link
            href="/support-project"
            className="mt-8 inline-block text-sm underline"
          >
            Correct or remove this listing
          </Link>
        </>
      )}
    </main>
  );
}
