create table public.vendor_clients (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_businesses(id) on delete restrict,
  display_name text not null check (length(btrim(display_name)) between 1 and 200),
  email text not null default '' check (length(email) <= 320),
  phone text not null default '' check (length(phone) <= 80),
  other_contact text not null default '' check (length(other_contact) <= 500),
  notes text not null default '' check (length(notes) <= 10000),
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  unique (vendor_id, id)
);

alter table public.vendor_clients enable row level security;
revoke all on public.vendor_clients from public, anon, authenticated;
grant select, insert, update on public.vendor_clients to authenticated;
create policy vendor_clients_read on public.vendor_clients for select to authenticated
  using (private.business_editor(vendor_id));
create policy vendor_clients_create on public.vendor_clients for insert to authenticated
  with check (private.business_editor(vendor_id));
create policy vendor_clients_edit on public.vendor_clients for update to authenticated
  using (private.business_editor(vendor_id)) with check (private.business_editor(vendor_id));

create function private.guard_vendor_client() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare actor uuid := private.request_actor();
begin
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.vendor_id <> old.vendor_id then
      raise exception 'Client business identity cannot change';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.version := old.version + 1;
  else
    new.created_by := actor;
    new.created_at := now();
    new.version := 1;
  end if;
  new.display_name := btrim(new.display_name);
  new.updated_by := actor;
  new.updated_at := clock_timestamp();
  return new;
end $$;
revoke all on function private.guard_vendor_client() from public, anon, authenticated;
create trigger guard_vendor_client before insert or update on public.vendor_clients
  for each row execute function private.guard_vendor_client();

-- Existing events retain their name/contact snapshots and are left unlinked.
alter table public.vendor_calendar_events add column client_id uuid;
alter table public.vendor_calendar_events add constraint vendor_calendar_client_branch_fk
  foreign key (vendor_id, client_id) references public.vendor_clients(vendor_id, id) on delete restrict;
create index vendor_calendar_client_history on public.vendor_calendar_events(vendor_id, client_id, date)
  where client_id is not null;
