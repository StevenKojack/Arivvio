"use client";

import { useEffect, useState } from "react";
import {
  getBookingById,
  updateBookingNotes,
  type BookingRow,
} from "@/lib/repositories/bookingsRepository";
import { createBrowserSupabaseClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { formatDate, formatMoney } from "@/lib/utils/format";

type TimelineItem = {
  at?: string;
  label?: string;
};

export function BookingDetail({ bookingId }: { bookingId: string }) {
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [plannerNotes, setPlannerNotes] = useState("");
  const [vendorNotes, setVendorNotes] = useState("");
  const [message, setMessage] = useState("Loading booking...");

  useEffect(() => {
    async function loadBooking() {
      if (!hasSupabaseConfig()) {
        setMessage("Supabase is not configured yet.");
        return;
      }

      try {
        const supabase = createBrowserSupabaseClient();
        const bookingRow = await getBookingById(supabase, bookingId);

        setBooking(bookingRow);
        setPlannerNotes(bookingRow.planner_notes ?? "");
        setVendorNotes(bookingRow.vendor_notes ?? "");
        setMessage("");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load booking.");
      }
    }

    loadBooking();
  }, [bookingId]);

  async function saveNotes() {
    if (!booking) {
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const updatedBooking = await updateBookingNotes(supabase, {
        bookingId: booking.id,
        plannerNotes,
        vendorNotes,
      });

      setBooking(updatedBooking);
      setMessage("Booking notes saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save notes.");
    }
  }

  if (message && !booking) {
    return (
      <div className="mx-auto max-w-7xl rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-sm font-semibold text-neutral-700">{message}</p>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  const timeline = Array.isArray(booking.booking_timeline)
    ? (booking.booking_timeline as TimelineItem[])
    : [];

  return (
    <div className="mx-auto max-w-7xl">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B88A1D]">
          Booking detail
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
          {formatMoney(booking.final_price)}
        </h1>
        <p className="mt-4 text-lg text-neutral-600">
          {booking.booking_status} - payment {booking.payment_status}
        </p>
      </div>

      {message ? (
        <p className="mt-6 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700">
          {message}
        </p>
      ) : null}

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        <Metric label="Deposit" value={formatMoney(booking.deposit_amount)} />
        <Metric label="Balance" value={formatMoney(booking.balance_due)} />
        <Metric label="Created" value={formatDate(booking.created_at.slice(0, 10))} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-2xl font-semibold tracking-tight">Notes</h2>
          <label className="mt-5 grid gap-2 text-sm font-semibold text-neutral-800">
            Planner notes
            <textarea
              value={plannerNotes}
              onChange={(event) => setPlannerNotes(event.target.value)}
              className="min-h-32 rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="mt-5 grid gap-2 text-sm font-semibold text-neutral-800">
            Vendor notes
            <textarea
              value={vendorNotes}
              onChange={(event) => setVendorNotes(event.target.value)}
              className="min-h-32 rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={saveNotes}
            className="mt-5 h-11 rounded-full bg-[#0D1321] px-5 text-sm font-semibold text-white"
          >
            Save notes
          </button>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-2xl font-semibold tracking-tight">Timeline</h2>
          <div className="mt-5 space-y-3">
            {timeline.length ? (
              timeline.map((item, index) => (
                <div key={`${item.at}-${index}`} className="rounded-lg border border-neutral-200 p-4">
                  <p className="font-semibold text-neutral-950">
                    {item.label ?? "Booking activity"}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {item.at ? new Date(item.at).toLocaleString() : "No timestamp"}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-neutral-300 p-5 text-sm text-neutral-600">
                Timeline activity will appear as booking changes are recorded.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
    </div>
  );
}
