import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { PublicTableRow } from '@/lib/supabase/database.types';
import type { WeeklyInterval } from '@/lib/vendor-calendar/operations';

export async function loadSchedulingSettings(business: string) {
  const client = createBrowserSupabaseClient();
  const [hours, services] = await Promise.all([
    client.from('vendor_working_hours').select('*').eq('vendor_id', business).maybeSingle(),
    client.from('vendor_service_scheduling').select('*').eq('vendor_id', business),
  ]);
  if (hours.error || services.error) throw Error(hours.error?.message ?? services.error?.message);
  return { timezone: hours.data?.timezone ?? null, weeklyHours: hours.data?.weekly_hours ?? null,
    hoursVersion: hours.data?.version, serviceRules: services.data ?? [] };
}

export async function saveWorkingHours(business: string, timezone: string, weekly_hours: WeeklyInterval[] | null, version?: number) {
  const table = createBrowserSupabaseClient().from('vendor_working_hours');
  const fields = { timezone, weekly_hours };
  const result = version === undefined ? await table.insert({ vendor_id: business, ...fields }).select().single()
    : await table.update(fields).eq('vendor_id', business).eq('version', version).select().maybeSingle();
  if (result.error) throw Error(result.error.message);
  if (!result.data) throw Error('Working hours changed elsewhere. Reload before editing.');
  return result.data;
}

export async function saveServiceScheduling(business: string, service: string, fields: {
  capacity: number | null; setup_minutes: number; breakdown_minutes: number;
}, version?: number) {
  const table = createBrowserSupabaseClient().from('vendor_service_scheduling');
  const result = version === undefined ? await table.insert({ vendor_id: business, service_id: service, ...fields }).select().single()
    : await table.update(fields).eq('vendor_id', business).eq('service_id', service).eq('version', version).select().maybeSingle();
  if (result.error) throw Error(result.error.message);
  if (!result.data) throw Error('Service settings changed elsewhere. Reload before editing.');
  return result.data;
}

export async function saveDateException(business: string, fields: Pick<PublicTableRow<'vendor_availability'>, 'date' | 'start_time' | 'end_time' | 'status'>,
  previous?: PublicTableRow<'vendor_availability'>) {
  const table = createBrowserSupabaseClient().from('vendor_availability');
  const result = previous
    ? await table.update(fields).eq('vendor_id', business).eq('id', previous.id).eq('date', previous.date)
      .eq('start_time', previous.start_time).eq('end_time', previous.end_time).eq('status', previous.status).select().maybeSingle()
    : await table.insert({ ...fields, vendor_id: business }).select().single();
  if (result.error) throw Error(result.error.message);
  if (!result.data) throw Error('The exception changed elsewhere. Reload before editing.');
  return result.data;
}

export async function removeDateException(business: string, previous: PublicTableRow<'vendor_availability'>) {
  const { data, error } = await createBrowserSupabaseClient().from('vendor_availability').delete()
    .eq('vendor_id', business).eq('id', previous.id).eq('date', previous.date)
    .eq('start_time', previous.start_time).eq('end_time', previous.end_time).eq('status', previous.status).select('id').maybeSingle();
  if (error) throw Error(error.message);
  if (!data) throw Error('The exception changed elsewhere. Reload before editing.');
}
