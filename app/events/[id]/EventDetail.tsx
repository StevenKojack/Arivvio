"use client";
import { ConciergeLeads } from "@/app/components/ConciergeLeads";
import { listingOperation, type LeadRecord } from "@/lib/repositories/listingsRepository";

import { useRouter } from 'next/navigation';
import { CloudQuoteCard } from '@/app/components/CloudQuoteCard';
import { CustomerDialog } from '@/app/components/CustomerDialog';
import { EventPartsSummary } from '@/app/discover/components/EventParts';
import { profileFromEvent } from '@/lib/customer-cloud/profile';
import { removeCloudEvent } from '@/lib/customer-cloud/events';
import { understandEvent } from '@/lib/event-intelligence/understanding';
import { AskArivvioButton } from '@/app/components/AskArivvioButton';
import Link from "next/link";
import { EventPlanSnapshot } from "@/app/components/EventPlanSnapshot";
import { atmosphereForEvent } from "@/lib/event-intelligence/atmosphere";
import { useEffect, useState } from "react";
import { buildMarketplaceHrefForEvent } from "@/lib/actions/navigationActions";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { getEventWorkspace } from "@/lib/repositories/eventsRepository";
import type { BookingRow } from "@/lib/repositories/bookingsRepository";
import {
  createGuest,
  deleteGuest,
  getGuestsForEvent,
  updateGuest,
  type GuestInput as GuestDraftInput,
  type GuestRow,
} from "@/lib/repositories/guestsRepository";
import type { QuoteRequestRow } from "@/lib/repositories/quotesRepository";
import type { PublicTableRow } from "@/lib/supabase/database.types";
import type { RsvpStatus } from "@/lib/types/domain";
import { formatDate, formatMoney, formatTime } from "@/lib/utils/format";

type EventRow = PublicTableRow<"events">;
type CartItemRow = PublicTableRow<"cart_items">;

