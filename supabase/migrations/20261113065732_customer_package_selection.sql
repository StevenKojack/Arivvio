alter table public.vendor_service_packages
  add constraint vendor_service_packages_selection_key unique (vendor_id, service_id, id);

alter table public.cart_items
  add column package_id uuid,
  add column package_snapshot jsonb,
  add constraint cart_package_pair check ((package_id is null) = (package_snapshot is null)),
  add constraint cart_package_parent foreign key (vendor_id, service_id, package_id)
    references public.vendor_service_packages(vendor_id, service_id, id),
  add constraint cart_package_provider check (package_id is null or
    (vendor_id is not null and service_id is not null and venue_id is null));

alter table public.quote_requests
  add column package_id uuid,
  add column package_snapshot jsonb,
  add constraint request_package_pair check ((package_id is null) = (package_snapshot is null)),
  add constraint request_package_parent foreign key (vendor_id, service_id, package_id)
    references public.vendor_service_packages(vendor_id, service_id, id),
  add constraint request_package_provider check (package_id is null or
    (vendor_id is not null and service_id is not null and venue_id is null));

create index cart_package_parent_idx on public.cart_items(vendor_id,service_id,package_id) where package_id is not null;
create index request_package_parent_idx on public.quote_requests(vendor_id,service_id,package_id) where package_id is not null;

-- The snapshot includes only customer-visible fields. Hold eligibility stable through the write.
create function private.read_eligible_package(business uuid, service uuid, package uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare snapshot jsonb;
begin
  select jsonb_build_object('id',p.id,'service_id',p.service_id,'name',p.name,
    'description',p.description,'inclusions',p.inclusions,'pricing_model',p.pricing_model,
    'amount',p.amount,'minimum_hours',p.minimum_hours,'minimum_guests',p.minimum_guests)
  into snapshot
  from public.vendor_service_packages p
  join public.vendor_services s on s.id=p.service_id and s.vendor_id=p.vendor_id
  join public.vendor_businesses b on b.id=p.vendor_id
  join public.vendor_business_memberships m on m.vendor_id=b.id and m.profile_id=b.owner_id
  where p.id=package and p.service_id=service and p.vendor_id=business
    and p.active and s.active and not b.vacation_mode and b.approval_status='approved'
    and b.verification_status='verified' and b.verified_at is not null
    and m.role='owner' and m.status='active'
  for share of p,s,b,m;
  if snapshot is null then
    raise exception 'This package is unavailable. Review the package in your cart before sending.';
  end if;
  return snapshot;
end $$;

create function private.guard_cart_package()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op='UPDATE' then
    if (old.package_id is not null or new.package_id is not null)
      and old.status <> 'draft' and
      (new.package_id,new.package_snapshot,new.vendor_id,new.service_id,new.event_id,new.venue_id)
      is distinct from (old.package_id,old.package_snapshot,old.vendor_id,old.service_id,old.event_id,old.venue_id)
    then raise exception 'Only draft cart items can change packages'; end if;
    if (new.package_id,new.package_snapshot,new.vendor_id,new.service_id,new.venue_id)
      is not distinct from (old.package_id,old.package_snapshot,old.vendor_id,old.service_id,old.venue_id)
    then return new; end if;
  end if;
  if new.package_id is null then
    new.package_snapshot := null;
    return new;
  end if;
  if new.status <> 'draft' or new.venue_id is not null then
    raise exception 'Choose a package for a draft vendor service';
  end if;
  if private.request_actor() is null or not exists(
    select 1 from public.events e where e.id=new.event_id and e.planner_id=private.request_actor()
    and e.status not in ('cancelled','completed')
  ) then raise exception 'Choose a package for an active event you own'; end if;
  new.package_snapshot := private.read_eligible_package(new.vendor_id,new.service_id,new.package_id);
  return new;
end $$;

create function private.guard_request_package()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare snapshot jsonb;
begin
  if tg_op='UPDATE' then
    if (old.package_id is not null or new.package_id is not null)
      and (new.package_id,new.package_snapshot,new.vendor_id,new.service_id,new.venue_id)
      is distinct from (old.package_id,old.package_snapshot,old.vendor_id,old.service_id,old.venue_id)
    then raise exception 'The original requested package cannot change'; end if;
    return new;
  end if;
  if new.package_id is null then
    new.package_snapshot := null;
    return new;
  end if;
  if new.planner_id is distinct from private.request_actor() then
    raise exception 'Only the event owner can request a package';
  end if;
  snapshot := private.read_eligible_package(new.vendor_id,new.service_id,new.package_id);
  if new.package_snapshot is distinct from snapshot then
    raise exception 'This package changed. Review the package in your cart before sending.';
  end if;
  new.package_snapshot := snapshot;
  new.estimated_price := null;
  return new;
end $$;

revoke all on function private.read_eligible_package(uuid,uuid,uuid),
  private.guard_cart_package(), private.guard_request_package() from public,anon,authenticated;
-- Invoker triggers call the helper only in the private schema, which is outside the Data API.
grant execute on function private.read_eligible_package(uuid,uuid,uuid) to authenticated;

create trigger guard_cart_package before insert or update on public.cart_items
for each row execute function private.guard_cart_package();
create trigger guard_request_package before insert or update on public.quote_requests
for each row execute function private.guard_request_package();
