'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { EventChanges } from '@/lib/repositories/vendorCalendarRepository';
import { statuses, type CalendarEntry, type ManualEvent } from '@/lib/vendor-calendar/model';
import { reviewLabels, timeRange, type ScheduleReview } from '@/lib/vendor-calendar/operations';

const clientFields = [
  { key: 'client_name', label: 'Client name', max: 200 },
  { key: 'client_contact', label: 'Private contact details', max: 500 },
  { key: 'location', label: 'Location', max: 1000 },
  { key: 'notes', label: 'Private notes', max: 10000 },
] as const;
type ClientFields = Pick<ManualEvent, typeof clientFields[number]['key']>;
type Edit = { type: 'client'; fields: ClientFields } | { type: 'task'; index: number; title: string };

export function EventDetails({ entry, business, reviews, availabilityHref, busy, onDirty, onClose, onEdit, onOpen, onSave }: {
  entry: CalendarEntry;
  business: string;
  reviews: ScheduleReview[];
  availabilityHref: string;
  busy: boolean;
  onDirty: (dirty: boolean) => void;
  onClose: () => void;
  onEdit: (event: ManualEvent) => void;
  onOpen: (event: CalendarEntry) => void;
  onSave: (event: ManualEvent, changes: EventChanges) => Promise<void>;
}) {
  const [edit, setEdit] = useState<Edit | null>(null);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const manual = entry.manual;
  const tasks = manual?.tasks ?? [];
  const completed = tasks.filter(task => task.done).length;

  useEffect(() => {
    heading.current?.focus();
  }, []);

  function startEdit(next: Edit | null) {
    setEdit(next);
    setError('');
    onDirty(!!next);
  }

  async function save(changes: EventChanges) {
    if (!manual || busy) return;
    setError('');
    try {
      await onSave(manual, changes);
      startEdit(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save event changes.');
    }
  }

  return (
    <section aria-label="Event workspace" aria-busy={busy} className="space-y-5 rounded-2xl border ui-border ui-surface p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm ui-muted">{business}</p>
          <h2 ref={heading} tabIndex={-1} className="break-words text-2xl font-semibold">{entry.name}</h2>
          <p className="mt-1 text-sm">{timeRange(entry)} · {entry.source}</p>
        </div>
        <button type="button" className="hub-button" onClick={onClose} disabled={busy}>Close event</button>
      </header>

      {error && <p role="alert" className="rounded-lg border ui-border p-3 text-sm">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="min-w-0 space-y-3 rounded-xl border ui-border p-4">
          <h3 className="font-semibold">Overview</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="ui-muted">Event type</dt><dd className="break-words">{manual?.event_type || entry.eventType || 'Not specified'}</dd></div>
            <div><dt className="ui-muted">Service</dt><dd className="break-words">{entry.service || 'Not specified'}</dd></div>
            {manual && <div><dt className="ui-muted">Preparation</dt><dd>{completed} of {tasks.length} complete</dd></div>}
          </dl>
          {manual ? (
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1 text-sm">
                Status
                <select className="hub-input" value={manual.status} disabled={busy || !!edit}
                  onChange={event => void save({ status: event.target.value as ManualEvent['status'] })}>
                  {statuses.map(status => <option key={status}>{status}</option>)}
                </select>
              </label>
              <button type="button" className="hub-button" disabled={busy || !!edit} onClick={() => onEdit(manual)}>Edit event details</button>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="capitalize">Status · {entry.status}</p>
              <Link className="hub-button inline-flex" href={'/bookings/' + entry.id}>Open ARIVVIO booking</Link>
            </div>
          )}
        </section>

        <section className="min-w-0 space-y-3 rounded-xl border ui-border p-4">
          <h3 className="font-semibold">{manual ? 'Client & location' : 'Location & vendor notes'}</h3>
          {edit?.type === 'client' ? (
            <form className="space-y-3" onSubmit={event => { event.preventDefault(); void save(edit.fields); }}>
              {clientFields.map(({ key, label, max }) => (
                <label className="grid gap-1 text-sm" key={key}>{label}
                  {key === 'notes' ? (
                    <textarea className="hub-input w-full" rows={4} maxLength={max} disabled={busy} value={edit.fields[key]}
                      onChange={event => setEdit({ ...edit, fields: { ...edit.fields, [key]: event.target.value } })}/>
                  ) : (
                    <input className="hub-input w-full" maxLength={max} disabled={busy} value={edit.fields[key]}
                      onChange={event => setEdit({ ...edit, fields: { ...edit.fields, [key]: event.target.value } })}/>
                  )}
                </label>
              ))}
              <div className="flex flex-wrap gap-2">
                <button className="hub-primary" disabled={busy}>Save client details</button>
                <button type="button" className="hub-button" disabled={busy} onClick={() => startEdit(null)}>Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <dl className="space-y-2 text-sm">
                {manual && clientFields.slice(0, 2).map(({ key, label }) => (
                  <div key={key}><dt className="ui-muted">{label}</dt><dd className="break-words">{manual[key] || 'Not added'}</dd></div>
                ))}
                <div><dt className="ui-muted">Location</dt><dd className="break-words">{entry.location || 'Not added'}</dd></div>
                <div><dt className="ui-muted">{manual ? 'Private notes' : 'Vendor notes'}</dt><dd className="whitespace-pre-wrap break-words">{entry.notes || 'Not added'}</dd></div>
              </dl>
              {manual && <button type="button" className="hub-button" disabled={busy || !!edit} onClick={() => startEdit({
                type: 'client', fields: { client_name: manual.client_name, client_contact: manual.client_contact, location: manual.location, notes: manual.notes },
              })}>Edit client details</button>}
            </>
          )}
        </section>
      </div>

      {manual && (
        <section className="space-y-3 rounded-xl border ui-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">Preparation</h3>
            <p className="text-sm ui-muted" aria-live="polite">{completed} of {tasks.length} complete</p>
          </div>
          {tasks.length ? (
            <ul className="divide-y ui-border">
              {tasks.map((task, index) => (
                <li key={index} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <label className="flex min-w-0 items-start gap-2 py-1 text-sm">
                    <input type="checkbox" className="mt-1 size-4 shrink-0" checked={task.done} disabled={busy || !!edit}
                      onChange={event => void save({ tasks: tasks.map((item, i) => i === index ? { ...item, done: event.target.checked } : item) })}/>
                    <span className={task.done ? 'break-words line-through ui-muted' : 'break-words'}>{task.title}</span>
                  </label>
                  <div className="flex gap-3 text-sm">
                    <button type="button" className="py-2 underline" aria-label={'Edit ' + task.title} disabled={busy || !!edit}
                      onClick={() => startEdit({ type: 'task', index, title: task.title })}>Edit</button>
                    <button type="button" className="py-2 underline" aria-label={'Remove ' + task.title} disabled={busy || !!edit}
                      onClick={() => { if (window.confirm('Remove this preparation task?')) void save({ tasks: tasks.filter((_, i) => i !== index) }); }}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm ui-muted">No preparation tasks yet.</p>}
          {edit?.type === 'task' ? (
            <form className="space-y-2" onSubmit={event => {
              event.preventDefault();
              const title = edit.title.trim();
              if (!title) return;
              const next = edit.index === -1 ? [...tasks, { title, done: false }]
                : tasks.map((task, i) => i === edit.index ? { ...task, title } : task);
              void save({ tasks: next });
            }}>
              <label className="grid gap-1 text-sm">Task wording
                <input className="hub-input w-full" required maxLength={300} disabled={busy} value={edit.title}
                  onChange={event => setEdit({ ...edit, title: event.target.value })}/>
              </label>
              <div className="flex flex-wrap gap-2">
                <button className="hub-primary" disabled={busy || !edit.title.trim()}>{edit.index === -1 ? 'Add task' : 'Save task'}</button>
                <button type="button" className="hub-button" disabled={busy} onClick={() => startEdit(null)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button type="button" className="hub-button" disabled={busy || !!edit || tasks.length >= 100}
              onClick={() => startEdit({ type: 'task', index: -1, title: '' })}>Add preparation task</button>
          )}
        </section>
      )}

      <section className="space-y-3 rounded-xl border ui-border p-4">
        <h3 className="font-semibold">Schedule</h3>
        <p className="text-sm">{timeRange(entry)}{entry.timezone ? ' · ' + entry.timezone : ' · Timezone not recorded'}</p>
        {reviews.length ? (
          <ul className="space-y-3">
            {reviews.map(review => (
              <li key={review.key} className="rounded-lg border ui-border p-3 text-sm">
                <p className="font-semibold">{reviewLabels[review.kind]}</p>
                <p className="break-words">{review.message}</p>
                {review.event && <button type="button" className="mt-2 underline" disabled={busy} onClick={() => onOpen(review.event!)}>Inspect {review.event.name}</button>}
                {review.availability && <Link className="mt-2 inline-block underline" href={availabilityHref}
                  onClick={event => { if (busy || (edit && !window.confirm('Discard unsaved event changes?'))) event.preventDefault(); }}>Review business availability</Link>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm ui-muted">{entry.status.toLowerCase() === 'cancelled' ? 'Cancelled events are excluded from conflict checks.' : 'No overlap found in recorded times. This does not confirm availability.'}</p>}
      </section>
    </section>
  );
}
