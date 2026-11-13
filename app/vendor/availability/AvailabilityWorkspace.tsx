'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { BusinessWorkspace } from '../BusinessWorkspace';
import { loadCalendar } from '@/lib/repositories/vendorCalendarRepository';
import { removeDateException, saveDateException, saveServiceScheduling, saveWorkingHours } from '@/lib/repositories/vendorSchedulingRepository';
import { updateVendorVacationMode } from '@/lib/repositories/vendorsRepository';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { exceptionLabel, reviewLabels, scheduleReviews, timeRange, weekdays, entryKey, type WeeklyInterval } from '@/lib/vendor-calendar/operations';
import { shiftDate, todayIn } from '@/lib/vendor-calendar/model';
import type { PublicTableRow } from '@/lib/supabase/database.types';

type Data = Awaited<ReturnType<typeof loadCalendar>>;
type Exception = PublicTableRow<'vendor_availability'>;
type Section = 'Weekly hours' | 'Date exceptions' | 'Service capacity' | 'Scheduling review';
const sections: Section[] = ['Weekly hours', 'Date exceptions', 'Service capacity', 'Scheduling review'];
const days = [1, 2, 3, 4, 5, 6, 0];
const field = 'grid min-w-0 gap-1 text-sm';
const input = 'hub-input w-full min-w-0';
const supportedZones = ['UTC', ...Intl.supportedValuesOf('timeZone')];

export function AvailabilityWorkspace({ initial }: { initial?: string }) {
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  return <BusinessWorkspace initial={initial} title="Availability" path="/vendor/availability"
    beforeSwitch={() => {
      if (saving || (dirty && !window.confirm('Discard unsaved scheduling changes?'))) return false;
      setDirty(false);
      return true;
    }}>
    {business => <Settings key={business} business={business} setDirty={setDirty} dirty={dirty} busy={saving} setBusy={setSaving}/>}
  </BusinessWorkspace>;
}

