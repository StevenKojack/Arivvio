'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BusinessWorkspace } from '../BusinessWorkspace';
import { listVendorClients, loadClientEvents, saveVendorClient } from '@/lib/repositories/vendorClientsRepository';
import { blankClient, matchesClient, type ClientFields, type VendorClient } from '@/lib/vendor-clients/model';
import { todayIn } from '@/lib/vendor-calendar/model';
import { vendorCalendarLink, vendorClientLink } from '@/lib/vendor-calendar/links';

const fields = [
  ['display_name', 'Client name', 200, 'text'],
  ['email', 'Email', 320, 'email'],
  ['phone', 'Phone', 80, 'tel'],
  ['other_contact', 'Other contact information', 500, 'text'],
  ['notes', 'Private notes', 10000, 'text'],
] as const;

export function ClientsWorkspace({ business, client }: { business?: string; client?: string }) {
  return <BusinessWorkspace title="Clients" initial={business} path="/vendor/clients">
    {id => <Directory key={id} business={id} initialClient={id === business ? client : undefined}/>}
  </BusinessWorkspace>;
}

function Directory({ business, initialClient }: { business: string; initialClient?: string }) {
  const [clients, setClients] = useState<VendorClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(initialClient ?? '');
  const [draft, setDraft] = useState<ClientFields | null>(null);
  const [editing, setEditing] = useState<VendorClient>();
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const detail = useRef<HTMLElement>(null);
  const current = clients.find(client => client.id === selected);
  const visible = clients.filter(client => matchesClient(client, search));

  useEffect(() => {
    let active = true;
    mounted.current = true;
    listVendorClients(business).then(rows => { if (active) setClients(rows); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; mounted.current = false; };
  }, [business]);

  function select(id: string) {
    setSelected(id);
    setNotice('');
    window.history.replaceState(null, '', vendorClientLink(business, id));
    detail.current?.focus();
  }

  async function save() {
    if (!draft || busy) return;
    setBusy(true);
    setError('');
    try {
      const client = await saveVendorClient(business, draft, editing);
      if (!mounted.current) return;
      setClients(rows => [...rows.filter(row => row.id !== client.id), client]
        .sort((a, b) => a.display_name.localeCompare(b.display_name)));
      select(client.id);
      setDraft(null);
      setNotice('Client saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save this client.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
    <aside className="space-y-3 rounded-xl border ui-border ui-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Directory</h2>
        <button className="hub-primary" disabled={!!draft || loading} onClick={() => {
          setEditing(undefined);
          setDraft(blankClient);
        }}>Add client</button>
      </div>
      <label className="grid gap-1 text-sm">Search clients
        <input type="search" className="hub-input w-full" value={search} onChange={event => setSearch(event.target.value)}/>
      </label>
      {loading ? <p role="status">Loading clients…</p> : <ul className="max-h-80 space-y-1 overflow-y-auto">
        {visible.map(client => <li key={client.id}>
          <button className="w-full break-words rounded-lg border ui-border p-3 text-left" aria-pressed={selected === client.id}
            disabled={!!draft} onClick={() => select(client.id)}>
            <span className="block font-medium">{client.display_name}</span>
            {(client.email || client.phone) && <span className="block text-sm ui-muted">{client.email || client.phone}</span>}
          </button>
        </li>)}
        {!visible.length && !error && <li className="text-sm ui-muted">{search ? 'No matching clients.' : 'No clients yet.'}</li>}
      </ul>}
    </aside>
    <section ref={detail} tabIndex={-1} aria-label="Client details" className="min-w-0 space-y-4 rounded-xl border ui-border ui-surface p-4 sm:p-5">
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {draft ? <form className="space-y-3" onSubmit={event => { event.preventDefault(); void save(); }}>
        <h2 className="text-lg font-semibold">{editing ? 'Edit client' : 'New client'}</h2>
        <fieldset disabled={busy} className="space-y-3">
          {fields.map(([key, label, limit, type]) => <label key={key} className="grid gap-1 text-sm">{label}
            {key === 'notes'
              ? <textarea rows={4} className="hub-input" maxLength={limit} value={draft[key]}
                  onChange={event => setDraft({ ...draft, [key]: event.target.value })}/>
              : <input type={type} required={key === 'display_name'} className="hub-input" maxLength={limit} value={draft[key]}
                  onChange={event => setDraft({ ...draft, [key]: event.target.value })}/>}
          </label>)}
          <div className="flex flex-wrap gap-2">
            <button className="hub-primary">{busy ? 'Saving…' : 'Save client'}</button>
            <button type="button" className="hub-button" onClick={() => { setDraft(null); setError(''); }}>Cancel</button>
          </div>
        </fieldset>
      </form> : current ? <>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="min-w-0 break-words text-xl font-semibold">{current.display_name}</h2>
          <button className="hub-button" onClick={() => { setEditing(current); setDraft(current); }}>Edit client</button>
        </header>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {fields.slice(1).map(([key, label]) => <div key={key} className="min-w-0">
            <dt className="ui-muted">{label}</dt><dd className="whitespace-pre-wrap break-words">{current[key] || 'Not added'}</dd>
          </div>)}
        </dl>
        <ClientHistory key={current.id} client={current}/>
      </> : !loading && <p className="text-sm ui-muted">{selected ? 'This client is unavailable in the selected business.' : 'Select a client to see contact details and event history.'}</p>}
    </section>
  </section>;
}

function ClientHistory({ client }: { client: VendorClient }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof loadClientEvents>>>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    loadClientEvents(client.vendor_id, client.id).then(events => { if (active) setRows(events); })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [client.id, client.vendor_id]);

  const upcoming = rows?.filter(event =>
    !['Completed', 'Cancelled'].includes(event.status) && event.end_date >= todayIn(event.timezone)) ?? [];
  const upcomingIds = new Set(upcoming.map(event => event.id));
  const past = rows?.filter(event => !upcomingIds.has(event.id)).reverse() ?? [];
  return <section className="space-y-3 border-t ui-border pt-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">Events</h3>
      <Link className="hub-primary" href={vendorCalendarLink(client.vendor_id, { client: client.id })}>Create external event</Link>
    </div>
    {error ? <p role="alert">{error}</p> : !rows ? <p role="status">Loading event history…</p> : (
      [['Upcoming', upcoming], ['Past and closed', past]] as const
    ).map(([label, events]) => <section key={label} className="space-y-2">
      <h4 className="text-sm font-medium ui-muted">{label}</h4>
      {!events.length && <p className="text-sm ui-muted">No events.</p>}
      {events.map(event => <Link key={event.id} className="block rounded-lg border ui-border p-3"
        href={vendorCalendarLink(client.vendor_id, { event: 'External Event:' + event.id })}>
        <span className="block break-words font-medium">{event.name}</span>
        <span className="block text-sm ui-muted">{event.date} · {event.status}{event.service && ' · ' + event.service}</span>
      </Link>)}
    </section>)}
  </section>;
}
