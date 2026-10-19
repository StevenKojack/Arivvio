-- Canonical event persistence. Existing requests, bookings and messages remain unchanged.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
alter table public.events add column if not exists source_event_id text;
alter table public.events add column if not exists profile_revision integer not null default 0;
create unique index if not exists events_import_identity on public.events(planner_id,source_event_id) where source_event_id is not null;

create or replace function private.event_owner(e uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.events join public.profiles on profiles.id=events.planner_id where events.id=e and profiles.user_id=(select auth.uid()));
$$;
revoke all on function private.event_owner(uuid) from public;
grant execute on function private.event_owner(uuid) to authenticated;
create or replace function private.guard_event() returns trigger language plpgsql security definer set search_path='' as $$
declare p jsonb; plan jsonb;
begin
 if tg_op='DELETE' then
  if old.status not in ('draft','planning') or exists(select 1 from public.quote_requests where event_id=old.id) or exists(select 1 from public.bookings where event_id=old.id) or exists(select 1 from public.messages m where m.quote_request_id in (select id from public.quote_requests where event_id=old.id) or m.booking_id in (select id from public.bookings where event_id=old.id)) then
   raise exception 'Only planning events without request or booking history can be deleted. Cancel this event to preserve its history.';
  end if;
  return old;
 end if;
 if tg_op='INSERT' then new.profile_revision=0; end if;
 if tg_op='UPDATE' then
  if new.id<>old.id or new.planner_id<>old.planner_id or new.source_event_id is distinct from old.source_event_id then raise exception 'Event identity cannot change'; end if;
  if old.status in ('cancelled','completed') and (to_jsonb(new)-'profile_revision') is distinct from (to_jsonb(old)-'profile_revision') then raise exception 'This event is read only'; end if;
  new.profile_revision=old.profile_revision+1;
 end if;
 p=new.event_profile;
 if p ? 'eventType' then
  if jsonb_typeof(p->'eventType') is distinct from 'object' or coalesce(p#>>'{eventType,value}','')='' or jsonb_typeof(p->'stages') is distinct from 'array' or jsonb_typeof(p->'plannerIntent') is distinct from 'object' or octet_length(p::text)>250000 then raise exception 'Invalid canonical event profile'; end if;
  new.event_profile=jsonb_set(p,'{eventId}',to_jsonb(new.id::text));
  plan=p->'planning';
  new.event_type=p#>>'{eventType,value}';
  new.date=case when (plan->>'date') ~ '^\d{4}-\d{2}-\d{2}$' then (plan->>'date')::date else null end;
  new.start_time=case when (plan->>'startTime') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then (plan->>'startTime')::time else null end;
  new.end_time=case when (plan->>'endTime') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then (plan->>'endTime')::time else null end;
  new.address=nullif(plan->>'location','');
  new.guest_count=nullif(coalesce(plan->>'guestCount',p->>'guestSize'),'0')::integer;
  new.budget_max=nullif(plan->>'budget','0')::numeric;
  new.venue_needed=coalesce((p->>'venueRequired')::boolean,true);
  if new.guest_count<0 or new.budget_max<0 then raise exception 'Guest count and budget must not be negative'; end if;
 end if;
 return new;
end $$;
create trigger customer_event_guard before insert or update or delete on public.events for each row execute function private.guard_event();

create or replace function public.manage_customer_event(target_event uuid,operation text) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if not private.event_owner(target_event) then raise exception 'Event not available'; end if;
 if operation='delete' then delete from public.events where id=target_event;
 elsif operation='cancel' then update public.events set status='cancelled' where id=target_event;
 else raise exception 'Unknown event operation'; end if;
 return true;
end $$;
revoke all on function private.guard_event() from public,anon,authenticated;
revoke all on function public.manage_customer_event(uuid,text) from public,anon;
grant execute on function public.manage_customer_event(uuid,text) to authenticated;

-- Existing participant RLS remains in force. These guards bind every linked row
-- to its actual event owner and prevent changing its identity after creation.
create or replace function private.guard_event_relationship() returns trigger
language plpgsql security definer set search_path='' as $$
declare owner_id uuid; owner_user uuid;
begin
 select e.planner_id,p.user_id into owner_id,owner_user from public.events e join public.profiles p on p.id=e.planner_id where e.id=new.event_id;
 if owner_id is null or new.planner_id is distinct from owner_id then raise exception 'Request or booking does not belong to this event'; end if;
 if tg_op='INSERT' and (select auth.uid()) is distinct from owner_user then raise exception 'Only the event owner can create this record'; end if;
 if tg_op='UPDATE' and (new.event_id<>old.event_id or new.planner_id<>old.planner_id or new.vendor_id is distinct from old.vendor_id or new.venue_id is distinct from old.venue_id or new.service_id is distinct from old.service_id) then raise exception 'Request and booking identity cannot change'; end if;
 if new.service_id is not null and not exists(select 1 from public.vendor_services s where s.id=new.service_id and s.vendor_id=new.vendor_id) then raise exception 'Service does not belong to this provider'; end if;
 if tg_table_name='bookings' then
 if tg_op='UPDATE' and new.quote_request_id is distinct from old.quote_request_id then raise exception 'Booking request cannot change'; end if;
 if new.quote_request_id is not null and not exists(select 1 from public.quote_requests q where q.id=new.quote_request_id and q.event_id=new.event_id and q.planner_id=new.planner_id and q.vendor_id is not distinct from new.vendor_id and q.venue_id is not distinct from new.venue_id and q.service_id is not distinct from new.service_id) then raise exception 'Booking does not belong to this request'; end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_event_relationship() from public,anon,authenticated;
create trigger customer_quote_relationship before insert or update on public.quote_requests for each row execute function private.guard_event_relationship();
create trigger customer_booking_relationship before insert or update on public.bookings for each row execute function private.guard_event_relationship();

-- Database constraints supplement the existing owner-scoped guest policies.
alter table public.guests add constraint guests_nonnegative_plus_ones check (plus_ones>=0) not valid;
