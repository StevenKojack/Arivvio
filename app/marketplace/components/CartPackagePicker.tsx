'use client';

import { useState } from 'react';
import { RequestedPackage } from '@/app/components/RequestedPackage';
import { listServicePackages } from '@/lib/repositories/serviceCatalogRepository';
import { pricingLabel, type PackageSnapshot, type ServicePackage } from '@/lib/service-catalog/model';

export function CartPackagePicker({ business, service, selected, onChange }: {
  business: string;
  service: string;
  selected: PackageSnapshot | null;
  onChange?: (id: string | null) => Promise<void>;
}) {
  const [options, setOptions] = useState<ServicePackage[]>();
  const [choice, setChoice] = useState(selected?.id ?? '');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function show() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setOptions(undefined);
    setError('');
    setChoice(selected?.id ?? '');
    try {
      const rows = await listServicePackages(business, service);
      setOptions(rows);
    } catch {
      setError('Unable to load packages. Close and try again.');
    }
  }
  async function apply() {
    if (!onChange) return;
    setBusy(true);
    setError('');
    try {
      await onChange(choice || null);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save your package.');
    } finally {
      setBusy(false);
    }
  }
  const current = options?.find(row => row.id === choice);
  return <div className="space-y-2">
    {selected ? <RequestedPackage item={selected}/> : <p className="text-sm font-medium">Custom service request</p>}
    {onChange && <button type="button" className="hub-button" disabled={busy} aria-expanded={open} onClick={() => void show()}>
      {open ? 'Close package options' : selected ? 'Change package' : 'Choose a package'}
    </button>}
    {open && <>
      {!options && !error && <p role="status">Loading packages…</p>}
      {options && <>
        {!options.length && <p className="text-sm ui-muted">No packages are currently available for this service.</p>}
        <label className="grid gap-1 text-sm">Package
          <select className="hub-input w-full min-w-0" value={choice} disabled={busy} onChange={e => setChoice(e.target.value)}>
            <option value="">Custom service request</option>
            {choice && !current && <option value={choice} disabled>Previously selected package unavailable</option>}
            {options.map(row => <option key={row.id} value={row.id}>{row.name} · {pricingLabel(row.pricing_model, row.amount, row.minimum_hours, row.minimum_guests)}</option>)}
          </select>
        </label>
        {current && <RequestedPackage item={current}/>}
        <button type="button" className="hub-primary" disabled={busy || Boolean(choice && !current) || (!choice && !selected)} onClick={() => void apply()}>
          {busy ? 'Saving…' : choice ? 'Save package selection' : 'Remove package selection'}
        </button>
      </>}
      {error && <p role="alert" className="text-sm">{error}</p>}
    </>}
  </div>;
}
