alter table public.vendor_services add constraint vendor_services_branch_id_key unique (vendor_id, id);

create table public.vendor_service_packages (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null,
  service_id uuid not null,
  name text not null check (length(btrim(name)) between 1 and 200),
  description text not null default '' check (length(description) <= 3000),
  inclusions text[] not null default '{}' check (cardinality(inclusions) <= 100),
  pricing_model text not null default 'quote' check (pricing_model in ('quote','flat','hourly','per_guest')),
  amount numeric(12,2) check (amount between 0 and 9999999999.99),
  minimum_hours numeric(5,2) check (minimum_hours > 0),
  minimum_guests integer check (minimum_guests between 1 and 1000000),
  active boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  version integer not null default 1,
  foreign key (vendor_id, service_id) references public.vendor_services(vendor_id, id) on delete restrict,
  check ((pricing_model = 'quote') = (amount is null)),
  check (minimum_hours is null or pricing_model = 'hourly'),
  check (minimum_guests is null or pricing_model = 'per_guest')
);
create index vendor_service_packages_parent on public.vendor_service_packages(vendor_id, service_id, display_order, id);

create table public.vendor_service_checklists (
  vendor_id uuid not null,
  service_id uuid not null,
  tasks text[] not null default '{}' check (cardinality(tasks) <= 100),
  version integer not null default 1,
  primary key (vendor_id, service_id),
  foreign key (vendor_id, service_id) references public.vendor_services(vendor_id, id) on delete restrict
);

alter table public.vendor_service_packages enable row level security;
alter table public.vendor_service_checklists enable row level security;
revoke all on public.vendor_service_packages, public.vendor_service_checklists from public, anon, authenticated;
grant select on public.vendor_service_packages to anon, authenticated;
grant select on public.vendor_service_checklists to authenticated;
grant insert (vendor_id,service_id,name,description,inclusions,pricing_model,amount,minimum_hours,minimum_guests,active,display_order),
  update (name,description,inclusions,pricing_model,amount,minimum_hours,minimum_guests,active,display_order)
  on public.vendor_service_packages to authenticated;
grant insert (vendor_id,service_id,tasks), update (tasks) on public.vendor_service_checklists to authenticated;

create policy eligible_service_packages on public.vendor_service_packages for select to anon, authenticated
using (active and exists (
  select 1 from public.vendor_services s join public.vendor_businesses b on b.id = s.vendor_id
  where s.id = vendor_service_packages.service_id and s.vendor_id = vendor_service_packages.vendor_id and s.active
  and b.approval_status = 'approved' and b.owner_id is not null and not b.vacation_mode
));
create policy editor_packages_read on public.vendor_service_packages for select to authenticated using (private.business_editor(vendor_id));
create policy editor_packages_insert on public.vendor_service_packages for insert to authenticated with check (private.business_editor(vendor_id));
create policy editor_packages_update on public.vendor_service_packages for update to authenticated
using (private.business_editor(vendor_id)) with check (private.business_editor(vendor_id));
create policy editor_checklists_read on public.vendor_service_checklists for select to authenticated using (private.business_editor(vendor_id));
create policy editor_checklists_insert on public.vendor_service_checklists for insert to authenticated with check (private.business_editor(vendor_id));
create policy editor_checklists_update on public.vendor_service_checklists for update to authenticated
using (private.business_editor(vendor_id)) with check (private.business_editor(vendor_id));

create function private.validate_catalog_list() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare entries text[];
begin
  if tg_table_name = 'vendor_service_packages' then entries := new.inclusions;
  else entries := new.tasks; end if;
  if exists(select 1 from unnest(entries) as item where item is null or length(btrim(item)) not between 1 and 300) then
    raise exception 'Each list item needs 1 to 300 characters';
  end if;
  if tg_op = 'UPDATE' then new.version := old.version + 1; end if;
  return new;
end $$;
revoke all on function private.validate_catalog_list() from public, anon, authenticated;
create trigger validate_package before insert or update on public.vendor_service_packages
for each row execute function private.validate_catalog_list();
create trigger validate_checklist before insert or update on public.vendor_service_checklists
for each row execute function private.validate_catalog_list();
