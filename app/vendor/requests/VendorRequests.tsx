'use client';

import { RequestedPackage } from "@/app/components/RequestedPackage";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BusinessWorkspace } from '../BusinessWorkspace';
import { getRequestInbox, type RequestInboxItem } from '@/lib/repositories/messagesRepository';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { requestStages, vendorRequestLabel, vendorRequestsForBranch, vendorRequestStage } from '@/lib/requests/vendor-workspace';
import { PrivateOperationEditor } from '../PrivateOperationEditor';
import { loadCalendar } from '@/lib/repositories/vendorCalendarRepository';
import { reviewLabels, scheduleReviews } from '@/lib/vendor-calendar/operations';
import { bookingEntry } from '@/lib/vendor-calendar/model';
import { requestSchedule, submittedQuote } from '@/lib/vendor-operations/model';
import { vendorBookingLink, vendorCalendarLink } from '@/lib/vendor-calendar/links';
import { formatMoney } from '@/lib/utils/format';

export function VendorRequests({ business, request, initialStage }: { business?: string; request?: string; initialStage?: (typeof requestStages)[number] }) {
  return <BusinessWorkspace title="Requests & bookings" initial={business} path="/vendor/requests" readOnly>
    {(id, canEdit) => <RequestOverview key={id} business={id} request={id === business ? request : undefined} initialStage={initialStage} canEdit={canEdit}/>}
  </BusinessWorkspace>;
}

function RequestOverview({ business, request, initialStage, canEdit }: { business: string; request?: string; canEdit: boolean; initialStage?: (typeof requestStages)[number] }) {
  const [rows, setRows] = useState<RequestInboxItem[]>();
  const [error, setError] = useState('');
  const [stage, setStage] = useState<(typeof requestStages)[number] | ''>(initialStage ?? '');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    getRequestInbox(createBrowserSupabaseClient(), 'vendor')
      .then(inbox => { if (active) setRows(vendorRequestsForBranch(inbox, business)); })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [business, revision]);
  const visibleStages = stage ? [stage] : requestStages;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <label className="grid gap-1 text-sm">Request stage
        <select className="hub-input" value={stage} onChange={event => setStage(event.target.value as typeof stage)}>
          <option value="">All stages</option>
          {requestStages.map(label => <option key={label} value={label}>{label}</option>)}
        </select>
      </label>
      <button className="hub-button" onClick={() => { setRows(undefined); setError(''); setRevision(n => n + 1); }}>Refresh</button>
    </div>
    {error ? <p role="alert">{error}</p> : !rows ? <p role="status">Loading requests…</p> : visibleStages.map(label => {
      const group = rows.filter(row => vendorRequestStage(row) === label);
      return <section key={label} className="space-y-2">
        <h2 className="font-semibold">{label} <span className="text-sm ui-muted">· {group.length}</span></h2>
        {!group.length && <p className="text-sm ui-muted">No requests in this stage.</p>}
        {group.map(row => <RequestCard key={row.quote.id} row={row} business={business} canEdit={canEdit} initialOpen={row.quote.id === request}/>)}
      </section>;
    })}
  </div>;
}

function RequestCard({ row, business, canEdit, initialOpen }: {
  row: RequestInboxItem; business: string; canEdit: boolean; initialOpen: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const { context, quote, booking, booking_id: bookingId } = row;
  const amount = submittedQuote(row);
  const schedule = context.start_time && context.end_time
    ? context.start_time.slice(0, 5) + ' to ' + context.end_time.slice(0, 5)
    : context.start_time ? context.start_time.slice(0, 5) + ' · End time not recorded' : 'Time not recorded';

  return <details open={open} onToggle={event => setOpen(event.currentTarget.open)} className="rounded-xl border ui-border ui-surface p-4">
    <summary className="cursor-pointer break-words">
      <strong>{context.title || 'Event inquiry'}</strong>
      <span className="ml-2 text-sm capitalize ui-muted">{vendorRequestLabel(row)}</span>
      <span className="mt-1 block pl-4 text-sm ui-muted">{row.service_name} · {context.date ?? 'Date not recorded'}</span>
    </summary>
    {open && <>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="ui-muted">Event type</dt><dd>{context.event_type || 'Not recorded'}</dd></div>
      <div><dt className="ui-muted">Requested time</dt><dd>{schedule}</dd></div>
      <div><dt className="ui-muted">Guest count</dt><dd>{context.guest_count ?? 'Not recorded'}</dd></div>
      <div><dt className="ui-muted">Submitted quote</dt><dd>{amount != null ? formatMoney(amount) : 'Not recorded'}</dd></div>
      <div><dt className="ui-muted">Request status</dt><dd className="capitalize">{quote.status}{quote.quote_revision > 0 && ' · Revision ' + quote.quote_revision}</dd></div>
      <div><dt className="ui-muted">Booking</dt><dd className="capitalize">{booking?.booking_status ?? (bookingId ? 'Recorded' : 'Not recorded')}</dd></div>
    </dl>
    {quote.package_snapshot && <RequestedPackage item={quote.package_snapshot} historical/>}
    <div className="mt-4 flex flex-wrap gap-2">
      <Link className="hub-button" href={'/account/requests/' + quote.id}>Open existing conversation</Link>
      {bookingId && <Link className="hub-button" href={vendorBookingLink(business, bookingId)}>Open booking operations</Link>}
      {canEdit && bookingId && booking?.vendor_id === business && <Link className="hub-button"
        href={vendorCalendarLink(business, { event: 'ARIVVIO:' + bookingId })}>Open calendar entry</Link>}
    </div>
    {canEdit && <div className="mt-4 space-y-4">
      <RequestSchedule row={row} business={business}/>
      {quote.vendor_id === business && <PrivateOperationEditor business={business} source={{ column: 'request_id', id: quote.id }}/>}
    </div>}
    </>}
  </details>;
}


function RequestSchedule({ row, business }: { row: RequestInboxItem; business: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadCalendar>>>();
  const [failed, setFailed] = useState(false);
  const known = requestSchedule(row) !== null;
  useEffect(() => {
    if (!known) return;
    let active = true;
    loadCalendar(business).then(value => { if (active) setData(value); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [business, known]);

  // Reuse the existing calendar review with a provisional, non-persisted entry.
  const entry = bookingEntry({ id: row.booking_id ?? row.quote.id, booking_status: row.booking?.booking_status ?? 'pending', service_id: row.quote.service_id }, row.context, row.service_name);
  const reviews = data ? scheduleReviews(entry, data.entries, data.availability, data.scheduling) : [];
  return <section className="space-y-2 rounded-xl border ui-border p-4">
    <h2 className="font-semibold">Scheduling review</h2>
    {!known ? <p className="text-sm ui-muted">A complete date and time are needed to review scheduling.</p>
      : failed ? <p className="text-sm ui-muted">Calendar context is unavailable.</p>
      : !data ? <p role="status" className="text-sm ui-muted">Checking calendar…</p>
      : <ul className="space-y-2 text-sm">
        {reviews.map(review => <li key={review.key}>
          <strong>{reviewLabels[review.kind]}</strong>
          <p>{review.message}</p>
        </li>)}
        <li className="ui-muted">Scheduling review is advisory.</li>
      </ul>}
  </section>;
}
