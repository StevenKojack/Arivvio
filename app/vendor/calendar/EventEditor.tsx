'use client';

import { useEffect, useRef, useState } from 'react';
import { shiftDate, statuses, type ManualEvent } from '@/lib/vendor-calendar/model';
import { EventClientPicker } from './EventClientPicker';
import type { VendorServiceRow } from '@/lib/repositories/vendorsRepository';

export function EventEditor({ initial: draft, onChange, onCancel, onSave, services, warnings }: {
  initial: ManualEvent;
  onChange: (draft: ManualEvent) => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  services: VendorServiceRow[];
  warnings: string[];
}) {
  const [busy, setBusy] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const zones = Array.from(new Set(['UTC', ...Intl.supportedValuesOf('timeZone'), draft.timezone].filter(Boolean)));
  const overnight = draft.end_date !== draft.date;

  useEffect(() => { heading.current?.focus(); }, []);

  function change(patch: Partial<ManualEvent>) {
    onChange({ ...draft, ...patch });
  }

  return (
    <form aria-label="External event editor" className="space-y-4 rounded-xl border ui-border ui-surface p-4 sm:p-6" onSubmit={async event => {
      event.preventDefault();
      if (busy || creatingClient) return;
      setError('');
      if (!overnight && draft.end_time.slice(0, 5) <= draft.start_time.slice(0, 5)) {
        setError('End time must follow start time. Select Ends next day for an overnight event.');
        return;
      }
      setBusy(true);
      try { await onSave(); }
      catch (err) { setError(err instanceof Error ? err.message : 'Unable to save event.'); }
      finally { setBusy(false); }
    }}>
      <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold">{draft.version ? 'Edit event details' : 'Add external event'}</h2>
      <fieldset className="space-y-4" disabled={busy || creatingClient}>
        <label className="grid gap-1">Event name
          <input required maxLength={200} className="hub-input" value={draft.name} onChange={event => change({ name: event.target.value })}/>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">Event type
            <input className="hub-input" value={draft.event_type} maxLength={200} onChange={event => change({ event_type: event.target.value })}/>
          </label>
          <label className="grid gap-1">Associated service
            <select className="hub-input" value={draft.service_id ?? ''} onChange={event => change({ service_id: event.target.value || null })}>
              <option value="">No service selected</option>
              {services.map(service => <option key={service.id} value={service.id}>{service.service_name}{service.active ? '' : ' (inactive)'}</option>)}
            </select>
          </label>
          <label className="grid gap-1">Date
            <input required type="date" className="hub-input" value={draft.date} onChange={event => {
              const date = event.target.value;
              change({ date, end_date: overnight && date ? shiftDate(date, 1) : date });
            }}/>
          </label>
          <label className="grid gap-1">Status
            <select className="hub-input" value={draft.status} onChange={event => change({ status: event.target.value as ManualEvent['status'] })}>
              {statuses.map(status => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label className="grid gap-1">Start time
            <input required type="time" className="hub-input" value={draft.start_time.slice(0, 5)} onChange={event => change({ start_time: event.target.value })}/>
          </label>
          <label className="grid gap-1">End time
            <input required type="time" className="hub-input" value={draft.end_time.slice(0, 5)} onChange={event => change({ end_time: event.target.value })}/>
          </label>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={overnight} disabled={!draft.date} onChange={event => change({ end_date: event.target.checked ? shiftDate(draft.date, 1) : draft.date })}/>
          Ends next day{overnight ? ' (' + draft.end_date + ')' : ''}
        </label>
        <label className="grid gap-1">Event timezone
          <select required className="hub-input" value={draft.timezone} onChange={event => change({ timezone: event.target.value })}>
            <option value="">Choose the local timezone</option>
            {zones.map(zone => <option key={zone}>{zone}</option>)}
          </select>
        </label>
        <p className="text-xs ui-muted">Events can last up to 24 hours. Repeated daylight-saving hours use the standard-time occurrence.</p>
        <EventClientPicker business={draft.vendor_id} value={draft.client_id ?? null} disabled={busy}
          onWorking={setCreatingClient} onChange={client_id => change({ client_id })}/>
        {!draft.version && (
          <details>
            <summary className="cursor-pointer py-2 font-semibold">Client & location</summary>
            <div className="grid gap-3 pt-3 sm:grid-cols-2">
              <label className="grid gap-1">Client name<input className="hub-input" maxLength={200} value={draft.client_name} onChange={event => change({ client_name: event.target.value })}/></label>
              <label className="grid gap-1">Private contact details<input className="hub-input" maxLength={500} value={draft.client_contact} onChange={event => change({ client_contact: event.target.value })}/></label>
              <label className="grid gap-1 sm:col-span-2">Location<input className="hub-input" maxLength={1000} value={draft.location} onChange={event => change({ location: event.target.value })}/></label>
              <label className="grid gap-1 sm:col-span-2">Private notes<textarea rows={4} maxLength={10000} className="hub-input" value={draft.notes} onChange={event => change({ notes: event.target.value })}/></label>
            </div>
          </details>
        )}
      </fieldset>
      {warnings.map(warning => <p key={warning} className="text-sm font-medium">{warning}</p>)}
      {error && <p role="alert" className="text-sm font-medium">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button className="hub-primary" disabled={busy || creatingClient}>{busy ? 'Saving…' : 'Save event'}</button>
        <button type="button" className="hub-button" disabled={busy || creatingClient} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
