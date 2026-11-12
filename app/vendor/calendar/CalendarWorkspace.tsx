'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { trustOperation, type TrustWorkspace } from '@/lib/repositories/businessTrustRepository';
import { loadCalendar, saveCalendarEvent, updateCalendarEvent, type EventChanges } from '@/lib/repositories/vendorCalendarRepository';
import { localDate, todayIn, shiftDate, onDay, manualEntry, sortEntries, type CalendarEntry, type ManualEvent } from '@/lib/vendor-calendar/model';
import { entryKey, reviewLabels, scheduleReviews, timeRange, unfinishedCount, upcomingWork } from '@/lib/vendor-calendar/operations';
import { EventDetails } from './EventDetails';
import { EventEditor } from './EventEditor';

const emptyEntries: CalendarEntry[] = [];

function calendarHref(business: string, entry?: CalendarEntry, preparation = false) {
  const params = new URLSearchParams({ business });
  if (entry) params.set('event', entryKey(entry));
  if (preparation) params.set('preparation', 'open');
  return '/vendor/calendar?' + params;
}

export function CalendarWorkspace({ initial, initialEvent, initialPreparation = false, compact = false }: {
  initial?: string;
  initialEvent?: string;
  initialPreparation?: boolean;
  compact?: boolean;
}) {
  const [businesses, setBusinesses] = useState<TrustWorkspace['businesses']>([]);
  const [id, setId] = useState(initial ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    const { data: { subscription } } = createBrowserSupabaseClient().auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        live = false;
        setBusinesses([]);
        setId('');
        setDirty(false);
        setSaving(false);
        setError('Sign in to view your private calendar.');
        setLoading(false);
      }
    });
    trustOperation<TrustWorkspace>('mine').then(workspace => {
      if (!live) return;
      const rows = workspace.businesses.filter(business => workspace.memberships.some(member =>
        member.vendor_id === business.id && member.profile_id === workspace.actor_id && member.status === 'active' &&
        ['owner', 'admin', 'manager'].includes(member.role)) ||
        (business.applicant_id === workspace.actor_id && !business.owner_id && business.approval_status === 'pending' &&
          ['pending', 'needs_more_information'].includes(business.verification_status ?? '')));
      setBusinesses(rows);
      setId(current => rows.some(business => business.id === current) ? current : rows.length === 1 ? rows[0].id : '');
    }).catch(err => { if (live) setError(err.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; subscription.unsubscribe(); };
  }, []);

  const business = businesses.find(row => row.id === id);
  const businessLabel = (row: TrustWorkspace['businesses'][number]) =>
    [row.business_name, row.location_name || row.service_area_city].filter(Boolean).join(' · ');

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm ui-muted">Vendor Hub</p>
          {compact ? <h2 className="text-xl font-semibold">Upcoming work</h2> : <h1 className="text-2xl font-semibold">Calendar</h1>}
        </div>
        <Link className="hub-button inline-flex" href={compact ? (id ? calendarHref(id) : '/vendor/calendar') : '/vendor/dashboard'}
          onClick={event => { if (saving || (dirty && !window.confirm('Discard unsaved event changes?'))) event.preventDefault(); }}>
          {compact ? 'Open calendar' : 'Vendor dashboard'}
        </Link>
      </header>
      {error && <p role="alert">{error} <Link className="underline" href="/auth/login?next=%2Fvendor%2Fcalendar">Sign in</Link></p>}
      {loading ? <p>Loading businesses…</p> : businesses.length > 0 && (
        <label className="grid max-w-lg gap-2 text-sm">Business and branch
          <select className="hub-input min-w-0" value={id} disabled={saving} onChange={event => {
            if (dirty && !window.confirm('Discard unsaved event changes?')) return;
            const next = event.target.value;
            setDirty(false);
            setId(next);
            if (!compact) window.history.replaceState(null, '', next ? calendarHref(next) : '/vendor/calendar');
          }}>
            <option value="">Select a business</option>
            {businesses.map(row => <option key={row.id} value={row.id}>{businessLabel(row)}</option>)}
          </select>
        </label>
      )}
      {!loading && !error && !businesses.length && <p>No editable businesses yet. <Link className="underline" href="/vendor/onboarding">Find or create a business</Link></p>}
      {!loading && business && (
        <BusinessCalendar key={business.id} id={business.id} business={businessLabel(business)} compact={compact}
          initialEvent={business.id === initial ? initialEvent : undefined} initialPreparation={business.id === initial && initialPreparation}
          onDirty={setDirty} onSaving={setSaving}/>
      )}
    </section>
  );
}

