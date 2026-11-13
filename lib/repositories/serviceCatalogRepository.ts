import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { PackageFields, ServiceChecklist, ServicePackage } from '@/lib/service-catalog/model';

export async function listServicePackages(vendor: string, publicService?: string) {
  let query = createBrowserSupabaseClient().from('vendor_service_packages').select('*').eq('vendor_id', vendor);
  if (publicService) query = query.eq('active', true).eq('service_id', publicService);
  const { data, error } = await query.order('display_order').order('id');
  if (error) throw Error(error.message);
  return data;
}

export async function listServiceChecklists(vendor: string) {
  const { data, error } = await createBrowserSupabaseClient().from('vendor_service_checklists')
    .select('*').eq('vendor_id', vendor);
  if (error) throw Error(error.message);
  return data;
}

export async function saveServicePackage(vendor: string, service: string, fields: PackageFields, previous?: ServicePackage) {
  const table = createBrowserSupabaseClient().from('vendor_service_packages');
  const { data, error } = previous
    ? await table.update(fields).eq('id', previous.id).eq('vendor_id', vendor).eq('service_id', service).eq('version', previous.version).select().maybeSingle()
    : await table.insert({ ...fields, vendor_id: vendor, service_id: service }).select().single();
  if (error) throw Error(error.message);
  if (!data) throw Error('The package changed. Reopen the catalog before saving.');
  return data;
}

export async function saveServiceChecklist(vendor: string, service: string, tasks: string[], previous?: ServiceChecklist) {
  const table = createBrowserSupabaseClient().from('vendor_service_checklists');
  const { data, error } = previous
    ? await table.update({ tasks }).eq('vendor_id', vendor).eq('service_id', service).eq('version', previous.version).select().maybeSingle()
    : await table.insert({ tasks, vendor_id: vendor, service_id: service }).select().single();
  if (error) throw Error(error.message);
  if (!data) throw Error('The checklist changed. Reopen the catalog before saving.');
  return data;
}
