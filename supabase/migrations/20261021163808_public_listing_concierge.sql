-- Public listings are real businesses without synthetic owner accounts.
alter table public.vendor_businesses alter column owner_id drop not null;
alter table public.vendor_businesses add column claimed_at timestamptz;
create table public.listing_sources (
 id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.vendor_businesses(id) on delete cascade,
 source_url text not null check(source_url ~ '^https?://'), source_type text not null,
 supported_fields text[] not null default '{}', note text, recorded_at timestamptz not null default now()
);
create table public.vendor_claim_requests (
 id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.vendor_businesses(id),
 claimant_id uuid not null references public.profiles(id), relationship text not null,
 business_email text, business_phone text, verification_note text,
 status text not null default 'pending' check(status in('pending','approved','rejected','cancelled')),
 reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now()
);
create unique index one_pending_claim on public.vendor_claim_requests(vendor_id,claimant_id) where status='pending';
create table public.concierge_leads (
 id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.vendor_businesses(id),
 planner_id uuid not null references public.profiles(id), event_id uuid not null references public.events(id),
 service_id uuid references public.vendor_services(id), customer_note text, stage_label text,
 requested_start_time time, requested_end_time time,
 status text not null default 'new' check(status in('new','contacted','interested','declined','unreachable','converted','closed','withdrawn')),
 quote_request_id uuid unique references public.quote_requests(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_open_concierge_intent on public.concierge_leads(event_id,vendor_id,coalesce(service_id,'00000000-0000-0000-0000-000000000000'::uuid),coalesce(stage_label,''),coalesce(requested_start_time,'00:00'::time),coalesce(requested_end_time,'00:00'::time)) where status not in('closed','withdrawn','declined','unreachable');
create table public.concierge_outreach_notes (
 id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.concierge_leads(id),
 author_id uuid not null references public.profiles(id), note text not null, created_at timestamptz not null default now()
);
alter table public.quote_requests add column concierge_lead_id uuid unique references public.concierge_leads(id);
alter table public.listing_sources enable row level security;
alter table public.vendor_claim_requests enable row level security;
alter table public.concierge_leads enable row level security;
alter table public.concierge_outreach_notes enable row level security;
revoke all on public.listing_sources,public.vendor_claim_requests,public.concierge_leads,public.concierge_outreach_notes from anon,authenticated;
grant select on public.listing_sources,public.vendor_claim_requests,public.concierge_leads,public.concierge_outreach_notes to authenticated;
create policy sources_admin_read on public.listing_sources for select to authenticated using(public.is_admin());
create policy claims_own_read on public.vendor_claim_requests for select to authenticated using(claimant_id=private.request_actor() or public.is_admin());
create policy leads_own_read on public.concierge_leads for select to authenticated using(planner_id=private.request_actor() or public.is_admin());
create policy outreach_admin_read on public.concierge_outreach_notes for select to authenticated using(public.is_admin());
create index concierge_planner on public.concierge_leads(planner_id);
create index concierge_vendor on public.concierge_leads(vendor_id);
create index concierge_event on public.concierge_leads(event_id);
create index claims_claimant on public.vendor_claim_requests(claimant_id);
create index sources_vendor on public.listing_sources(vendor_id);
create index outreach_lead on public.concierge_outreach_notes(lead_id);

create function private.guard_listing_owner() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to manage listings'; end if;
 if not public.is_admin() then
   if tg_op='INSERT' then
     -- Preserve existing owner onboarding, but never allow an unowned listing or a claimed timestamp.
     if new.owner_id is distinct from private.request_actor() or new.claimed_at is not null then raise exception 'Invalid listing ownership'; end if;
   elsif new.owner_id is distinct from old.owner_id or new.approval_status is distinct from old.approval_status or new.claimed_at is distinct from old.claimed_at then
     raise exception 'Only ARIVVIO may verify ownership or publication';
   end if;
 end if;
 return new;
end $$;
create trigger listing_owner_guard before insert or update on public.vendor_businesses for each row execute function private.guard_listing_owner();

-- Public wrapper is invoker-only. This private implementation authorizes every action.
create function private.listing_operation(operation text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid; v public.vendor_businesses; c public.vendor_claim_requests; l public.concierge_leads;
 e public.events; q public.quote_requests; sid uuid; note text; desired text; rid uuid;
begin
 actor=private.request_actor();
 if octet_length(payload::text)>30000 then raise exception 'Listing details are too long'; end if;
 if operation in('save_listing','review_claim','update_lead','handoff','admin') and not public.is_admin() then raise exception 'Admin access required'; end if;
 if operation='admin' then
   return jsonb_build_object(
    'listings',coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from public.vendor_businesses b),'[]'::jsonb),
    'services',coalesce((select jsonb_agg(to_jsonb(vs)) from public.vendor_services vs),'[]'::jsonb),
    'tags',coalesce((select jsonb_agg(to_jsonb(vt)) from public.vendor_tags vt),'[]'::jsonb),
    'sources',coalesce((select jsonb_agg(to_jsonb(s)) from public.listing_sources s),'[]'::jsonb),
    'claims',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('claimant_email',p.email) order by r.created_at desc) from public.vendor_claim_requests r join public.profiles p on p.id=r.claimant_id),'[]'::jsonb),
    'leads',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('event_title',ev.title,'event_date',ev.date,'event_city',ev.city,'planner_email',p.email,'service_name',s.service_name) order by a.created_at desc) from public.concierge_leads a join public.events ev on ev.id=a.event_id join public.profiles p on p.id=a.planner_id left join public.vendor_services s on s.id=a.service_id),'[]'::jsonb),
    'notes',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from public.concierge_outreach_notes n),'[]'::jsonb));
 elsif operation='save_listing' then
   if length(btrim(coalesce(payload->>'business_name','')))=0 or length(btrim(coalesce(payload->>'category','')))=0 then raise exception 'Business name and category are required'; end if;
   if payload->>'id' is not null then
    select * into v from public.vendor_businesses where id=(payload->>'id')::uuid for update;
    if v.id is null or v.owner_id is not null then raise exception 'Only unclaimed listings can be edited here'; end if;
   end if;
   desired=case when payload->>'publish'='true' then 'approved' else 'pending' end;
   if desired='approved' and not (coalesce(payload->>'source_url','') ~ '^https?://' or exists(select 1 from public.listing_sources where vendor_id=v.id)) then raise exception 'Add a factual source before publishing'; end if;
   if nullif(payload->>'website_url','') is not null and not(payload->>'website_url' ~ '^https?://') then raise exception 'Use an http or https website URL'; end if;
   if v.id is null then
    insert into public.vendor_businesses(owner_id,business_name,category,approval_status) values(null,btrim(payload->>'business_name'),payload->>'category','pending') returning * into v;
   end if;
   update public.vendor_businesses set business_name=btrim(payload->>'business_name'),category=payload->>'category',
    description=nullif(payload->>'description',''),service_area_city=nullif(payload->>'city',''),
    base_address=nullif(payload->>'address',''),website_url=nullif(payload->>'website_url',''),phone=nullif(payload->>'phone',''),email=nullif(payload->>'email',''),
    approval_status=desired::public.approval_status where id=v.id returning * into v;
   if nullif(payload->>'source_url','') is not null then
    if jsonb_array_length(coalesce(payload->'supported_fields','[]'))=0 then raise exception 'Record which facts the source supports'; end if;
    insert into public.listing_sources(vendor_id,source_url,source_type,supported_fields,note)
    values(v.id,payload->>'source_url',coalesce(nullif(payload->>'source_type',''),'official website'),array(select jsonb_array_elements_text(coalesce(payload->'supported_fields','[]'))),nullif(payload->>'source_note',''));
   end if;
   select id into sid from public.vendor_services where vendor_id=v.id order by id limit 1;
   if sid is null then insert into public.vendor_services(vendor_id,service_name,category,description,pricing_type) values(v.id,v.business_name,v.category,v.description,'flat') returning id into sid; end if;
   update public.vendor_services set service_name=v.business_name,category=v.category,description=v.description,event_types_supported=array(select jsonb_array_elements_text(coalesce(payload->'event_types','[]'))) where id=sid;
   delete from public.vendor_tags where vendor_id=v.id;
   insert into public.vendor_tags(vendor_id,tag) select v.id,btrim(value) from jsonb_array_elements_text(coalesce(payload->'tags','[]')) where btrim(value)<>'' on conflict do nothing;
   return to_jsonb(v);
 elsif operation='claim' then
   select * into v from public.vendor_businesses where id=(payload->>'vendor_id')::uuid for update;
   if v.id is null or v.owner_id is not null or v.approval_status<>'approved' then raise exception 'This listing is not available to claim'; end if;
   if length(btrim(coalesce(payload->>'relationship','')))=0 or (nullif(btrim(payload->>'business_email'),'') is null and nullif(btrim(payload->>'business_phone'),'') is null) then raise exception 'Provide your relationship and a business contact'; end if;
   if length(coalesce(payload->>'verification_note',''))>2000 then raise exception 'Keep your note under 2000 characters'; end if;
   insert into public.vendor_claim_requests(vendor_id,claimant_id,relationship,business_email,business_phone,verification_note)
    values(v.id,actor,payload->>'relationship',payload->>'business_email',payload->>'business_phone',payload->>'verification_note')
    on conflict (vendor_id,claimant_id) where status='pending' do update set relationship=excluded.relationship returning * into c;
   return to_jsonb(c);
 elsif operation='review_claim' then
   select vendor_id into rid from public.vendor_claim_requests where id=(payload->>'id')::uuid;
   select * into v from public.vendor_businesses where id=rid for update;
   select * into c from public.vendor_claim_requests where id=(payload->>'id')::uuid for update;
   if c.id is null or c.status<>'pending' or c.claimant_id=actor then raise exception 'Claim cannot be reviewed'; end if;
   desired=payload->>'status';
   if desired is null or desired not in('approved','rejected') then raise exception 'Invalid review decision'; end if;
   if desired='approved' then
    if v.owner_id is not null then raise exception 'Business already claimed'; end if;
    update public.vendor_businesses set owner_id=c.claimant_id,claimed_at=now() where id=v.id;
    update public.vendor_claim_requests set status='rejected',reviewed_by=actor,reviewed_at=now() where vendor_id=v.id and status='pending' and id<>c.id;
   end if;
   update public.vendor_claim_requests set status=desired,reviewed_by=actor,reviewed_at=now() where id=c.id returning * into c;
   return to_jsonb(c);
 elsif operation='lead' then
   select * into v from public.vendor_businesses where id=(payload->>'vendor_id')::uuid for update;
   if v.id is null or v.owner_id is not null or v.approval_status<>'approved' then raise exception 'This listing cannot receive concierge interest'; end if;
   select * into e from public.events where id=(payload->>'event_id')::uuid and planner_id=actor for share;
   if e.id is null or e.status in('cancelled','completed') then raise exception 'Choose your editable event'; end if;
   sid=nullif(payload->>'service_id','')::uuid;
   if sid is not null and not exists(select 1 from public.vendor_services where id=sid and vendor_id=v.id and active) then raise exception 'Invalid service'; end if;
   note=nullif(btrim(payload->>'customer_note'),'');
   if length(note)>4000 or length(coalesce(payload->>'stage_label',''))>120 then raise exception 'Request details are too long'; end if;
   insert into public.concierge_leads(vendor_id,planner_id,event_id,service_id,customer_note,stage_label,requested_start_time,requested_end_time)
    values(v.id,actor,e.id,sid,note,nullif(btrim(payload->>'stage_label'),''),nullif(payload->>'start_time','')::time,nullif(payload->>'end_time','')::time)
    on conflict do nothing returning * into l;
   if l.id is null then
    select * into l from public.concierge_leads where event_id=e.id and vendor_id=v.id and service_id is not distinct from sid
     and coalesce(stage_label,'')=coalesce(nullif(btrim(payload->>'stage_label'),''),'')
     and coalesce(requested_start_time,'00:00')=coalesce(nullif(payload->>'start_time','')::time,'00:00')
     and coalesce(requested_end_time,'00:00')=coalesce(nullif(payload->>'end_time','')::time,'00:00') and status not in('closed','withdrawn','declined','unreachable');
   end if;
   return to_jsonb(l);
 elsif operation in('update_lead','withdraw','handoff') then
   select * into l from public.concierge_leads where id=(payload->>'id')::uuid for update;
   if l.id is null then raise exception 'Lead unavailable'; end if;
   if operation='handoff' then
    if l.quote_request_id is not null then return jsonb_build_object('quote_request_id',l.quote_request_id); end if;
    if l.status in('closed','withdrawn','declined','unreachable') then raise exception 'Closed leads cannot be handed off'; end if;
    select * into v from public.vendor_businesses where id=l.vendor_id for share;
    if v.owner_id is null or v.owner_id=l.planner_id or v.approval_status<>'approved' then raise exception 'Approve the business claim first'; end if;
    select * into e from public.events where id=l.event_id for share;
    if e.status in('cancelled','completed') then raise exception 'Event is read only'; end if;
    insert into public.quote_requests(event_id,planner_id,vendor_id,service_id,message,requested_start_time,requested_end_time,guest_count,concierge_lead_id)
     values(l.event_id,l.planner_id,l.vendor_id,l.service_id,l.customer_note,l.requested_start_time,l.requested_end_time,e.guest_count,l.id) returning * into q;
    update public.quote_requests set request_context=request_context||jsonb_build_object('origin','ARIVVIO concierge','requested_stage',l.stage_label) where id=q.id;
    update public.concierge_leads set status='converted',quote_request_id=q.id,updated_at=now() where id=l.id;
    return jsonb_build_object('quote_request_id',q.id);
   end if;
   if l.status in('converted','withdrawn','closed') then raise exception 'This lead is closed'; end if;
   if operation='withdraw' then
    if l.planner_id<>actor then raise exception 'Lead unavailable'; end if;
    desired='withdrawn';
   else
    desired=payload->>'status';
    if desired is null or desired not in('new','contacted','interested','declined','unreachable','closed') then raise exception 'Invalid outreach status'; end if;
    note=nullif(btrim(payload->>'note'),'');
    if length(note)>4000 then raise exception 'Keep outreach notes under 4000 characters'; end if;
    if note is not null then insert into public.concierge_outreach_notes(lead_id,author_id,note) values(l.id,actor,note); end if;
   end if;
   update public.concierge_leads set status=desired,updated_at=now() where id=l.id returning * into l;
   return to_jsonb(l);
 elsif operation='mine' then
   return jsonb_build_object(
    'claims',coalesce((select jsonb_agg(to_jsonb(mc)) from public.vendor_claim_requests mc where mc.claimant_id=actor),'[]'::jsonb),
    'leads',coalesce((select jsonb_agg(to_jsonb(ml)||jsonb_build_object('business_name',b.business_name,'event_title',ev.title) order by ml.created_at desc) from public.concierge_leads ml join public.vendor_businesses b on b.id=ml.vendor_id join public.events ev on ev.id=ml.event_id where ml.planner_id=actor),'[]'::jsonb));
 end if;
 raise exception 'Unknown listing operation';