function Settings({ business, dirty, setDirty, busy, setBusy }: { business: string; dirty: boolean; setDirty: (value: boolean) => void; busy: boolean; setBusy: (value: boolean) => void }) {
  const [data, setData] = useState<Data>();
  const [section, setSection] = useState<Section>('Weekly hours');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [exception, setException] = useState<Exception>();
  const [exceptionRevision, setExceptionRevision] = useState(0);
  const [service, setService] = useState('');
  const [date, setDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  useEffect(() => {
    let live = true;
    loadCalendar(business).then(result => {
      if (!live) return;
      setData(result);
      setDate(todayIn(result.scheduling.timezone ?? ''));
    }).catch(err => { if (live) setError(err.message); });
    return () => { live = false; };
  }, [business]);

  function switchEditor(action: () => void) {
    if (busy || (dirty && !window.confirm('Discard unsaved scheduling changes?'))) return;
    setDirty(false);
    setError('');
    setNotice('');
    action();
  }

  async function save(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setDirty(false);
      setNotice('Saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save scheduling settings.');
    } finally {
      setBusy(false);
    }
  }

  if (!data) return error ? <p role="alert">{error}</p> : <p role="status">Loading scheduling settings…</p>;
  const { scheduling } = data;
  const exceptions = data.availability.filter(row => row.date === date).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const serviceRule = scheduling.serviceRules.find(row => row.service_id === service);
  const event = data.entries.find(entry => entryKey(entry) === selectedEvent);
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="font-medium">{scheduling.timezone ?? 'Timezone not configured'}</p>
        <p className="text-sm ui-muted">{scheduling.weeklyHours === null ? 'Hours not configured' : scheduling.weeklyHours.length + ' weekly intervals'} · {data.availability.length} dated exceptions</p></div>
      <Link className="hub-button" href={'/vendor/calendar?business=' + business}>Open Calendar</Link>
    </div>
    <nav aria-label="Scheduling settings" className="flex flex-wrap gap-2">{sections.map(name => <button type="button" key={name}
      className="hub-button aria-pressed:ring-2" aria-pressed={section === name} onClick={() => name !== section && switchEditor(() => setSection(name))}>{name}</button>)}</nav>
    <section className="space-y-4 rounded-xl border ui-border ui-surface p-4">
      <h2 className="text-lg font-semibold">{section}</h2>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {section === 'Weekly hours' && <>
        <WeeklyEditor initial={scheduling} busy={busy} onDirty={() => setDirty(true)} onSave={(zone, hours) => void save(async () => {
          const saved = await saveWorkingHours(business, zone, hours, scheduling.hoursVersion);
          setData({ ...data, scheduling: { ...scheduling, timezone: saved.timezone, weeklyHours: saved.weekly_hours, hoursVersion: saved.version } });
        })}/>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t ui-border pt-3">
          <p className="text-sm">{data.vacation ? 'Vacation mode is on. This business is hidden from Marketplace.' : 'Vacation mode is off.'}</p>
          <button className="hub-button" type="button" disabled={busy || dirty} onClick={() => void save(async () => {
            const updated = await updateVendorVacationMode(createBrowserSupabaseClient(), { id: business, vacationMode: !data.vacation });
            setData({ ...data, vacation: updated.vacation_mode });
          })}>{data.vacation ? 'Turn vacation mode off' : 'Turn vacation mode on'}</button>
        </div>
      </>}
      {section === 'Date exceptions' && <>
        <p className="text-sm ui-muted">Extra hours extend the weekly schedule. Blocked and tentative windows remain visible when they overlap extra hours.</p>
        <label className={field}>Exception date<input className={input + ' max-w-xs'} type="date" value={date}
          onChange={e => { const value = e.target.value; switchEditor(() => { setDate(value); setException(undefined); }); }}/></label>
        {!!date && <ExceptionEditor key={date + ':' + (exception?.id ?? 'new') + ':' + exceptionRevision} date={date} row={exception} busy={busy} onDirty={() => setDirty(true)}
          onSave={fields => void save(async () => {
            const saved = await saveDateException(business, fields, exception);
            setData({ ...data, availability: [...data.availability.filter(row => row.id !== saved.id), saved] });
            setException(undefined);
            setExceptionRevision(value => value + 1);
          })}/>}
        {!exceptions.length && <p className="text-sm ui-muted">No exceptions start on this date.</p>}
        {exceptions.map(row => <div key={row.id} className="flex flex-wrap items-center gap-2 border-t ui-border pt-2">
          <span className="mr-auto text-sm">{exceptionLabel(row)}</span>
          <button type="button" className="hub-button" onClick={() => switchEditor(() => setException(row))}>Edit</button>
          <button type="button" className="hub-button" disabled={dirty || busy} onClick={() => {
            if (window.confirm('Remove this date exception?')) void save(async () => {
              await removeDateException(business, row);
              setData({ ...data, availability: data.availability.filter(item => item.id !== row.id) });
              if (exception?.id === row.id) setException(undefined);
            });
          }}>Remove</button>
        </div>)}
      </>}
      {section === 'Service capacity' && <>
        <label className={field}>Service<select className={input + ' max-w-md'} value={service}
          onChange={e => { const value = e.target.value; switchEditor(() => setService(value)); }}>
          <option value="">Choose a service</option>
          {data.services.map(row => <option value={row.id} key={row.id}>{row.service_name}{row.active ? '' : ' (inactive)'}</option>)}
        </select></label>
        {service && <form key={service} className="space-y-3" onChange={() => setDirty(true)} onSubmit={e => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          void save(async () => {
            const saved = await saveServiceScheduling(business, service, {
              capacity: form.get('capacity') ? Number(form.get('capacity')) : null,
              setup_minutes: Number(form.get('setup')), breakdown_minutes: Number(form.get('breakdown')),
            }, serviceRule?.version);
            setData({ ...data, scheduling: { ...scheduling, serviceRules: [...scheduling.serviceRules.filter(row => row.service_id !== service), saved] } });
          });
        }}>
          <p className="text-sm ui-muted">{serviceRule?.capacity ? 'Saved limit: ' + serviceRule.capacity + ' simultaneous commitments' : 'Capacity not configured'}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={field}>Simultaneous commitments<input className={input} name="capacity" type="number" min="1" max="1000" step="1" defaultValue={serviceRule?.capacity ?? ''}/></label>
            <label className={field}>Setup minutes<input className={input} name="setup" type="number" min="0" max="1440" step="1" defaultValue={serviceRule?.setup_minutes ?? ''}/></label>
            <label className={field}>Breakdown minutes<input className={input} name="breakdown" type="number" min="0" max="1440" step="1" defaultValue={serviceRule?.breakdown_minutes ?? ''}/></label>
          </div>
          <p className="text-sm ui-muted">Buffers affect operational reviews. Recorded customer times stay as entered.</p>
          <button className="hub-primary" disabled={busy}>Save service settings</button>
        </form>}
      </>}
      {section === 'Scheduling review' && <>
        <label className={field}>Commitment<select className={input + ' max-w-md'} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
          <option value="">Choose an event or booking</option>
          {data.entries.map(entry => <option key={entryKey(entry)} value={entryKey(entry)}>{entry.name} · {timeRange(entry)}</option>)}
        </select></label>
        {event && <ul className="space-y-2 text-sm">
          {scheduleReviews(event, data.entries, data.availability, scheduling).map(review => <li key={review.key}><strong>{reviewLabels[review.kind]}</strong><p>{review.message}</p></li>)}
          <li className="ui-muted">Scheduling review is advisory.</li>
        </ul>}
      </>}
    </section>
  </div>;
}

