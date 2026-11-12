export type ClientFields = {
  display_name: string;
  email: string;
  phone: string;
  other_contact: string;
  notes: string;
};

export type VendorClient = ClientFields & {
  id: string;
  vendor_id: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  version: number;
};

export const blankClient: ClientFields = {
  display_name: '', email: '', phone: '', other_contact: '', notes: '',
};

export function matchesClient(client: ClientFields, query: string) {
  const search = query.trim().toLowerCase();
  return [client.display_name, client.email, client.phone, client.other_contact]
    .some(value => value.toLowerCase().includes(search));
}
