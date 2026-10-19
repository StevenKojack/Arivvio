"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getBookingById,
  updateBookingNotes,
  type BookingRow,
} from "@/lib/repositories/bookingsRepository";
import { getCurrentProfile } from "@/lib/repositories/profilesRepository";
import {
  createBrowserSupabaseClient,
  hasSupabaseConfig,
} from "@/lib/supabase/client";
import { formatMoney, formatDate } from "@/lib/utils/format";
import { RequestThread } from "@/app/components/RequestThread";
export function BookingDetail({ bookingId }: { bookingId: string }) {
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (!hasSupabaseConfig())
          throw new Error("Account bookings are unavailable here.");
        const client = createBrowserSupabaseClient();
        const {
          data: { user },
        } = await client.auth.getUser();
        if (!user) throw new Error("Sign in to open this booking.");
        const [row, profile] = await Promise.all([
          getBookingById(client, bookingId),
          getCurrentProfile(client, user),
        ]);
        if (active) {
          setBooking(row);
          setNote(
            (profile?.id === row.planner_id
              ? row.planner_notes
              : row.vendor_notes) ?? "",
          );
        }
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Booking unavailable.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const client = hasSupabaseConfig() ? createBrowserSupabaseClient() : null;
    const subscription = client?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        active = false;
        setBooking(null);
        setNote("");
        setError("Sign in to open this booking.");
      }
    }).data.subscription;
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [bookingId]);
  if (loading) return <p role="status">Loading booking…</p>;
  if (!booking)
    return (
      <div className="hub-card p-6">
        <p role="alert" className="mb-4">
          {error || "Booking unavailable."}
        </p>
        <Link
          className="hub-primary"
          href={`/auth/login?next=${encodeURIComponent(`/bookings/${bookingId}`)}`}
        >
          Sign in
        </Link>
      </div>
    );
  async function save() {
    setBusy(true);
    setError("");
    try {
      const row = await updateBookingNotes(
        createBrowserSupabaseClient(),
        bookingId,
        note,
      );
      setBooking(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save your note.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="hub-card p-6">
        <p className="eyebrow">Booking record</p>
        <h1 className="mt-3 text-3xl font-semibold">
          {formatMoney(booking.final_price)} ·{" "}
          {booking.booking_status === "confirmed"
            ? "Booked"
            : booking.booking_status}
        </h1>
        <p className="mt-3 text-sm ui-muted">
          No payment collected through ARIVVIO. Payments are not connected. Any
          separate provider agreement may still apply.
        </p>
        <p className="mt-3 break-all text-xs ui-muted">
          Booking {booking.id} · Created{" "}
          {formatDate(booking.created_at.slice(0, 10))}
        </p>
      </section>
      {booking.quote_request_id ? (
        <RequestThread
          key={booking.quote_request_id}
          requestId={booking.quote_request_id}
        />
      ) : (
        <p className="hub-card p-5 ui-muted">
          This earlier booking has no linked request conversation.
        </p>
      )}
      <section className="hub-card p-6">
        <h2 className="text-xl font-semibold">Booking notes</h2>
        <p className="mt-2 text-sm ui-muted">
          Notes are shared with the other participant. You can edit your own
          note.
        </p>
        {booking.planner_notes && (
          <p className="mt-4 whitespace-pre-wrap break-words text-sm">
            Customer: {booking.planner_notes}
          </p>
        )}
        {booking.vendor_notes && (
          <p className="mt-3 whitespace-pre-wrap break-words text-sm">
            Provider: {booking.vendor_notes}
          </p>
        )}
        <label className="mt-4 grid gap-2 text-sm font-semibold">
          Your note
          <textarea
            className="min-h-24 rounded-xl border ui-border ui-surface p-3 font-normal"
            maxLength={4000}
            value={note}
            disabled={busy}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button
          className="hub-button mt-4"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? "Saving…" : "Save your note"}
        </button>
        {error && (
          <p role="alert" className="mt-4">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