function WeeklyEditor({ initial, busy, onDirty, onSave }: {
  initial: Data['scheduling']; busy: boolean; onDirty: () => void;
  onSave: (zone: string, hours: WeeklyInterval[] | null) => void;
}) {
  const [hours, setHours] = useState(initial.weeklyHours ?? []);
  const [configured, setConfigured] = useState(initial.weeklyHours !== null);
  function update(next: WeeklyInterval[]) { setHours(next); onDirty(); }
  return <form className="space-y-3" onChange={onDirty} onSubmit={e => {
    e.preventDefault();
    onSave(String(new FormData(e.currentTarget).get('zone')).trim(), configured ? hours : null);
  }}>
    <label className={field}>Business timezone
      <input className={input + ' max-w-md'} name="zone" list="business-timezones" required placeholder="Choose an IANA timezone" defaultValue={initial.timezone ?? ''}/>
      <datalist id="business-timezones">{supportedZones.map(zone => <option key={zone} value={zone}/>)}</datalist>
    </label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={configured} onChange={e => { setConfigured(e.target.checked); onDirty(); }}/>Configure weekly hours</label>
    {configured && days.map(day => <fieldset key={day} className="space-y-2 rounded-lg border ui-border p-2">
      <legend className="px-1 font-medium">{weekdays[day]}</legend>
      {!hours.some(slot => slot.day === day) && <p className="text-sm ui-muted">Closed unless extended by overnight or dated hours.</p>}
      {hours.map((slot, index) => slot.day === day && <div key={index} className="flex flex-wrap items-end gap-2">
        <label className={field}>Start<input className={input} type="time" required value={slot.start}
          onChange={e => update(hours.map((row, i) => i === index ? { ...row, start: e.target.value } : row))}/></label>
        <label className={field}>End<input className={input} type="time" required value={slot.end === '24:00' ? '00:00' : slot.end}
          onChange={e => update(hours.map((row, i) => i === index ? { ...row, end: e.target.value } : row))}/></label>
        <button type="button" className="hub-button" onClick={() => update(hours.filter((_, i) => i !== index))}>Remove interval</button>
      </div>)}
      <button className="hub-button" type="button" disabled={hours.length >= 56}
        onClick={() => update([...hours, { day, start: '', end: '' }])}>Add interval</button>
    </fieldset>)}
    {configured && <p className="text-sm ui-muted">An end earlier than the start continues into the next day.</p>}
    <button className="hub-primary" disabled={busy}>Save working hours</button>
  </form>;
}

function ExceptionEditor({ date, row, busy, onDirty, onSave }: {
  date: string; row?: Exception; busy: boolean; onDirty: () => void;
  onSave: (fields: Pick<Exception, 'date' | 'start_time' | 'end_time' | 'status'>) => void;
}) {
  const [full, setFull] = useState(row?.start_time === '00:00:00' && row.end_time === '24:00:00');
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const start = full ? '00:00' : String(fields.get('start'));
    const end = full ? '24:00' : String(fields.get('end'));
    if (start === end) { setError('Choose distinct start and end times, or select Full day.'); return; }
    setError('');
    onSave({ date, start_time: start, end_time: end, status: fields.get('status') as Exception['status'] });
  }
  return <form onChange={onDirty} onSubmit={submit} className="space-y-3 rounded-lg border ui-border p-3">
    <h3 className="font-medium">{row ? 'Edit exception' : 'Add exception'}</h3>
    <div className="grid gap-2 sm:grid-cols-3">
      <label className={field}>Status<select className={input} name="status" defaultValue={row?.status ?? 'blocked'}>
        <option value="blocked">Blocked</option><option value="available">Extra available hours</option><option value="tentative">Tentative</option>
      </select></label>
      {!full && <>
        <label className={field}>Start<input type="time" className={input} name="start" required defaultValue={row?.start_time.slice(0, 5)}/></label>
        <label className={field}>End<input type="time" className={input} name="end" required defaultValue={row?.end_time.slice(0, 5).replace('24:00','00:00')}/></label>
      </>}
    </div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={full} onChange={e => { setFull(e.target.checked); onDirty(); }}/>Full day</label>
    <p className="text-sm ui-muted">Overnight windows can end on {shiftDate(date, 1)}.</p>
    {error && <p role="alert">{error}</p>}
    <button className="hub-primary" disabled={busy}>Save exception</button>
  </form>;
}
