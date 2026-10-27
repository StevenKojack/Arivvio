-- Manual operations only. No owner assignment, messaging, or verification writes.
create table private.vendor_acquisition_state (
 vendor_id uuid primary key references public.vendor_businesses(id),
 state text not null default 'not_contacted' check(state in('not_contacted','contact_planned','contacted','follow_up_needed','interested','not_interested')),
 follow_up_on date,
 updated_by uuid not null references public.profiles(id), updated_at timestamptz not null default now()
);
create table private.vendor_contact_attempts (
 id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.vendor_businesses(id),
 lead_id uuid references public.concierge_leads(id), contacted_at timestamptz not null,
 channel text not null check(channel in('phone','email','in_person','other')),
 outcome text not null check(outcome in('contacted','follow_up_needed','interested','not_interested')),
 note text not null check(length(btrim(note)) between 1 and 2000), follow_up_on date,
 actor_id uuid not null references public.profiles(id), created_at timestamptz not null default now(),
 client_key uuid not null unique
);
create index vendor_contact_history on private.vendor_contact_attempts(vendor_id,contacted_at desc);
create table private.business_map_confirmations (
 vendor_id uuid primary key references public.vendor_businesses(id), address text not null,
 feature_id text not null, matched_address text not null, latitude double precision not null,longitude double precision not null,
 actor_id uuid not null references public.profiles(id), confirmed_at timestamptz not null default now()
);
alter table private.vendor_acquisition_state enable row level security;
alter table private.vendor_contact_attempts enable row level security;
alter table private.business_map_confirmations enable row level security;
create policy acquisition_admin_read on private.vendor_acquisition_state for select to authenticated using(public.is_admin());
create policy contact_admin_read on private.vendor_contact_attempts for select to authenticated using(public.is_admin());
create policy map_admin_read on private.business_map_confirmations for select to authenticated using(public.is_admin());
revoke all on private.vendor_acquisition_state,private.vendor_contact_attempts,private.business_map_confirmations from public,anon,authenticated;

