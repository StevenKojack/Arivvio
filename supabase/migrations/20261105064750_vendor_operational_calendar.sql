-- Private operational records. No customer accounts, messages, payments or public availability writes.
create table public.vendor_calendar_events (
 id uuid primary key default gen_random_uuid(),
 vendor_id uuid not null references public.vendor_businesses(id) on delete restrict,
 name text not null check(length(btrim(name)) between 1 and 200),
 date date not null, end_date date not null,
 start_time time not null, end_time time not null,
 timezone text not null,
 status text not null default 'Tentative' check(status in('Hold','Tentative','Confirmed','Completed','Cancelled')),
 event_type text not null default '' check(length(event_type)<=200),
 client_name text not null default '' check(length(client_name)<=200),
 client_contact text not null default '' check(length(client_contact)<=500),
 location text not null default '' check(length(location)<=1000),
 service_id uuid references public.vendor_services(id) on delete set null,
 notes text not null default '' check(length(notes)<=10000),
 tasks jsonb not null default '[]'::jsonb,
 version integer not null default 1,
 created_by uuid not null references public.profiles(id), updated_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(end_date in(date,date+1)), check(end_date+end_time>date+start_time),
 check(end_date+end_time<=date+start_time+interval '24 hours'),
 check(start_time<time '24:00' and end_time<time '24:00')
);
create index vendor_calendar_schedule on public.vendor_calendar_events(vendor_id,date,end_date);
create index vendor_calendar_service on public.vendor_calendar_events(service_id);
create index vendor_calendar_created_actor on public.vendor_calendar_events(created_by);
create index vendor_calendar_updated_actor on public.vendor_calendar_events(updated_by);
alter table public.vendor_calendar_events enable row level security;
revoke all on public.vendor_calendar_events from anon,authenticated;
grant select,insert,update on public.vendor_calendar_events to authenticated;
create policy calendar_read on public.vendor_calendar_events for select to authenticated using(private.business_editor(vendor_id));
create policy calendar_create on public.vendor_calendar_events for insert to authenticated with check(private.business_editor(vendor_id));
create policy calendar_edit on public.vendor_calendar_events for update to authenticated using(private.business_editor(vendor_id)) with check(private.business_editor(vendor_id));
create function private.guard_vendor_calendar() returns trigger language plpgsql security invoker set search_path='' as $$
declare actor uuid; task jsonb;
begin
 actor=private.request_actor();
 if not private.business_editor(new.vendor_id) then raise exception 'Business editor required'; end if;
 if tg_op='UPDATE' then
  if new.id<>old.id or new.vendor_id<>old.vendor_id then raise exception 'Event business identity cannot change'; end if;
  new.created_at=old.created_at;new.created_by=old.created_by;new.version=old.version+1;
 else new.created_at=now();new.created_by=actor;new.version=1;end if;
 new.updated_by=actor;new.updated_at=clock_timestamp();
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) then raise exception 'Choose a valid IANA timezone';end if;
 -- Reject nonexistent local wall times during the spring DST jump.
 if ((new.date+new.start_time) at time zone new.timezone) at time zone new.timezone <> new.date+new.start_time
 or ((new.end_date+new.end_time) at time zone new.timezone) at time zone new.timezone <> new.end_date+new.end_time then raise exception 'This local time does not exist because of daylight saving. Choose another time.';end if;
 if new.service_id is not null and not exists(select 1 from public.vendor_services where id=new.service_id and vendor_id=new.vendor_id) then raise exception 'Service must belong to this business';end if;
 if jsonb_typeof(new.tasks)<>'array' or jsonb_array_length(new.tasks)>100 then raise exception 'Use at most 100 preparation tasks';end if;
 for task in select value from jsonb_array_elements(new.tasks) loop
 if jsonb_typeof(task)<>'object' or jsonb_typeof(task->'title') is distinct from 'string' or length(btrim(task->>'title')) not between 1 and 300 or jsonb_typeof(task->'done') is distinct from 'boolean' then raise exception 'Each task needs a title and completion state';end if;
 end loop;
 return new;
end $$;
revoke all on function private.guard_vendor_calendar() from public,anon;
create trigger guard_vendor_calendar before insert or update on public.vendor_calendar_events for each row execute function private.guard_vendor_calendar();
