'use client';

import { RequestedPackage } from "@/app/components/RequestedPackage";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BusinessWorkspace } from '../BusinessWorkspace';
import { PrivateOperationEditor } from '../PrivateOperationEditor';
import { loadCalendar } from '@/lib/repositories/vendorCalendarRepository';
import { formatMoney } from '@/lib/utils/format';
import { timeRange } from '@/lib/vendor-calendar/operations';
import { vendorBookingLink, vendorCalendarLink, vendorRequestLink } from '@/lib/vendor-calendar/links';
import { submittedQuote } from '@/lib/vendor-operations/model';

export function VendorBookings({ business, booking }: { business?: string; booking?: string }) {
  return <BusinessWorkspace title="Booking operations" initial={business} path="/vendor/bookings" readOnly>
    {(id, canEdit) => <BookingWorkspace key={id} business={id} initial={id === business ? booking : undefined} canEdit={canEdit}/>}
  </BusinessWorkspace>;
}

function BookingWorkspace({ business, initial, canEdit }: { business: string; initial?: string; canEdit: boolean }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadCalendar>>>();
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(initial ?? '');
  const detail = useRef<HTMLElement>(null);
  useEffect(() => {
    let active = true;
    loadCalendar(business).then(result => { if (active) setData(result); })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [business]);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Loading bookings…</p>;
  const booking = data.bookings.find(row => row.id === selected);
  const row = data.inbox.find(item => item.booking_id === selected && item.booking?.vendor_id === business);
  const entries = data.entries.filter(entry => entry.source === 'ARIVVIO');
  const entry = entries.find(item => item.id === selected);
  const quote = row ? submittedQuote(row) : null;

  return <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
    <section className="space-y-2 rounded-xl border ui-border ui-surface p-4">
      <h2 className="font-semibold">Recorded bookings</h2>
      {!entries.length && <p className="text-sm ui-muted">No bookings for this business yet.</p>}
      <ul className="max-h-96 space-y-2 overflow-y-auto">{entries.map(item => <li key={item.id}>
        <button type="button" className="w-full break-words rounded-lg border ui-border p-3 text-left"
          aria-pressed={item.id === selected} onClick={() => {
            setSelected(item.id);
            window.history.replaceState(null, '', vendorBookingLink(business, item.id));
            detail.current?.focus();
          }}>
          <span className="block font-medium">{item.name}</span>
          <span className="text-sm capitalize ui-muted">{item.date ?? 'Date not recorded'} · {item.status}</span>
        </button>
      </li>)}</ul>
    </section>
    <section ref={detail} tabIndex={-1} aria-label="Booking details" className="min-w-0 space-y-4 rounded-xl border ui-border ui-surface p-4 sm:p-5">
      {booking && entry ? <>
        <header><p className="text-sm ui-muted">ARIVVIO booking</p><h2 className="break-words text-xl font-semibold">{entry.name}</h2></header>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="ui-muted">Booking status</dt><dd className="capitalize">{booking.booking_status ?? 'Not recorded'}</dd></div>
          <div><dt className="ui-muted">Service</dt><dd>{entry.service || 'Not recorded'}</dd></div>
          <div><dt className="ui-muted">Event date and time</dt><dd>{timeRange(entry)}</dd></div>
          <div><dt className="ui-muted">Event type</dt><dd>{entry.eventType || 'Not recorded'}</dd></div>
          <div><dt className="ui-muted">Event city</dt><dd>{entry.location || 'Not recorded'}</dd></div>
          <div><dt className="ui-muted">Guest count</dt><dd>{row?.context.guest_count ?? 'Not recorded'}</dd></div>
          <div><dt className="ui-muted">Submitted quote</dt><dd>{quote == null ? 'Not recorded' : formatMoney(quote)}</dd></div>
          <div><dt className="ui-muted">Final recorded price</dt><dd>{booking.final_price == null ? 'Not recorded' : formatMoney(booking.final_price)}</dd></div>
          <div><dt className="ui-muted">Recorded payment status</dt><dd className="capitalize">{booking.payment_status?.replaceAll('_', ' ') ?? 'Not recorded'}</dd></div>
        </dl>
        {row?.quote.package_snapshot && <RequestedPackage item={row.quote.package_snapshot} historical/>}
        <div className="flex flex-wrap gap-2">
          {canEdit && <Link className="hub-button" href={vendorCalendarLink(business, { event: 'ARIVVIO:' + booking.id })}>Open calendar entry</Link>}
          {booking.quote_request_id && <Link className="hub-button" href={vendorRequestLink(business, booking.quote_request_id)}>Open request</Link>}
          <Link className="hub-button" href={'/bookings/' + booking.id}>Shared booking and notes</Link>
        </div>
        {canEdit && <PrivateOperationEditor key={booking.id} business={business} service={row?.quote.service_id} source={{ column: 'booking_id', id: booking.id }}/>}
      </> : <p className="text-sm ui-muted">{selected ? 'This booking is unavailable for the selected business.' : 'Select a booking to see details and preparation.'}</p>}
    </section>
  </div>;
}