function BusinessCalendar({ id, business, compact, initialEvent, initialPreparation, onDirty, onSaving }: {
  id: string;
  business: string;
  compact: boolean;
  initialEvent?: string;
  initialPreparation: boolean;
  onDirty: (dirty: boolean) => void;
  onSaving: (saving: boolean) => void;
}) {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadCalendar>> | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [date, setDate] = useState(() => localDate());
  const [view, setView] = useState(initialPreparation ? 'Agenda' : 'Month');
  const [zone, setZone] = useState('');
  const [selectedKey, setSelectedKey] = useState(initialEvent ?? '');
  const [draft, setDraft] = useState<ManualEvent | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prepOnly, setPrepOnly] = useState(initialPreparation);
  const saving = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let live = true;
    loadCalendar(id).then(rows => {
      if (live) { setData(rows); setError(''); }
    }).catch(err => { if (live) setError(err.message); });
    return () => { live = false; mounted.current = false; };
  }, [id, revision]);

  useEffect(() => {
    if (!dirty && !busy) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, busy]);

  const entries = data?.entries ?? emptyEntries;
  const upcoming = upcomingWork(entries);
  const prepEvents = upcoming.filter(entry => unfinishedCount(entry) > 0);
  const remainingTasks = prepEvents.reduce((count, entry) => count + unfinishedCount(entry), 0);
  const selected = entries.find(entry => entryKey(entry) === selectedKey);
  const reviews = (entry: CalendarEntry) => scheduleReviews(entry, entries, data?.availability ?? []);

  function mark(value: boolean) { setDirty(value); onDirty(value); }

  function leave(action: () => void) {
    if (saving.current || (dirty && !window.confirm('Discard unsaved event changes?'))) return;
    mark(false);
    action();
  }

  function select(key: string) {
    setSelectedKey(key);
    window.history.replaceState(null, '', calendarHref(id, entries.find(entry => entryKey(entry) === key), prepOnly));
  }

  function open(entry: CalendarEntry) {
    if (!draft && entryKey(entry) === selectedKey) {
      document.querySelector<HTMLElement>('[aria-label="Event workspace"] h2')?.focus();
      return;
    }
    leave(() => {
      setDraft(null);
      select(entryKey(entry));
      if (entry.date) setDate(entry.date);
    });
  }

  function refresh() {
    leave(() => {
      setDraft(null);
      setData(null);
      setError('');
      setNotice('');
      setRevision(current => current + 1);
    });
  }

  function add() {
    leave(() => {
      select('');
      setDraft({
        id: crypto.randomUUID(), vendor_id: id, name: '', date, end_date: date, start_time: '', end_time: '', timezone: zone,
        status: 'Tentative', event_type: '', client_name: '', client_contact: '', location: '', service_id: null,
        notes: '', tasks: [], version: 0, created_at: '', updated_at: '', created_by: '', updated_by: '',
      });
    });
  }

  async function persist(write: () => Promise<ManualEvent>) {
    if (saving.current) throw Error('An event save is already in progress.');
    saving.current = true;
    setBusy(true);
    onSaving(true);
    setNotice('');
    try {
      const saved = await write();
      if (!mounted.current) return;
      const entry = manualEntry(saved, data?.services.find(service => service.id === saved.service_id)?.service_name);
      const key = entryKey(entry);
      setDate(saved.date);
      setData(current => current && {
        ...current, entries: sortEntries([...current.entries.filter(item => entryKey(item) !== key), entry]),
      });
      setSelectedKey(key);
      window.history.replaceState(null, '', calendarHref(id, entry, prepOnly));
      setZone(saved.timezone);
      mark(false);
      setDraft(null);
      setNotice('Event saved.');
    } finally {
      saving.current = false;
      if (mounted.current) {
        setBusy(false);
        onSaving(false);
      }
    }
  }

  const first = date.slice(0, 7) + '-01';
  const offset = new Date(first + 'T12:00:00').getDay();
  const cells = Array.from({ length: 42 }, (_, i) => shiftDate(first, i - offset));
  function showPreparation(open: boolean) {
    setPrepOnly(open);
    window.history.replaceState(null, '', calendarHref(id, selected, open));
  }

  const shown = prepOnly ? prepEvents : compact ? upcoming.slice(0, 5) : view === 'Agenda'
    ? entries.filter(entry => !entry.date || (entry.end_date ?? entry.date) >= date)
    : entries.filter(entry => onDay(entry, date));

  function move(delta: number) {
    if (view === 'Month') {
      const month = new Date(first + 'T12:00:00');
      month.setMonth(month.getMonth() + delta);
      setDate(localDate(month));
    } else setDate(shiftDate(date, delta));
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert">{error} <button className="hub-button" onClick={refresh}>Retry</button></p>}
      {notice && <p role="status" className="text-sm ui-muted">{notice}</p>}
      {!data && !error && <p>Loading schedule…</p>}
      {data?.vacation && <p className="rounded-lg bg-amber-50 p-3 text-amber-900">Vacation mode is on. Existing availability settings remain in effect.</p>}

      {data && !compact && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {['Month', 'Day', 'Agenda'].map(mode => (
                <button key={mode} className="hub-button" aria-pressed={view === mode && !prepOnly}
                  onClick={() => { showPreparation(false); setView(mode); }}>{mode}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="hub-button" onClick={refresh} disabled={busy}>Refresh</button>
              <button className="hub-primary" onClick={add} disabled={busy}>Add event</button>
            </div>
          </div>

          {selected && !draft && (
            <EventDetails key={entryKey(selected) + ':' + revision} entry={selected} business={business} reviews={reviews(selected)}
              availabilityHref={'/vendor/dashboard?' + new URLSearchParams({ tab: 'availability', business: id })}
              busy={busy} onDirty={mark} onClose={() => leave(() => select(''))}
              onEdit={setDraft} onOpen={open} onSave={(event, changes: EventChanges) => persist(() => updateCalendarEvent(id, event, changes))}/>
          )}
          {selectedKey && !selected && !draft && (
            <p role="status" className="text-sm ui-muted">This event is unavailable in the selected business.</p>
          )}
          {draft && (
            <EventEditor key={draft.id} initial={draft} services={data.services} warnings={reviews(manualEntry(draft)).map(review => reviewLabels[review.kind] + ' · ' + review.message)}
              onChange={event => { setDraft(event); mark(true); }} onCancel={() => leave(() => setDraft(null))}
              onSave={() => persist(() => saveCalendarEvent(id, draft))}/>
          )}

          {!prepOnly && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button aria-label="Previous date" className="hub-button" onClick={() => move(-1)}>←</button>
                <button className="hub-button" onClick={() => setDate(todayIn(zone))}>Today</button>
                <button aria-label="Next date" className="hub-button" onClick={() => move(1)}>→</button>
                <label className="text-sm">Selected date <input className="hub-input" type="date" value={date}
                  onChange={event => { if (event.target.value) setDate(event.target.value); }}/></label>
                <span className="text-sm ui-muted">{zone || 'Local dates as entered'}</span>
              </div>
              {view === 'Month' && (
                <div className="overflow-hidden rounded-xl border ui-border">
                  <div className="grid grid-cols-7 ui-surface text-center text-xs">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span className="py-2" key={day}>{day}</span>)}
                  </div>
                  <div className="grid grid-cols-7">
                    {cells.map(day => {
                      const list = entries.filter(entry => onDay(entry, day));
                      return <button key={day} aria-label={day + ', ' + list.length + ' events. Open day schedule'}
                        aria-pressed={date === day} onClick={() => { setDate(day); setView('Day'); }}
                        className={'min-h-16 min-w-0 border ui-border p-1 text-left sm:min-h-24 sm:p-2 ' +
                          (day === date ? 'bg-blue-50 text-neutral-900' : day.slice(0, 7) !== date.slice(0, 7) ? 'opacity-60' : '')}>
                        <span className="text-sm">{Number(day.slice(-2))}</span>
                        {list.slice(0, 2).map(entry => <span key={entryKey(entry)} className="mt-1 hidden truncate text-xs sm:block">{entry.start_time?.slice(0, 5)} {entry.name}</span>)}
                        {!!list.length && <span className="block text-[10px] sm:text-xs">{list.length} event{list.length === 1 ? '' : 's'}</span>}
                      </button>;
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {data && (
        <section className="space-y-3 rounded-xl border ui-border ui-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{prepOnly ? 'Upcoming preparation' : compact ? 'Next on your schedule' : view === 'Agenda' ? 'Agenda from ' + date : 'Schedule for ' + date}</h2>
            {compact ? (
              <Link className="hub-button inline-flex" href={calendarHref(id, undefined, true)}>Incomplete preparation · {remainingTasks}</Link>
            ) : (
              <button className="hub-button" aria-pressed={prepOnly} onClick={() => showPreparation(!prepOnly)}>
                {prepOnly ? 'Show calendar' : 'Incomplete preparation · ' + remainingTasks}
              </button>
            )}
          </div>
          {!shown.length && <p className="py-2 text-sm ui-muted">{prepOnly ? 'No incomplete tasks on upcoming events.' : 'No events scheduled for this view.'}</p>}
          {shown.map(entry => {
            const labels = [...new Set(reviews(entry).map(review => reviewLabels[review.kind]))];
            const count = unfinishedCount(entry);
            const content = <>
              <span className="flex flex-wrap justify-between gap-2">
                <strong className="min-w-0 break-words">{entry.name}</strong>
                <span className="rounded-full border ui-border px-2 py-1 text-xs capitalize">{entry.source} · {entry.status}</span>
              </span>
              <span className="mt-1 block text-sm ui-muted">{timeRange(entry)}</span>
              {entry.manual && <span className="block text-sm">{count} unfinished {count === 1 ? 'task' : 'tasks'}</span>}
              {!!labels.length && <span className="block text-sm font-medium">{labels.join(' · ')}</span>}
            </>;
            return <div key={entryKey(entry)} className="rounded-lg border ui-border">
              {compact
                ? <Link className="block p-3 text-left focus-visible:outline-2" href={calendarHref(id, entry)}>{content}</Link>
                : <button className="block w-full p-3 text-left focus-visible:outline-2" aria-expanded={entryKey(entry) === selectedKey && !draft}
                  disabled={busy} onClick={() => open(entry)}>{content}</button>}
              {prepOnly && (
                <ul className="list-disc space-y-1 break-words px-8 pb-3 text-sm">
                  {entry.manual?.tasks.map((task, i) => !task.done && <li key={i}>{task.title}</li>)}
                </ul>
              )}
            </div>;
          })}
          {!compact && !prepOnly && data.availability.filter(window => window.date === date).map(window => (
            <p key={window.id} className="rounded-lg border border-dashed ui-border p-3 text-sm">
              Availability · {window.status} · {window.start_time.slice(0, 5)} to {window.end_time.slice(0, 5)}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
