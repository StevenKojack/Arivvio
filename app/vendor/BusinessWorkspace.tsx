'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { trustOperation, type TrustWorkspace } from '@/lib/repositories/businessTrustRepository';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function BusinessWorkspace({ initial, title, path, children, readOnly = false }: {
  initial?: string;
  title: string;
  path: string;
  children: (business: string) => ReactNode;
  readOnly?: boolean;
}) {
  const [rows, setRows] = useState<TrustWorkspace['businesses']>([]);
  const [selected, setSelected] = useState(initial ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const { data: { subscription } } = createBrowserSupabaseClient().auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        active = false;
        setRows([]);
        setSelected('');
        setLoading(false);
        setError('Sign in to continue.');
      }
    });
    trustOperation<TrustWorkspace>('mine').then(workspace => {
      if (!active) return;
      const editable = workspace.businesses.filter(business =>
        workspace.memberships.some(member => member.vendor_id === business.id && member.profile_id === workspace.actor_id &&
          member.status === 'active' && (readOnly || ['owner', 'admin', 'manager'].includes(member.role)) &&
          (!member.expires_at || Date.parse(member.expires_at) > Date.now())) ||
        (business.applicant_id === workspace.actor_id && !business.owner_id && business.approval_status === 'pending' &&
          ['pending', 'needs_more_information'].includes(business.verification_status ?? '')));
      setRows(editable);
      setSelected(current => editable.some(business => business.id === current) ? current : editable.length === 1 ? editable[0].id : '');
    }).catch(() => { if (active) setError('Unable to load your businesses. Sign in to continue.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [readOnly]);
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm ui-muted">Vendor Hub</p><h1 className="text-2xl font-semibold">{title}</h1></div>
      <Link className="hub-button" href="/vendor/dashboard">Vendor dashboard</Link>
    </header>
    {loading && <p role="status">Loading businesses…</p>}
    {error && <p role="alert">{error} <Link className="underline" href={'/auth/login?next=' + encodeURIComponent(path)}>Sign in</Link></p>}
    {!loading && !error && !rows.length && <p>No businesses are available.</p>}
    {!!rows.length && <label className="grid max-w-md gap-1 text-sm">Business and branch
      <select className="hub-input" value={selected} onChange={event => {
        setSelected(event.target.value);
        window.history.replaceState(null, '', event.target.value ? path + '?' + new URLSearchParams({ business: event.target.value }) : path);
      }}>
        <option value="">Select a business</option>
        {rows.map(row => <option key={row.id} value={row.id}>
          {[row.business_name, row.location_name || row.service_area_city].filter(Boolean).join(' · ')}
        </option>)}
      </select>
    </label>}
    {rows.some(row => row.id === selected) && children(selected)}
  </div>;
}