create function private.activation_operation(operation text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; v public.vendor_businesses; a private.vendor_contact_attempts; desired text; contact_time timestamptz; follow_date date; lead uuid; lat double precision; lng double precision; result jsonb;
begin
 actor=private.request_actor();
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if octet_length(payload::text)>10000 then raise exception 'Payload too large'; end if;
 if operation='list' then
  return coalesce((select jsonb_agg(to_jsonb(b)||jsonb_build_object(
   'state',coalesce(s.state,'not_contacted'),'follow_up_on',s.follow_up_on,
   'suppressed',coalesce(d.suppressed,false),
   'pending_claims',(select count(*) from public.vendor_claim_requests c where c.vendor_id=b.id and c.status='pending'),
   'ready',b.owner_id is not null and b.verification_status='verified' and b.verified_at is not null and b.approval_status='approved' and not b.vacation_mode and length(btrim(coalesce(b.description,'')))>0 and length(btrim(coalesce(b.service_area_city,'')))>0 and exists(select 1 from public.vendor_services vs where vs.vendor_id=b.id and vs.active),
   'attempts',coalesce((select jsonb_agg(to_jsonb(h) order by h.contacted_at desc) from private.vendor_contact_attempts h where h.vendor_id=b.id),'[]'::jsonb)
  ) order by b.business_name) from public.vendor_businesses b left join private.vendor_acquisition_state s on s.vendor_id=b.id left join private.business_contact_suppression d on d.vendor_id=b.id),'[]'::jsonb);
 end if;
 select * into v from public.vendor_businesses where id=(payload->>'vendor_id')::uuid for update;
 if v.id is null then raise exception 'Business not found'; end if;
 if operation='confirm_map' then
  if coalesce(payload->>'confirmed','false')<>'true' or coalesce(payload->>'is_fallback','true')<>'false' or coalesce(payload->>'place_type','')<>'address' or coalesce(payload->>'permanent','false')<>'true' then raise exception 'Select and explicitly confirm a permanent address match'; end if;
  if length(btrim(coalesce(v.base_address,'')))=0 or payload->>'address' is distinct from v.base_address or coalesce(payload->>'fixed_location','false')<>'true' then raise exception 'Confirm a factual fixed address. Reopen if listing changed'; end if;
  if length(btrim(coalesce(payload->>'feature_id','')))=0 or length(btrim(coalesce(payload->>'matched_address','')))=0 then raise exception 'Address match required'; end if;
  lat=(payload->>'latitude')::double precision; lng=(payload->>'longitude')::double precision;
  if lat is null or lng is null or not(lat between -90 and 90) or not(lng between -180 and 180) then raise exception 'Invalid coordinates'; end if;
  insert into private.business_map_confirmations values(v.id,v.base_address,payload->>'feature_id',payload->>'matched_address',lat,lng,actor,now()) on conflict(vendor_id) do update set address=excluded.address,feature_id=excluded.feature_id,matched_address=excluded.matched_address,latitude=excluded.latitude,longitude=excluded.longitude,actor_id=actor,confirmed_at=now();
  update public.vendor_businesses set latitude=lat,longitude=lng where id=v.id;
  insert into public.business_trust_audit(vendor_id,actor_id,action,note) values(v.id,actor,'map_location_confirmed',payload->>'matched_address');
  return jsonb_build_object('ok',true);
 end if;
 -- Fail closed even if suppression changed after this screen loaded.
 if exists(select 1 from private.business_contact_suppression where vendor_id=v.id and suppressed) then raise exception 'Do not contact: outreach is suppressed'; end if;
 if operation='prepare_interest' then
  select jsonb_build_object('event_type',e.event_type,'city',e.city,'date',e.date) into result from public.concierge_leads l join public.events e on e.id=l.event_id where l.id=(payload->>'lead_id')::uuid and l.vendor_id=v.id and l.status not in('withdrawn','closed','converted','declined');
  if result is null then raise exception 'Active customer interest required'; end if;
  return result;
 end if;
 if operation='plan' then
  desired=payload->>'state';
  if desired not in('not_contacted','contact_planned','follow_up_needed') or desired is null then raise exception 'Use an actual contact record for contact outcomes'; end if;
  if desired='not_contacted' and exists(select 1 from private.vendor_contact_attempts where vendor_id=v.id) then raise exception 'Contact history already exists'; end if;
 elsif operation='record_contact' then
  if payload->>'confirmed' is distinct from 'true' then raise exception 'Confirm this contact actually occurred'; end if;
  desired=payload->>'outcome'; contact_time=(payload->>'contacted_at')::timestamptz;
  if contact_time is null or contact_time>now() then raise exception 'Contact date must be in the past'; end if;
  if desired is null or desired not in('contacted','follow_up_needed','interested','not_interested') then raise exception 'Invalid contact outcome'; end if;
  if payload->>'client_key' is null then raise exception 'Retry key required'; end if;
  select * into a from private.vendor_contact_attempts where client_key=(payload->>'client_key')::uuid;
  if a.id is not null then
   if a.vendor_id<>v.id then raise exception 'Retry key belongs to another business'; end if;
   return to_jsonb(a);
  end if;
  lead=nullif(payload->>'lead_id','')::uuid;
  if lead is not null and not exists(select 1 from public.concierge_leads where id=lead and vendor_id=v.id) then raise exception 'Lead belongs to another business'; end if;
 else raise exception 'Unknown activation operation';
 end if;
 follow_date=nullif(payload->>'follow_up_on','')::date;
 if follow_date<current_date or (desired='follow_up_needed' and follow_date is null) then raise exception 'Choose a current or future follow-up date'; end if;
 if desired='not_interested' then follow_date=null; end if;
 if operation='record_contact' then
  insert into private.vendor_contact_attempts(vendor_id,lead_id,contacted_at,channel,outcome,note,follow_up_on,actor_id,client_key) values(v.id,lead,contact_time,payload->>'channel',desired,btrim(payload->>'note'),follow_date,actor,(payload->>'client_key')::uuid) returning * into a;
 end if;
 insert into private.vendor_acquisition_state(vendor_id,state,follow_up_on,updated_by) values(v.id,desired,follow_date,actor) on conflict(vendor_id) do update set state=excluded.state,follow_up_on=excluded.follow_up_on,updated_by=actor,updated_at=now();
 insert into public.business_trust_audit(vendor_id,actor_id,action,note) values(v.id,actor,case when operation='plan' then 'outreach_plan_updated' else 'manual_contact_recorded' end,desired);
 return jsonb_build_object('ok',true,'attempt',to_jsonb(a));
end $$;
create function public.activation_operation(operation text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.activation_operation(operation,payload)$$;
revoke all on function private.activation_operation(text,jsonb),public.activation_operation(text,jsonb) from public,anon,authenticated;
grant execute on function private.activation_operation(text,jsonb),public.activation_operation(text,jsonb) to authenticated;
