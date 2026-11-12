'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { listVendorClients, saveVendorClient } from '@/lib/repositories/vendorClientsRepository';
import { blankClient, type VendorClient } from '@/lib/vendor-clients/model';
import { vendorClientLink } from '@/lib/vendor-calendar/links';

export function EventClientPicker({ business, value, disabled, onChange, onWorking }: {
  business: string;
  value: string | null;
  disabled?: boolean;
  onChange: (client: string | null) => void;
  onWorking?: (working: boolean) => void;
}) {
  const [clients, setClients] = useState<VendorClient[]>();
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    listVendorClients(business).then(rows => { if (active.current) setClients(rows); })
      .catch(() => { if (active.current) setError('Client directory is unavailable.'); });
    return () => { active.current = false; };
  }, [business]);
  const selected = clients?.find(client => client.id === value);

  async function create() {
    if (saving || disabled || !name.trim()) return;
    setSaving(true);
    onWorking?.(true);
    setError('');
    try {
      const client = await saveVendorClient(business, { ...blankClient, display_name: name });
      if (!active.current) return;
      setClients(rows => [...(rows ?? []), client]);
      onChange(client.id);
      setCreating(false);
      setName('');
    } catch (err) {
      if (active.current) setError(err instanceof Error ? err.message : 'Unable to create client.');
    } finally {
      if (active.current) {
        setSaving(false);
        onWorking?.(false);
      }
    }
  }

  return <div className="space-y-2">
    <label className="grid gap-1 text-sm">Link to client
      <select className="hub-input w-full" value={value ?? ''} disabled={disabled || saving || !clients}
        onChange={event => onChange(event.target.value || null)}>
        <option value="">No linked client</option>
        {value && !selected && <option value={value}>{clients ? 'Client unavailable' : 'Loading linked client…'}</option>}
        {clients?.map(client => <option key={client.id} value={client.id}>
          {client.display_name}{client.email || client.phone ? ' · ' + (client.email || client.phone) : ''}
        </option>)}
      </select>
    </label>
    {selected && <Link className="text-sm underline" href={vendorClientLink(business, selected.id)} target="_blank" rel="noopener noreferrer">Open client profile (new tab)</Link>}
    {clients && (creating ? <div className="space-y-2">
      <label className="grid gap-1 text-sm">New client name
        <input className="hub-input w-full" maxLength={200} value={name} disabled={disabled || saving}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void create(); } }}
          onChange={event => setName(event.target.value)}/>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="hub-button" onClick={() => void create()} disabled={disabled || saving || !name.trim()}>
          {saving ? 'Creating…' : 'Create client'}
        </button>
        <button type="button" className="hub-button" disabled={saving} onClick={() => setCreating(false)}>Cancel</button>
      </div>
    </div> : <div><button type="button" className="hub-button" disabled={disabled} onClick={() => setCreating(true)}>New client</button></div>)}
    {error && <p role="alert" className="text-sm">{error}</p>}
  </div>;
}
