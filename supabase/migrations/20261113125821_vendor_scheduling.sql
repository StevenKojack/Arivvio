create table public.vendor_working_hours (
  vendor_id uuid primary key references public.vendor_businesses(id) on delete cascade,
  timezone text not null,
  weekly_hours jsonb,
  version integer not null default 1
);

create table public.vendor_service_scheduling (
  vendor_id uuid not null,
  service_id uuid not null,
  capacity integer check (capacity between 1 and 1000),
  setup_minutes integer not null default 0 check (setup_minutes between 0 and 1440),
  breakdown_minutes integer not null default 0 check (breakdown_minutes between 0 and 1440),
  version integer not null default 1,
  primary key (vendor_id,service_id),
  foreign key (vendor_id,service_id) references public.vendor_services(vendor_id,id) on delete cascade
);

alter table public.vendor_working_hours enable row level security;
alter table public.vendor_service_scheduling enable row level security;
revoke all on public.vendor_working_hours, public.vendor_service_scheduling from public,anon,authenticated;
grant select on public.vendor_working_hours, public.vendor_service_scheduling to authenticated;
grant insert(vendor_id,timezone,weekly_hours), update(timezone,weekly_hours) on public.vendor_working_hours to authenticated;
grant insert(vendor_id,service_id,capacity,setup_minutes,breakdown_minutes),
  update(capacity,setup_minutes,breakdown_minutes) on public.vendor_service_scheduling to authenticated;

create policy working_hours_editor on public.vendor_working_hours for all to authenticated
  using (private.business_editor(vendor_id)) with check (private.business_editor(vendor_id));
create policy service_scheduling_editor on public.vendor_service_scheduling for all to authenticated
  using (private.business_editor(vendor_id)) with check (private.business_editor(vendor_id));

create function private.validate_working_hours() returns trigger
language plpgsql set search_path='' as $$
declare slot jsonb;
begin
  if new.timezone <> 'UTC' and (new.timezone !~ '^[A-Za-z]+/[A-Za-z0-9_+/-]+$'
    or new.timezone ~ '^(posix|right)/'
    or not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone)) then
    raise exception 'Choose a valid IANA timezone';
  end if;
  if new.weekly_hours is not null then
    if jsonb_typeof(new.weekly_hours) <> 'array' or jsonb_array_length(new.weekly_hours)>56 then
      raise exception 'Enter up to 56 weekly intervals';
    end if;
    for slot in select value from jsonb_array_elements(new.weekly_hours) loop
      if jsonb_typeof(slot) <> 'object' or coalesce(slot->>'day','') !~ '^[0-6]$'
        or coalesce(slot->>'start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        or coalesce(slot->>'end','') !~ '^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$'
        or slot->>'start'=slot->>'end' then raise exception 'Enter a valid weekly interval'; end if;
    end loop;
    if exists (
      with slots as (
        select value, ordinality, (value->>'day')::int * 1440 + extract(epoch from (value->>'start')::time)/60 as starts,
        (value->>'day')::int * 1440 + extract(epoch from (value->>'end')::time)/60 +
          case when value->>'end' < value->>'start' then 1440 else 0 end as ends
        from jsonb_array_elements(new.weekly_hours) with ordinality
      )
      select 1 from slots a join slots b on a.ordinality<b.ordinality
      cross join (values(-10080),(0),(10080)) as shift(minutes)
      where a.starts < b.ends+shift.minutes and b.starts+shift.minutes < a.ends
    ) then raise exception 'Weekly intervals must not overlap'; end if;
  end if;
  if tg_op='UPDATE' then new.version := old.version+1; end if;
  return new;
end $$;
create function private.bump_service_schedule_version() returns trigger
language plpgsql set search_path='' as $$
begin
  new.version := old.version+1;
  return new;
end $$;
revoke all on function private.validate_working_hours(), private.bump_service_schedule_version() from public,anon,authenticated;
create trigger validate_working_hours before insert or update on public.vendor_working_hours
for each row execute function private.validate_working_hours();
create trigger version_service_schedule before update on public.vendor_service_scheduling
for each row execute function private.bump_service_schedule_version();
