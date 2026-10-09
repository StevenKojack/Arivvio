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
  if old.status not in ('draft','planning') or exists(select 1 from public.quote_requests where event_id=old.id) or exists(select 1 from public.bookings where event_id=old.id) then
   raise exception 'Only planning events without request or booking history can be deleted. Cancel this event to preserve its history.';
  end if;
  return old;
 end if;
 if tg_op='UPDATE' then
  if new.id<>old.id or new.planner_id<>old.planner_id or new.source_event_id is distinct from old.source_event_id then raise exception 'Event identity cannot change'; end if;
  if old.status in ('cancelled','completed') and new.event_profile is distinct from old.event_profile then raise exception 'This event is read only'; end if;
  new.profile_revision=old.profile_revision+1;
 end if;
 p=new.event_profile;
 if p ? 'eventType' then
  if jsonb_typeof(p->'eventType')<>'object' or coalesce(p#>>'{eventType,value}','')='' or jsonb_typeof(p->'stages')<>'array' or jsonb_typeof(p->'plannerIntent')<>'object' or octet_length(p::text)>250000 then raise exception 'Invalid canonical event profile'; end if;
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