end $$;
create function public.listing_operation(operation text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.listing_operation(operation,payload)$$;
revoke all on function private.guard_listing_owner(),private.listing_operation(text,jsonb),public.listing_operation(text,jsonb) from public,anon,authenticated;
grant execute on function private.listing_operation(text,jsonb),public.listing_operation(text,jsonb) to authenticated;

create or replace function private.guard_new_request() returns trigger language plpgsql security definer set search_path='' as $$
declare provider uuid;
begin
 if new.concierge_lead_id is not null and not (
 public.is_admin() and exists(select 1 from public.concierge_leads l where l.id=new.concierge_lead_id
 and l.planner_id=new.planner_id and l.event_id=new.event_id and l.vendor_id=new.vendor_id
 and l.service_id is not distinct from new.service_id and l.quote_request_id is null
 and l.status not in('closed','withdrawn','declined','unreachable','converted'))
 ) then raise exception 'Invalid concierge handoff'; end if;
 if new.planner_id is distinct from private.request_actor() and new.concierge_lead_id is null then raise exception 'Only the event owner can send a request'; end if;
 provider=private.request_provider(new.vendor_id,new.venue_id);
 if provider is null or provider=new.planner_id or not exists(select 1 from public.profiles where id=provider and user_id is not null) then raise exception 'This provider cannot receive direct requests'; end if;
 if new.vendor_id is not null and not exists(select 1 from public.vendor_businesses where id=new.vendor_id and approval_status='approved') then raise exception 'Provider is not available for requests'; end if;
 if new.venue_id is not null and (new.service_id is not null or not exists(select 1 from public.venues where id=new.venue_id and approval_status='approved')) then raise exception 'Venue is not available for requests'; end if;
 if new.service_id is not null and not exists(select 1 from public.vendor_services where id=new.service_id and vendor_id=new.vendor_id and active) then raise exception 'Service is unavailable'; end if;
 if not exists(select 1 from public.events where id=new.event_id and planner_id=new.planner_id and status not in ('cancelled','completed')) then raise exception 'This event is not accepting requests'; end if;
 if new.status<>'pending' or new.vendor_final_price is not null then raise exception 'New requests must wait for a provider quote'; end if;
 if new.guest_count<0 or new.estimated_price<0 then raise exception 'Invalid request details'; end if;
 new.message=nullif(btrim(new.message),'');
 if length(new.message)>4000 then raise exception 'Keep your note under 4000 characters'; end if;
 new.quote_revision=0; new.created_at=now(); new.updated_at=now(); new.request_context=private.request_context_for(new);
 return new;
end $$;

create or replace function private.guard_event_relationship() returns trigger
language plpgsql security definer set search_path='' as $$
declare owner_id uuid; owner_user uuid;
begin
 select e.planner_id,p.user_id into owner_id,owner_user from public.events e join public.profiles p on p.id=e.planner_id where e.id=new.event_id;
 if owner_id is null or new.planner_id is distinct from owner_id then raise exception 'Request or booking does not belong to this event'; end if;
 if tg_op='INSERT' and (select auth.uid()) is distinct from owner_user and not (
 tg_table_name='quote_requests' and public.is_admin() and exists(select 1 from public.concierge_leads l
 where l.id=(to_jsonb(new)->>'concierge_lead_id')::uuid and l.event_id=new.event_id and l.planner_id=new.planner_id
 and l.vendor_id=new.vendor_id and l.service_id is not distinct from new.service_id and l.quote_request_id is null
 and l.status not in('closed','withdrawn','declined','unreachable','converted'))
 ) then raise exception 'Only the event owner can create this record'; end if;
 if tg_op='UPDATE' and (new.event_id<>old.event_id or new.planner_id<>old.planner_id or new.vendor_id is distinct from old.vendor_id or new.venue_id is distinct from old.venue_id or new.service_id is distinct from old.service_id) then raise exception 'Request and booking identity cannot change'; end if;
 if new.service_id is not null and not exists(select 1 from public.vendor_services s where s.id=new.service_id and s.vendor_id=new.vendor_id) then raise exception 'Service does not belong to this provider'; end if;
 if tg_table_name='bookings' then
 if tg_op='UPDATE' and new.quote_request_id is distinct from old.quote_request_id then raise exception 'Booking request cannot change'; end if;
 if new.quote_request_id is not null and not exists(select 1 from public.quote_requests q where q.id=new.quote_request_id and q.event_id=new.event_id and q.planner_id=new.planner_id and q.vendor_id is not distinct from new.vendor_id and q.venue_id is not distinct from new.venue_id and q.service_id is not distinct from new.service_id) then raise exception 'Booking does not belong to this request'; end if;
 end if;
 return new;
end $$;

create or replace function private.guard_event() returns trigger language plpgsql security definer set search_path='' as $$
declare p jsonb; plan jsonb;
begin
 if tg_op='DELETE' then
  if exists(select 1 from public.concierge_leads where event_id=old.id) or old.status not in ('draft','planning') or exists(select 1 from public.quote_requests where event_id=old.id) or exists(select 1 from public.bookings where event_id=old.id) or exists(select 1 from public.messages m where m.quote_request_id in (select id from public.quote_requests where event_id=old.id) or m.booking_id in (select id from public.bookings where event_id=old.id)) then
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
