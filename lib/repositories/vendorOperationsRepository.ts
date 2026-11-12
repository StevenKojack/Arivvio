import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { OperationFields, VendorOperation } from '@/lib/vendor-operations/model';

export type OperationSource = { column: 'request_id' | 'booking_id'; id: string };

export async function loadVendorOperation(vendor: string, source: OperationSource) {
  const { data, error } = await createBrowserSupabaseClient().from('vendor_private_operations')
    .select('*').eq('vendor_id', vendor).eq(source.column, source.id).maybeSingle();
  if (error) throw Error(error.message);
  return data;
}

export async function saveVendorOperation(vendor: string, source: OperationSource, changes: Partial<OperationFields>, current: VendorOperation | null) {
  const table = createBrowserSupabaseClient().from('vendor_private_operations');
  if (current && (current.vendor_id !== vendor || current[source.column] !== source.id)) {
    throw Error('This record belongs to a different workspace.');
  }
  const result = current
    ? await table.update(changes).eq('id', current.id).eq('vendor_id', vendor)
      .eq(source.column, source.id).eq('version', current.version).select().maybeSingle()
    : await table.insert({ ...changes, vendor_id: vendor, [source.column]: source.id }).select().single();
  if (!result.data && (!result.error || result.error.code === '23505')) {
    throw Error('This record changed in another session. Reload the saved version before editing again.');
  }
  if (result.error) throw Error(result.error.message);
  return result.data;
}

export async function loadBookingPreparation(vendor: string, ids: string[]) {
  const rows: Pick<VendorOperation, 'booking_id' | 'tasks'>[] = [];
  const client = createBrowserSupabaseClient();
  for (let offset = 0; offset < ids.length; offset += 100) {
    const { data, error } = await client.from('vendor_private_operations').select('booking_id,tasks')
      .eq('vendor_id', vendor).in('booking_id', ids.slice(offset, offset + 100));
    if (error) throw Error(error.message);
    rows.push(...data);
  }
  return rows;
}
