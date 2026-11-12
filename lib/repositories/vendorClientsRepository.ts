import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { ClientFields, VendorClient } from '@/lib/vendor-clients/model';

export async function listVendorClients(vendorId: string) {
  const client = createBrowserSupabaseClient();
  const rows: VendorClient[] = [];
  const size = 200;
  for (let offset = 0; ; offset += size) {
    const { data, error } = await client.from('vendor_clients').select('*').eq('vendor_id', vendorId)
      .order('display_name').order('id').range(offset, offset + size - 1);
    if (error) throw Error(error.message);
    rows.push(...data);
    if (data.length < size) return rows;
  }
}

export async function loadClientEvents(vendorId: string, clientId: string) {
  const client = createBrowserSupabaseClient();
  const [events, services] = await Promise.all([
    client.from('vendor_calendar_events').select('id,name,date,end_date,status,service_id,timezone')
      .eq('vendor_id', vendorId).eq('client_id', clientId).order('date').order('start_time'),
    client.from('vendor_services').select('id,service_name').eq('vendor_id', vendorId),
  ]);
  if (events.error) throw Error(events.error.message);
  if (services.error) throw Error(services.error.message);
  const names = new Map(services.data.map(service => [service.id, service.service_name]));
  return events.data.map(event => ({ ...event, service: names.get(event.service_id ?? '') }));
}

export async function saveVendorClient(vendorId: string, fields: ClientFields, existing?: VendorClient) {
  if (existing && existing.vendor_id !== vendorId) throw Error('Select the client’s business before saving.');
  const values = {
    display_name: fields.display_name.trim(), email: fields.email.trim(), phone: fields.phone.trim(),
    other_contact: fields.other_contact.trim(), notes: fields.notes,
  };
  if (!values.display_name) throw Error('Enter a client name.');
  const table = createBrowserSupabaseClient().from('vendor_clients');
  const result = existing
    ? await table.update(values).eq('id', existing.id).eq('vendor_id', vendorId).eq('version', existing.version).select().maybeSingle()
    : await table.insert({ ...values, vendor_id: vendorId }).select().single();
  if (result.error) throw Error(result.error.message);
  if (!result.data) throw Error('This client changed elsewhere or access changed. Reopen the directory before saving again.');
  return result.data;
}
