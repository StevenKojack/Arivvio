"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isAdminEmail } from "@/lib/auth/roles";
import {
  createBrowserSupabaseClient,
  hasSupabaseConfig,
} from "@/lib/supabase/client";
import { getPlannerEvents } from "@/lib/repositories/eventsRepository";
import { ensureCurrentProfile } from "@/lib/repositories/profilesRepository";
import {
  getQuoteRequestsForEvents,
  type QuoteRequestRow,
} from "@/lib/repositories/quotesRepository";
import {
  getBookingsForPlannerEvents,
  type BookingRow,
} from "@/lib/repositories/bookingsRepository";
import { getVendorBusinessesByOwner } from "@/lib/repositories/vendorsRepository";
import type { PublicTableRow } from "@/lib/supabase/database.types";
import { eventGroup } from "@/lib/customer-cloud/profile";
import {
  loadCustomerEvents,
  type CustomerEvent,
} from "@/lib/customer-demo/events";
import { formatDate } from "@/lib/utils/format";
import { CloudQuoteCard } from "@/app/components/CloudQuoteCard";
import { SaveEventToAccount } from "@/app/components/SaveEventToAccount";
import { ThemeControl } from "@/app/components/ThemeControl";
export function AccountDashboard() {
  const [profile, setProfile] = useState<PublicTableRow<"profiles"> | null>(
    null,
  );
  const [events, setEvents] = useState<PublicTableRow<"events">[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequestRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [local, setLocal] = useState<CustomerEvent[]>([]);
  const [vendor, setVendor] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [section, setSection] = useState("Events");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLocal(loadCustomerEvents());
        if (!hasSupabaseConfig())
          throw new Error(
            "Account saving is not connected yet. You can continue using your Demo Account.",
          );
        const client = createBrowserSupabaseClient();
        const {
          data: { user },
          error,
        } = await client.auth.getUser();
        if (error || !user)
          throw new Error(
            "Sign in to open your account events, requests and bookings.",
          );
        const p = await ensureCurrentProfile(client, user);
        const rows = await getPlannerEvents(client, p.id);
        const [q, b, v] = await Promise.all([
          getQuoteRequestsForEvents(
            client,
            rows.map((e) => e.id),
          ),
          getBookingsForPlannerEvents(
            client,
            rows.map((e) => e.id),
          ),
          getVendorBusinessesByOwner(client, p.id),
        ]);
        if (active) {
          setProfile(p);
          setEvents(rows);
          setQuotes(q);
          setBookings(b);
          setVendor(v.length > 0);
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Unable to load your account.",
          );
      } finally {
        if (active) setBusy(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);
  if (busy)
    return (
      <p role="status" className="hub-card p-6">
        Loading your account…
      </p>
    );
  if (!profile)
    return (
      <section className="hub-card p-6">
        <h1 className="text-3xl font-semibold">Your ARIVVIO account</h1>
        <p role="status" className="my-4 ui-muted">
          {error}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="hub-primary" href="/auth/login">
            Sign in
          </Link>
          <Link className="hub-button" href="/auth/signup">
            Create account
          </Link>
          <Link className="hub-button" href="/account/demo">
            Continue in Demo Account
          </Link>
        </div>
      </section>
    );
  const today = new Date().toLocaleDateString("en-CA");
  return (
    <section className="mx-auto max-w-7xl">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm ui-muted">Your account</p>
          <h1 className="mt-2 text-4xl font-semibold">
            Welcome{profile.full_name ? `, ${profile.full_name}` : ""}.
          </h1>
          <p className="mt-3 ui-muted">
            Your events, provider requests and bookings, together.
          </p>
        </div>
        <Link className="hub-primary" href="/discover">
          Plan an event
        </Link>
      </header>
      <nav aria-label="Account sections" className="my-6 flex flex-wrap gap-2">
        {["Events", "Requests / Vendors", "Account"].map((s) => (
          <button
            key={s}
            className={s === section ? "hub-primary" : "hub-button"}
            aria-pressed={s === section}
            onClick={() => setSection(s)}
          >
            {s}
          </button>
        ))}
      </nav>
      {section === "Events" && (
        <>
          {[
            "Current / upcoming",
            "Still planning",
            "Past / completed",
            "Cancelled",
          ].map((group) => {
            const rows = events.filter((e) => eventGroup(e, today) === group);
            return rows.length ? (
              <section key={group} className="mb-7">
                <h2 className="mb-4 text-xl font-semibold">{group}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {rows.map((e) => (
                    <Link
                      key={e.id}
                      className="hub-card p-5"
                      href={`/events/${e.id}`}
                    >
                      <h3 className="text-lg font-semibold">{e.title}</h3>
                      <p className="mt-2 text-sm ui-muted">
                        {e.date ? formatDate(e.date) : "Date to confirm"} ·{" "}
                        {e.status}
                      </p>
                      <p className="mt-3 text-sm">
                        {quotes.filter((q) => q.event_id === e.id).length}{" "}
                        requests · Open Event Hub
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null;
          })}
          {!events.length && (
            <p className="hub-card p-6 ui-muted">
              No account events yet. Save a browser event below or start
              planning.
            </p>
          )}
          {local.some((e) => e.profile) && (
            <details className="hub-card mt-6 p-5">
              <summary className="cursor-pointer font-semibold">
                Save a browser event to this account
              </summary>
              <p className="my-3 text-sm ui-muted">
                Nothing uploads automatically. Demo requests and messages remain
                local.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {local
                  .filter((e) => e.profile)
                  .map((e) => (
                    <article
                      key={e.id}
                      className="rounded-xl border ui-border p-4"
                    >
                      <h3 className="mb-3 font-semibold">{e.name}</h3>
                      <SaveEventToAccount profile={e.profile!} />
                    </article>
                  ))}
              </div>
            </details>
          )}
        </>
      )}
      {section === "Requests / Vendors" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {quotes.map((q) => (
            <CloudQuoteCard
              key={q.id}
              quote={q}
              eventName={
                events.find((e) => e.id === q.event_id)?.title ?? "Your event"
              }
              booking={bookings.find((b) => b.quote_request_id === q.id)}
              onBooked={(row) =>
                setBookings((current) => [
                  row,
                  ...current.filter((b) => b.id !== row.id),
                ])
              }
            />
          ))}
          {!quotes.length && (
            <p className="hub-card p-6 ui-muted">
              Choose an account event, then browse providers to request a quote.
            </p>
          )}
        </div>
      )}
      {section === "Account" && (
        <section className="hub-card max-w-2xl p-6">
          <h2 className="text-xl font-semibold">Account details</h2>
          <p className="mt-4">{profile.full_name || "ARIVVIO customer"}</p>
          <p className="mt-2 break-words text-sm ui-muted">{profile.email}</p>
          {profile.phone && (
            <p className="mt-2 text-sm ui-muted">{profile.phone}</p>
          )}
          <div className="my-5 flex items-center gap-3">
            Appearance <ThemeControl />
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="hub-button"
              href={vendor ? "/vendor/dashboard" : "/vendor/onboarding"}
            >
              {vendor ? "Vendor dashboard" : "List your business"}
            </Link>
            {isAdminEmail(profile.email) && (
              <Link className="hub-button" href="/admin">
                Admin
              </Link>
            )}
            <Link className="hub-button" href="/auth/logout">
              Sign out
            </Link>
          </div>
        </section>
      )}
    </section>
  );
}
