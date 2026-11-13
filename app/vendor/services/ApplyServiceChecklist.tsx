'use client';

import { useEffect, useState } from 'react';
import { listServiceChecklists } from '@/lib/repositories/serviceCatalogRepository';
import { getVendorServicesByVendorIds } from '@/lib/repositories/vendorsRepository';
import { checklistAdditions } from '@/lib/service-catalog/model';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { PreparationTask } from '@/lib/vendor-operations/model';

export function ApplyServiceChecklist({ business, service, tasks, disabled, onApply }: {
  business: string; service?: string | null; tasks: PreparationTask[]; disabled?: boolean;
  onApply: (tasks: PreparationTask[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(service ?? '');
  const [choices, setChoices] = useState<{ id: string; name: string; tasks: string[] }[]>();
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    let live = true;
    Promise.all([listServiceChecklists(business), getVendorServicesByVendorIds(createBrowserSupabaseClient(), [business])])
      .then(([rows, services]) => {
        if (!live) return;
        setChoices(rows.flatMap(row => {
          const service = services.find(item => item.id === row.service_id);
          return service && row.tasks.length ? [{ id: service.id, name: service.service_name, tasks: row.tasks }] : [];
        }));
      }).catch(() => { if (live) setError('Unable to load service checklists.'); });
    return () => { live = false; };
  }, [open, business]);
  const choice = choices?.find(item => item.id === selected);
  const additions = checklistAdditions(tasks, choice?.tasks ?? []);
  if (!open) return <button type="button" className="hub-button" disabled={disabled} onClick={() => setOpen(true)}>Apply service checklist</button>;
  return <div className="space-y-2 rounded-lg border ui-border p-3">
    {error ? <p role="alert">{error}</p> : !choices ? <p role="status">Loading checklists…</p> : !choices.length
      ? <p>No service checklists are saved for this business.</p>
      : <label className="grid gap-1 text-sm">Service checklist
        <select className="hub-input" value={choice?.id ?? ''} disabled={disabled} onChange={event => setSelected(event.target.value)}>
          <option value="">Choose a service checklist</option>
          {choices.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>}
    {choice && (additions.length ? <ul className="list-disc break-words pl-5 text-sm">
      {additions.map(task => <li key={task.title}>{task.title}</li>)}
    </ul> : <p className="text-sm ui-muted">These tasks are already on the checklist.</p>)}
    {tasks.length + additions.length > 100 && <p role="status">Preparation checklists can hold up to 100 tasks.</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className="hub-primary" disabled={disabled || !additions.length || tasks.length + additions.length > 100}
        onClick={() => onApply([...tasks, ...additions])}>Add {additions.length || ''} {additions.length === 1 ? 'task' : 'tasks'}</button>
      <button type="button" className="hub-button" onClick={() => { setChoices(undefined); setError(''); setOpen(false); }}>Close</button>
    </div>
  </div>;
}
