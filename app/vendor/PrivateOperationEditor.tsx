'use client';

import { useEffect, useState } from 'react';
import { loadVendorOperation, saveVendorOperation, type OperationSource } from '@/lib/repositories/vendorOperationsRepository';
import { emptyOperation, type OperationFields, type VendorOperation } from '@/lib/vendor-operations/model';

export function PrivateOperationEditor({ business, source }: { business: string; source: OperationSource }) {
  const [saved, setSaved] = useState<VendorOperation | null>();
  const [fields, setFields] = useState<OperationFields>(emptyOperation);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const { column, id } = source;
  const quote = column === 'request_id';

  useEffect(() => {
    let active = true;
    loadVendorOperation(business, { column, id }).then(row => {
      if (!active) return;
      setSaved(row);
      setFields(row ? { proposed_amount: row.proposed_amount, draft_notes: row.draft_notes, private_notes: row.private_notes, tasks: row.tasks } : emptyOperation);
      setAmount(row?.proposed_amount == null ? '' : String(row.proposed_amount));
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [business, column, id, reload]);

  async function save() {
    if (saved === undefined || busy) return;
    setError('');
    setNotice('');
    const proposed = amount.trim();
    if (quote && proposed && !/^\d{1,10}(?:\.\d{1,2})?$/.test(proposed)) {
      setError('Enter a nonnegative amount with up to two decimal places.');
      return;
    }
    const tasks = fields.tasks.map(task => ({ ...task, title: task.title.trim() }));
    if (tasks.some(task => !task.title)) { setError('Enter a name for each preparation task.'); return; }
    const changes = quote
      ? { proposed_amount: proposed ? Number(proposed) : null, draft_notes: fields.draft_notes, private_notes: fields.private_notes }
      : { private_notes: fields.private_notes, tasks };
    setBusy(true);
    try {
      const row = await saveVendorOperation(business, { column, id }, changes, saved);
      setSaved(row);
      setFields(previous => ({ ...previous, ...changes }));
      setNotice(quote ? 'Private preparation saved.' : 'Booking preparation saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save private preparation.');
    } finally {
      setBusy(false);
    }
  }

  const completed = fields.tasks.filter(task => task.done).length;
  const changeTask = (index: number, change: Partial<OperationFields['tasks'][number]>) =>
    setFields(previous => ({ ...previous, tasks: previous.tasks.map((task, i) => i === index ? { ...task, ...change } : task) }));

  return <section className="space-y-3 rounded-xl border ui-border p-4">
    <h2 className="font-semibold">{quote ? 'Internal quote preparation' : 'Private booking preparation'}</h2>
    {quote && <p className="text-sm font-medium">Internal draft. Not sent to customer.</p>}
    {saved?.updated_at && <p className="text-sm ui-muted">Last saved {new Date(saved.updated_at).toLocaleString()}</p>}
    {saved === undefined && !error && <p role="status">Loading private preparation…</p>}
    {error && <div className="space-y-2">
      <p role="alert" className="text-sm">{error}</p>
      <button type="button" className="hub-button" disabled={busy} onClick={() => {
        if (saved !== undefined && !window.confirm('Replace unsaved edits with the latest saved version?')) return;
        setSaved(undefined); setError(''); setNotice(''); setReload(n => n + 1);
      }}>Reload saved version</button>
    </div>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {saved !== undefined && <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset className="space-y-4" disabled={busy}>
        {quote && <>
          <label className="grid max-w-xs gap-1 text-sm">Proposed amount (USD)
            <input className="hub-input" inputMode="decimal" maxLength={13} value={amount} onChange={event => setAmount(event.target.value)}/>
          </label>
          <label className="grid gap-1 text-sm">Internal quote notes
            <textarea className="hub-input" rows={3} maxLength={10000} value={fields.draft_notes}
              onChange={event => setFields({ ...fields, draft_notes: event.target.value })}/>
          </label>
        </>}
        <label className="grid gap-1 text-sm">{quote ? 'Private opportunity notes' : 'Private booking notes'}
          <textarea className="hub-input" rows={3} maxLength={10000} value={fields.private_notes}
            onChange={event => setFields({ ...fields, private_notes: event.target.value })}/>
        </label>
        {!quote && <div className="space-y-2">
          <div className="flex flex-wrap justify-between gap-2"><h3 className="font-medium">Preparation checklist</h3>
            <span className="text-sm ui-muted">{completed} of {fields.tasks.length} complete</span>
          </div>
          {!fields.tasks.length && <p className="text-sm ui-muted">No preparation tasks yet.</p>}
          {fields.tasks.map((task, index) => <div key={index} className="flex flex-wrap items-center gap-2">
            <input type="checkbox" className="size-5 shrink-0" aria-label={'Complete task ' + (index + 1)}
              checked={task.done} onChange={event => changeTask(index, { done: event.target.checked })}/>
            <input aria-label={'Task ' + (index + 1)} className="hub-input min-w-0 flex-1" required maxLength={300}
              value={task.title} onChange={event => changeTask(index, { title: event.target.value })}/>
            <button type="button" className="hub-button" aria-label={'Remove task ' + (index + 1)}
              onClick={() => setFields(previous => ({ ...previous, tasks: previous.tasks.filter((_, i) => i !== index) }))}>Remove</button>
          </div>)}
          <button type="button" className="hub-button" disabled={fields.tasks.length >= 100}
            onClick={() => setFields(previous => ({ ...previous, tasks: [...previous.tasks, { title: '', done: false }] }))}>Add task</button>
        </div>}
        <button className="hub-primary">{busy ? 'Saving…' : 'Save private preparation'}</button>
      </fieldset>
    </form>}
  </section>;
}