export function EventDetail({ eventId }: { eventId: string }) {
  const router=useRouter();
  const [confirmRemoval,setConfirmRemoval]=useState(false);
  const [removing,setRemoving]=useState(false);
  const [hasConcierge,setHasConcierge]=useState(true);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [cartItems, setCartItems] = useState<CartItemRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequestRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [guestDraft, setGuestDraft] = useState<Omit<GuestDraftInput, "eventId">>({
    email: "",
    name: "",
    phone: "",
    plusOnes: 0,
    rsvpStatus: "pending",
  });
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [message, setMessage] = useState("Loading event...");

  useEffect(() => {
    async function loadEvent() {
      if (!hasSupabaseConfig()) {
        setMessage("Supabase is not configured yet.");
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        const [workspace, guestRows] = await Promise.all([
          getEventWorkspace(supabase, eventId),
          getGuestsForEvent(supabase, eventId),
        ]);

        setEvent(workspace.event);
        const concierge=await listingOperation<{leads:LeadRecord[]}>("mine");
        setHasConcierge(concierge.leads.some(l=>l.event_id===eventId));
        setCartItems(workspace.cartItems);
        setQuotes(workspace.quotes);
        setBookings(workspace.bookings);
        setGuests(guestRows);
        setMessage("");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load event.");
      }
    }

    void loadEvent();
    const refresh=()=>void loadEvent();
    window.addEventListener('arivvio:cloud-event-changed',refresh);
    window.addEventListener('arivvio:requests-changed',refresh);
    return()=>{window.removeEventListener('arivvio:cloud-event-changed',refresh);window.removeEventListener('arivvio:requests-changed',refresh);};
  }, [eventId]);

  async function saveGuest() {
    try {
      if (!Number.isInteger(guestDraft.plusOnes) || guestDraft.plusOnes < 0) { setMessage("Extra guest count must be a whole number of zero or more."); return; }
      if (!guestDraft.name.trim()) {
        setMessage("Guest name is required.");
        return;
      }

      const supabase = createBrowserSupabaseClient();

      if (editingGuestId) {
        const updatedGuest = await updateGuest(supabase, editingGuestId, guestDraft);
        setGuests((current) =>
          current.map((guest) =>
            guest.id === editingGuestId ? updatedGuest : guest,
          ),
        );
        setEditingGuestId(null);
      } else {
        const guest = await createGuest(supabase, {
          ...guestDraft,
          eventId,
        });
        setGuests((current) => [guest, ...current]);
      }

      setGuestDraft({
        email: "",
        name: "",
        phone: "",
        plusOnes: 0,
        rsvpStatus: "pending",
      });
      setMessage("Guest list updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save guest.");
    }
  }

  async function removeGuest(guestId: string) {
    try {
      const supabase = createBrowserSupabaseClient();
      await deleteGuest(supabase, guestId);
      setGuests((current) => current.filter((guest) => guest.id !== guestId));
      setMessage("Guest removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete guest.");
    }
  }

  function editGuest(guest: GuestRow) {
    setEditingGuestId(guest.id);
    setGuestDraft({
      email: guest.email ?? "",
      name: guest.name,
      phone: guest.phone ?? "",
      plusOnes: guest.plus_ones,
      rsvpStatus: guest.rsvp_status,
    });
  }

  if (message && !event) {
    return (
      <div className="mx-auto max-w-7xl rounded-lg border ui-border ui-surface p-6">
        <p className="text-sm font-semibold ui-muted">{message}</p>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const canonical=profileFromEvent(event);
  const understanding=understandEvent(canonical);
  const canDelete=['draft','planning'].includes(event.status)&&!quotes.length&&!bookings.length&&!hasConcierge;
  return (
    <div className="mx-auto max-w-7xl">
      <ConciergeLeads eventId={eventId}/>
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B88A1D]">
            Event Hub
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            {event.title}
          </h1>
          <p className="mt-4 text-lg ui-muted">
            {event.event_type} - {formatDate(event.date)} -{" "}
            {event.guest_count != null ? `${event.guest_count} guests` : "Guest count to confirm"}
          </p>
          <p className="mt-2 text-sm ui-muted">{event.address || canonical.planning?.location || "Location to confirm"} · {event.start_time ? formatTime(event.start_time) : "Time to confirm"}{event.end_time ? ` – ${formatTime(event.end_time)}` : ""}</p>
        </div>
        <Link
          href={buildMarketplaceHrefForEvent(event)}
          className="rounded-full bg-[#0D1321] px-5 py-3 text-sm font-semibold text-white"
        >
          Browse vendors
        </Link>
      </div>

      {message ? (
        <p className="mt-6 rounded-lg border ui-border ui-surface px-4 py-3 text-sm font-semibold ui-muted">
          {message}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3"><Link className="hub-button" href="/account">All account events</Link>{!['cancelled','completed'].includes(event.status)&&<Link className="hub-primary" href={`/discover?eventId=${event.id}`}>Continue planning</Link>}<AskArivvioButton /></div>
      <div className="mt-6"><EventPlanSnapshot name={event.title} date={event.date ? formatDate(event.date) : canonical.dateHint || "Date to confirm"} guests={event.guest_count ? `${canonical.approximateGuests ? "About " : ""}${event.guest_count}` : "To confirm"} budget={formatMoney(event.budget_max)} services={canonical.requestedServices} atmosphere={atmosphereForEvent(canonical.recognition)} /></div>
      <section className="next-planning-step mt-6"><p className="eyebrow">Your next step</p><h2 className="mt-2 text-xl font-semibold">{understanding.readiness}</h2><p className="mt-3">{understanding.nextBestQuestion?.question ?? "Review your vendor responses and schedule."}</p>{!['cancelled','completed'].includes(event.status)&&<Link className="hub-primary mt-4" href={`/discover?eventId=${event.id}`}>Continue planning</Link>}</section>
      <section className="mt-7"><h2 className="mb-4 text-2xl font-semibold">Schedule</h2>{canonical.planning&&<EventPartsSummary stages={canonical.stages} defaults={canonical.planning}/>}</section>
      <h2 className="mt-8 text-2xl font-semibold">Your event team</h2>
      <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.4fr_0.8fr]">
        <Panel title="Quote cart">
          {cartItems.length ? (
            cartItems.map((item) => (
              <Row
                key={item.id}
                title={`${item.item_type} - ${formatMoney(item.estimated_price)}`}
                detail={`${formatTime(item.start_time)} to ${formatTime(item.end_time)} - ${item.status}`}
              />
            ))
          ) : (
            <Empty text="Your shortlist starts with a provider you like. Browse vendors to begin." />
          )}
        </Panel>
        <Panel title="Quote requests">
          {quotes.length ? (
            quotes.map(quote=><CloudQuoteCard key={quote.id} quote={quote} eventName={event.title} booking={bookings.find(b=>b.quote_request_id===quote.id)}/>)
          ) : (
            <Empty text="No quote requests yet. Add providers to the cart, then request quotes." />
          )}
        </Panel>
        <Panel title="Bookings">
          {bookings.length ? (
            bookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/bookings/${booking.id}`}
                className="block rounded-lg border ui-border p-4 text-sm transition hover:border-[#0D1321]"
              >
                <p className="font-semibold ui-text">
                  {formatMoney(booking.final_price)} - {booking.booking_status}
                </p>
                <p className="mt-1 ui-muted">
                  No payment collected. Payments are not connected.
                </p>
              </Link>
            ))
          ) : (
            <Empty text="No confirmed vendors yet." />
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Add guest"><p className="mb-4 text-sm ui-muted">Only add guest contact information you are authorized to use. Email and phone are optional. Avoid children’s contact details and personal identifiers.</p>
          <div className="grid gap-3">
            <GuestInput
              label="Name"
              value={guestDraft.name}
              onChange={(value) => setGuestDraft({ ...guestDraft, name: value })}
            />
            <GuestInput
              label="Email"
              value={guestDraft.email ?? ""}
              onChange={(value) => setGuestDraft({ ...guestDraft, email: value })}
            />
            <GuestInput
              label="Phone"
              value={guestDraft.phone ?? ""}
              onChange={(value) => setGuestDraft({ ...guestDraft, phone: value })}
            />
            <GuestInput
              label="Plus ones"
              type="number"
              value={String(guestDraft.plusOnes)}
              onChange={(value) =>
                setGuestDraft({ ...guestDraft, plusOnes: Number(value) })
              }
            />
            <label className="grid gap-2 text-sm font-semibold ui-text">
              RSVP
              <select
                value={guestDraft.rsvpStatus}
                onChange={(changeEvent) =>
                  setGuestDraft({
                    ...guestDraft,
                    rsvpStatus: changeEvent.target.value as RsvpStatus,
                  })
                }
                className="hub-input"
              >
                <option value="pending">Pending</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="maybe">Maybe</option>
              </select>
            </label>
            <button
              type="button"
              onClick={saveGuest}
              className="h-11 rounded-full bg-[#0D1321] px-4 text-sm font-semibold text-white"
            >
              {editingGuestId ? "Save guest" : "Add guest"}
            </button>
          </div>
        </Panel>
        <Panel title="Guest list">
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric label="Yes" value={String(guests.filter((guest) => guest.rsvp_status === "yes").length)} />
            <Metric label="Pending" value={String(guests.filter((guest) => guest.rsvp_status === "pending").length)} />
            <Metric label="Maybe" value={String(guests.filter((guest) => guest.rsvp_status === "maybe").length)} />
            <Metric label="No" value={String(guests.filter((guest) => guest.rsvp_status === "no").length)} />
          </div>
          {guests.length ? (
            guests.map((guest) => (
              <div key={guest.id} className="rounded-lg border ui-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold ui-text">{guest.name}</p>
                    <p className="mt-1 break-words text-sm ui-muted">
                      {guest.email ?? "No email"} - {guest.phone ?? "No phone"}
                    </p>
                    <p className="mt-1 break-words text-sm ui-muted">
                      RSVP {guest.rsvp_status} - plus ones {guest.plus_ones}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editGuest(guest)}
                      className="rounded-full bg-[#0D1321] px-3 py-1 text-xs font-semibold text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGuest(guest.id)}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <Empty text="No guests added yet." />
          )}
        </Panel>
      </div>
      <section className="hub-card mt-6 p-6"><h2 className="text-2xl font-semibold">Budget</h2><p className="mt-3">Planning budget: {formatMoney(event.budget_max)}</p><p className="mt-2 text-sm ui-muted">Recorded bookings: {formatMoney(bookings.reduce((sum,b)=>sum+Number(b.final_price),0))}. Quotes remain estimates until agreed. Payments are not connected.</p></section>
      <details className="hub-card mt-6 p-6"><summary className="cursor-pointer text-xl font-semibold">Event details</summary><dl className="planner-facts mt-4">{[["Occasion",canonical.recognition.identity.selectedDisplayEvent],["Culture",canonical.cultures.join(", ")||"Not specified"],["Preferences",canonical.preferences.map(p=>p.label).join(", ")||"None selected"],["Venue",canonical.venueRequired?"Still looking":"Venue arranged or not needed"],["Planning notes",canonical.plannerIntent.rawText]].map(([label,value])=><div key={label}><dt className="ui-muted">{label}</dt><dd>{value}</dd></div>)}</dl></details>
      {!['cancelled','completed'].includes(event.status)&&<button className="hub-button mt-6 text-red-700 dark:text-red-300" onClick={()=>setConfirmRemoval(true)}>{canDelete?'Delete draft event':'Cancel event'}</button>}
      {confirmRemoval&&<CustomerDialog title={canDelete?'Delete draft event':'Cancel event'} onClose={()=>{if(!removing)setConfirmRemoval(false);}}><h2 className="text-xl font-semibold">{canDelete?'Delete':'Cancel'} “{event.title}”?</h2><p className="my-4 text-sm ui-muted">{canDelete?'This permanently removes this account draft and its guest/cart records.':'This preserves requests, bookings, messages and guest history. It does not cancel provider agreements or payments. Contact your providers to arrange any cancellation.'}</p><button className="hub-button" disabled={removing} onClick={()=>setConfirmRemoval(false)}>Keep event</button><button className="ml-3 rounded-xl bg-red-700 px-4 py-3 text-white" disabled={removing} onClick={async()=>{setRemoving(true);try{await removeCloudEvent(createBrowserSupabaseClient(),event.id,canDelete?'delete':'cancel');router.push('/account');}catch(e){setMessage(e instanceof Error?e.message:'Unable to change event.');setConfirmRemoval(false);}finally{setRemoving(false);}}}>{removing?'Saving…':canDelete?'Confirm deletion':'Confirm cancellation'}</button></CustomerDialog>}

    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border ui-border ui-surface p-5">
      <p className="text-sm ui-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold ui-text">{value}</p>
    </div>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-lg border ui-border ui-surface p-6">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

function Row({ detail, title }: { detail: string; title: string }) {
  return (
    <div className="rounded-lg border ui-border p-4 text-sm">
      <p className="font-semibold ui-text">{title}</p>
      <p className="mt-1 ui-muted">{detail}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed ui-border p-5 text-sm ui-muted">
      {text}
    </p>
  );
}

function GuestInput({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold ui-text">
      {label}
      <input
        type={type}
        value={value}
        onChange={(inputEvent) => onChange(inputEvent.target.value)}
        className="hub-input"
      />
    </label>
  );
}
