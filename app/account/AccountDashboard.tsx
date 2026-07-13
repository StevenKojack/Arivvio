"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isAdminEmail } from "@/lib/auth/roles";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { getBookingsForPlannerEvents, type BookingRow } from "@/lib/repositories/bookingsRepository";
import { getPlannerEvents } from "@/lib/repositories/eventsRepository";
import { ensureCurrentProfile } from "@/lib/repositories/profilesRepository";
import { getQuoteRequestsForEvents, type QuoteRequestRow } from "@/lib/repositories/quotesRepository";
import { getVendorBusinessesByOwner, type VendorBusinessRow } from "@/lib/repositories/vendorsRepository";
import { confirmAcceptedQuote } from "@/lib/services/quoteService";
import type { PublicTableRow } from "@/lib/supabase/database.types";
import { formatDate, formatMoney, formatTime } from "@/lib/utils/format";

type EventRow = PublicTableRow<"events">;
type ProfileRow = PublicTableRow<"profiles">;

export function AccountDashboard() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [vendors, setVendors] = useState<VendorBusinessRow[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequestRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAccount() {
      if (!hasSupabaseConfig()) {
        setMessage(
          "Supabase is not configured yet. Add .env.local values to use saved accounts and events.",
        );
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        if (!user) {
          setMessage("Log in or create an account to see your dashboard.");
          setIsLoading(false);
          return;
        }

        setUserEmail(user.email ?? "");
        const currentProfile = await ensureCurrentProfile(supabase, user);
        setProfile(currentProfile);

        const eventRows = await getPlannerEvents(supabase, currentProfile.id);
        const eventIds = eventRows.map((eventRow) => eventRow.id);
        const [vendorRows, quoteRows, bookingRows] = await Promise.all([
          getVendorBusinessesByOwner(supabase, currentProfile.id),
          getQuoteRequestsForEvents(supabase, eventIds),
          getBookingsForPlannerEvents(supabase, eventIds),
        ]);

        setEvents(eventRows);
        setVendors(vendorRows);
        setQuoteRequests(quoteRows);
        setBookings(bookingRows);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Unable to load dashboard.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadAccount();
  }, []);

  const draftEvents = useMemo(
    () => events.filter((event) => event.status === "draft"),
    [events],
  );
  const upcomingEvents = useMemo(
    () => events.filter((event) => event.status !== "completed" && event.status !== "cancelled"),
    [events],
  );
  const pendingQuotes = quoteRequests.filter((quote) => quote.status === "pending");
  const confirmedQuoteIds = new Set(
    bookings
      .map((booking) => booking.quote_request_id)
      .filter((quoteId): quoteId is string => Boolean(quoteId)),
  );
  const acceptedQuotes = quoteRequests.filter((quote) => quote.status === "accepted");
  const budgetMax = events.reduce((total, event) => total + Number(event.budget_max ?? 0), 0);
  const confirmedSpend = bookings.reduce(
    (total, booking) => total + Number(booking.final_price ?? 0),
    0,
  );
  const guestCount = events.reduce(
    (total, event) => total + Number(event.guest_count ?? 0),
    0,
  );
  const progressItems = [
    { done: events.length > 0, label: "Create event" },
    { done: quoteRequests.length > 0, label: "Request vendor quotes" },
    { done: acceptedQuotes.length > 0, label: "Receive accepted quotes" },
    { done: bookings.length > 0, label: "Confirm vendors" },
  ];

  async function confirmQuote(quote: QuoteRequestRow) {
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();
      const booking = await confirmAcceptedQuote(supabase, quote);
      setBookings((current) => [booking, ...current]);
      setMessage("Vendor confirmed. Booking created without payment.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to confirm vendor.");
    }
  }

  if (isLoading) {
    return <DashboardShell message="Loading your dashboard..." />;
  }

  if (message && !profile) {
    return (
      <DashboardShell message={message}>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/auth/login"
            className="rounded-full bg-[#0D1321] px-5 py-3 text-sm font-semibold text-white"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-950"
          >
            Create account
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B88A1D]">
            Account
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}.
          </h1>
          <p className="mt-4 text-lg text-neutral-600">
            Plan events, review quotes, manage guests, and confirm bookings.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/discover"
            className="rounded-full bg-[#0D1321] px-5 py-3 text-sm font-semibold text-white"
          >
            New event
          </Link>
          <Link
            href="/marketplace"
            className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-950"
          >
            Browse vendors
          </Link>
          {vendors.length ? (
            <Link
              href="/vendor/dashboard"
              className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-950"
            >
              Vendor dashboard
            </Link>
          ) : null}
          {isAdminEmail(userEmail) ? (
            <Link
              href="/admin"
              className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-950"
            >
              Admin
            </Link>
          ) : null}
          <Link
            href="/auth/logout"
            className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold text-neutral-950"
          >
            Log out
          </Link>
        </div>
      </div>

      {message ? (
        <p className="mt-6 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700">
          {message}
        </p>
      ) : null}

      <div className="mt-10 grid gap-4 md:grid-cols-4">
        <Metric label="Upcoming events" value={String(upcomingEvents.length)} />
        <Metric label="Pending vendors" value={String(pendingQuotes.length)} />
        <Metric label="Confirmed vendors" value={String(bookings.length)} />
        <Metric label="Guest count" value={guestCount.toLocaleString()} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-[0_18px_44px_rgba(13,19,33,0.05)]">
          <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">My events</h2>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
              {draftEvents.length} drafts
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {upcomingEvents.length ? (
              upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block rounded-lg border border-neutral-200 p-4 transition hover:-translate-y-0.5 hover:border-[#0D1321]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-neutral-950">{event.title}</p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {event.event_type} - {formatDate(event.date)} -{" "}
                        {event.guest_count ?? 0} guests
                      </p>
                    </div>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                      {event.status}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                actionHref="/discover"
                actionLabel="Create event"
                message="No upcoming events yet."
              />
            )}
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-[0_18px_44px_rgba(13,19,33,0.05)]">
          <h2 className="text-2xl font-semibold tracking-tight">Budget tracker</h2>
          <div className="mt-5 rounded-lg bg-[#0D1321] p-5 text-white">
            <p className="text-sm text-neutral-400">Confirmed spend</p>
            <p className="mt-2 text-4xl font-semibold">{formatMoney(confirmedSpend)}</p>
            <p className="mt-2 text-sm text-neutral-300">
              Across {formatMoney(budgetMax)} planned budget.
            </p>
          </div>
          <div className="mt-5 space-y-3">
            {progressItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-sm">
                <span
                  className={`h-3 w-3 rounded-full ${
                    item.done ? "bg-emerald-500" : "bg-neutral-300"
                  }`}
                />
                <span className={item.done ? "text-neutral-950" : "text-neutral-500"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-lg border border-neutral-200 bg-white p-6 shadow-[0_18px_44px_rgba(13,19,33,0.05)]">
        <h2 className="text-2xl font-semibold tracking-tight">Quote requests</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {quoteRequests.length ? (
            quoteRequests.map((quote) => {
              const event = events.find((eventRow) => eventRow.id === quote.event_id);
              const isConfirmed = confirmedQuoteIds.has(quote.id);

              return (
                <article key={quote.id} className="rounded-lg border border-neutral-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-950">
                        {event?.title ?? "Event quote"}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {formatTime(quote.requested_start_time)} to{" "}
                        {formatTime(quote.requested_end_time)}
                      </p>
                    </div>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                      {isConfirmed ? "booked" : quote.status}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-2xl font-semibold">
                      {formatMoney(quote.vendor_final_price ?? quote.estimated_price)}
                    </p>
                    {quote.status === "accepted" && !isConfirmed ? (
                      <button
                        type="button"
                        onClick={() => confirmQuote(quote)}
                        className="h-10 rounded-full bg-[#0D1321] px-4 text-sm font-semibold text-white"
                      >
                        Confirm vendor
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <EmptyState
              actionHref="/marketplace"
              actionLabel="Browse vendors"
              message="No quote requests yet."
            />
          )}
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-[0_18px_44px_rgba(13,19,33,0.05)]">
          <h2 className="text-2xl font-semibold tracking-tight">Bookings</h2>
          <div className="mt-5 space-y-3">
            {bookings.length ? (
              bookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/bookings/${booking.id}`}
                  className="block rounded-lg border border-neutral-200 p-4 transition hover:border-[#0D1321]"
                >
                  <p className="font-semibold text-neutral-950">
                    {formatMoney(booking.final_price)} - {booking.booking_status}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Payment {booking.payment_status}
                  </p>
                </Link>
              ))
            ) : (
              <EmptyState
                actionHref="/marketplace"
                actionLabel="Request quotes"
                message="No confirmed vendors yet."
              />
            )}
          </div>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-[0_18px_44px_rgba(13,19,33,0.05)]">
          <h2 className="text-2xl font-semibold tracking-tight">Guest lists</h2>
          <div className="mt-5 space-y-3">
            {events.length ? (
              events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block rounded-lg border border-neutral-200 p-4 transition hover:border-[#0D1321]"
                >
                  <p className="font-semibold text-neutral-950">{event.title}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Manage guests and RSVP summary
                  </p>
                </Link>
              ))
            ) : (
              <EmptyState
                actionHref="/discover"
                actionLabel="Create event"
                message="Guest lists appear after you create an event."
              />
            )}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <QuickAction title="Resume planning" href={events[0] ? `/events/${events[0].id}` : "/discover"} />
        <QuickAction title="Manage guests" href={events[0] ? `/events/${events[0].id}` : "/discover"} />
        <QuickAction title="View messages" href="/account" muted />
      </div>

      <section className="mt-5 rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Vendor tools</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Vendor tools stay separate from planning until you list a service.
            </p>
          </div>
          <Link
            href={vendors.length ? "/vendor/dashboard" : "/vendor/onboarding"}
            className="w-fit rounded-full bg-[#0D1321] px-5 py-3 text-sm font-semibold text-white"
          >
            {vendors.length ? "Open vendor dashboard" : "Become a vendor"}
          </Link>
        </div>
        {vendors.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {vendors.map((vendor) => (
              <article key={vendor.id} className="rounded-lg border border-neutral-200 p-4">
                <p className="font-semibold text-neutral-950">{vendor.business_name}</p>
                <p className="mt-1 text-sm text-neutral-500">
                  {vendor.category} - {vendor.approval_status}
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function QuickAction({
  href,
  muted,
  title,
}: {
  href: string;
  muted?: boolean;
  title: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border p-5 text-sm font-semibold transition hover:-translate-y-0.5 ${
        muted
          ? "border-neutral-200 bg-white text-neutral-500"
          : "border-[#0D1321] bg-[#0D1321] text-white"
      }`}
    >
      {title}
    </Link>
  );
}

function EmptyState({
  actionHref,
  actionLabel,
  message,
}: {
  actionHref: string;
  actionLabel: string;
  message: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-5 text-sm text-neutral-600">
      <p>{message}</p>
      <Link
        href={actionHref}
        className="mt-4 inline-flex rounded-full bg-[#0D1321] px-4 py-2 text-sm font-semibold text-white"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function DashboardShell({
  children,
  message,
}: {
  children?: React.ReactNode;
  message: string;
}) {
  return (
    <div className="mx-auto max-w-7xl rounded-lg border border-neutral-200 bg-white p-6 shadow-[0_18px_44px_rgba(13,19,33,0.05)]">
      <p className="text-sm font-semibold text-neutral-700">{message}</p>
      {children}
    </div>
  );
}
