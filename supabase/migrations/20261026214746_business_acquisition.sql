-- Research workflow is operational. It never grants business authority.
create table public.business_research (
 id uuid primary key default gen_random_uuid(),
 import_key text not null unique,
 details jsonb not null,
 status text not null default 'research' check(status in('research','review','ready','published','needs_recheck')),
 vendor_id uuid unique references public.vendor_businesses(id) on delete restrict,
 created_by uuid not null references public.profiles(id),
 reviewed_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.business_research enable row level security;
revoke all on public.business_research from public,anon,authenticated;
grant select on public.business_research to authenticated;
create policy research_admin_read on public.business_research for select to authenticated using(public.is_admin());
alter table public.listing_sources add column researched_on date, add column reviewed_on date, add column reviewed_by uuid references public.profiles(id);

create function private.validate_research(d jsonb) returns void language plpgsql set search_path='' as $$
declare s jsonb; f jsonb;
begin
 if jsonb_typeof(d)<>'object' or octet_length(d::text)>20000 then raise exception 'Invalid research row'; end if;
 if length(btrim(coalesce(d->>'business_name','')))=0 or length(btrim(coalesce(d->>'city','')))=0 or length(btrim(coalesce(d->>'description','')))=0 then raise exception 'Name, city and original summary required'; end if;
 if coalesce(d->>'website_url','') !~ '^https?://[^/@[:space:]]+\.[^/@[:space:]]+' then raise exception 'Official website required'; end if;
 if d ?| array['owner_id','verification_status','verified_at','latitude','longitude','price','rating'] then raise exception 'Authority, prices, ratings and coordinates cannot be imported'; end if;
 if jsonb_typeof(d->'services') is distinct from 'array' then raise exception 'Services required'; end if;
 if jsonb_array_length(d->'services') not between 1 and 12 then raise exception 'Provide 1 to 12 services'; end if;
 for s in select value from jsonb_array_elements(d->'services') loop
  if coalesce(s->>'category','') not in('Venue','Catering','Cake & Desserts','DJ','Live Music','Magic','Character Performers','Balloons','Bounce Houses','Photo Booth','Photography','Florals','Rentals','Transportation','Party Bus','Valet','Security','Staffing','Bartending','Cleaning','AV Production','Registration','Invitations','Printed Materials','Printed Programs','Live Streaming','Booth Rentals','Portable Restrooms') then raise exception 'Unknown service category'; end if;
  if jsonb_typeof(s->'event_types') is distinct from 'array' then raise exception 'Event types must be an array'; end if;
 end loop;
 if (select count(*)<>count(distinct value->>'category') from jsonb_array_elements(d->'services')) then raise exception 'Repeated service category'; end if;
 if jsonb_typeof(d->'sources') is distinct from 'array' then raise exception 'Sources required'; end if;
 if jsonb_array_length(d->'sources') not between 1 and 12 then raise exception 'Provide 1 to 12 sources'; end if;
 for f in select value from jsonb_array_elements(d->'sources') loop
  if coalesce(f->>'url','') !~ '^https?://[^/@[:space:]]+\.[^/@[:space:]]+' or length(btrim(coalesce(f->>'type','')))=0 or jsonb_typeof(f->'facts') is distinct from 'array' then raise exception 'Source URL, type and supported facts required'; end if;
  if jsonb_array_length(f->'facts')=0 then raise exception 'Source-supported facts required'; end if;
  if nullif(f->>'researched_on','') is null or nullif(f->>'reviewed_on','') is null or (f->>'researched_on')::date > (f->>'reviewed_on')::date or (f->>'reviewed_on')::date>current_date then raise exception 'Invalid research/review dates'; end if;
 end loop;
end $$;

create function private.acquisition_operation(operation text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; d jsonb; r public.business_research; key text; matches jsonb; out jsonb; v jsonb; s jsonb; f jsonb; desired text;
begin
 actor=private.request_actor();
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if octet_length(payload::text)>25000 then raise exception 'Submit one research row at a time'; end if;
 if operation='list' then return coalesce((select jsonb_agg(to_jsonb(b) order by updated_at desc) from public.business_research b),'[]'); end if;
 if operation in('preview','import') then
  d=payload->'details'; perform private.validate_research(d);
  key=md5(lower(regexp_replace(concat_ws('|',d->>'business_name',d->>'city',d->>'address',d->>'location_name',private.business_domain(d->>'website_url')),'[^a-zA-Z0-9|]','','g')));
  select * into r from public.business_research where import_key=key;
  matches=private.business_matches(d);
  out=jsonb_build_object('matches',matches,'existing_draft',r.id);
  if operation='preview' then return out; end if;
  if r.id is not null then return out||jsonb_build_object('result','already_imported','draft',to_jsonb(r)); end if;
  insert into public.business_research(import_key,details,created_by) values(key,d,actor) on conflict(import_key) do nothing returning * into r;
  if r.id is null then select * into r from public.business_research where import_key=key; return out||jsonb_build_object('result','already_imported','draft',to_jsonb(r)); end if;
  return out||jsonb_build_object('result','imported','draft',to_jsonb(r));
 end if;
 if operation='recheck_listing' then
  if not exists(select 1 from public.listing_sources where vendor_id=(payload->>'vendor_id')::uuid) then raise exception 'No sources to recheck'; end if;
  update public.listing_sources set reviewed_on=current_date,reviewed_by=actor where vendor_id=(payload->>'vendor_id')::uuid;
  insert into public.business_trust_audit(vendor_id,actor_id,action,note) values((payload->>'vendor_id')::uuid,actor,'listing_sources_rechecked','Admin confirmed source review');
  return jsonb_build_object('ok',true);
 end if;
 if operation='outreach' then
  if exists(select 1 from private.business_contact_suppression where vendor_id=(payload->>'vendor_id')::uuid and suppressed) then raise exception 'Do not contact: outreach is suppressed'; end if;
  if not exists(select 1 from public.vendor_businesses where id=(payload->>'vendor_id')::uuid and owner_id is null and approval_status='approved') then raise exception 'Published unclaimed listing required'; end if;
  return jsonb_build_object('allowed',true);
 end if;
 select * into r from public.business_research where id=(payload->>'id')::uuid for update;
 if r.id is null then raise exception 'Research draft not found'; end if;
 if operation='save' then
  if r.vendor_id is not null then raise exception 'Edit published facts in the listing editor'; end if;
  d=payload->'details'; perform private.validate_research(d);
  update public.business_research set details=d,status='research',reviewed_by=null,updated_at=now() where id=r.id returning * into r;
 elsif operation='status' then
  desired=payload->>'status';
  if not ((r.status='research' and desired='review') or (r.status='review' and desired='ready') or (r.status='ready' and desired='review') or (r.status='published' and desired='needs_recheck')) then raise exception 'Invalid workflow transition'; end if;
  perform private.validate_research(r.details);
  update public.business_research set status=desired,reviewed_by=actor,updated_at=now() where id=r.id returning * into r;
 elsif operation='recheck' then
  if r.vendor_id is null then raise exception 'Published listing required'; end if;
  update public.listing_sources set reviewed_on=current_date,reviewed_by=actor where vendor_id=r.vendor_id;
  update public.business_research set status='published',reviewed_by=actor,updated_at=now(),details=jsonb_set(details,'{sources}',(select jsonb_agg(value||jsonb_build_object('reviewed_on',current_date)) from jsonb_array_elements(details->'sources'))) where id=r.id returning * into r;
 elsif operation='publish' then
  if r.vendor_id is not null then return jsonb_build_object('result','already_published','draft',to_jsonb(r)); end if;
  if r.status<>'ready' then raise exception 'Review and mark ready before publishing'; end if;
  d=r.details; perform private.validate_research(d);
  -- Serialize publication so concurrent drafts cannot race the duplicate check.
  perform pg_advisory_xact_lock(71821433);
  if exists(select 1 from public.vendor_businesses b where private.business_domain(b.website_url)=private.business_domain(d->>'website_url') and lower(coalesce(b.service_area_city,''))=lower(d->>'city') and (lower(coalesce(b.base_address,''))=lower(coalesce(d->>'address','')) and lower(coalesce(b.location_name,''))=lower(coalesce(d->>'location_name','')))) then raise exception 'Existing business/location. Edit the canonical listing instead'; end if;
  f=d->'sources'->0; s=d->'services'->0;
  v=private.listing_operation('save_listing',jsonb_build_object('business_name',d->>'business_name','city',d->>'city','address',d->>'address','location_name',d->>'location_name','website_url',d->>'website_url','phone',d->>'phone','email',d->>'email','description',d->>'description','category',s->>'category','event_types',s->'event_types','source_url',f->>'url','source_type',f->>'type','supported_fields',f->'facts','separate_reason',d->>'separate_reason','publish',true));
  -- Add services to this same business identity, never extra businesses.
  for s in select value from jsonb_array_elements(d->'services') with ordinality x(value,n) where n>1 loop
   insert into public.vendor_services(vendor_id,service_name,category,description,pricing_type,event_types_supported) values((v->>'id')::uuid,(d->>'business_name')||' · '||(s->>'category'),s->>'category',d->>'description','flat',array(select jsonb_array_elements_text(s->'event_types')));
  end loop;
  update public.listing_sources set researched_on=(f->>'researched_on')::date,reviewed_on=(f->>'reviewed_on')::date,reviewed_by=actor where vendor_id=(v->>'id')::uuid;
  for f in select value from jsonb_array_elements(d->'sources') with ordinality x(value,n) where n>1 loop
   insert into public.listing_sources(vendor_id,source_url,source_type,supported_fields,researched_on,reviewed_on,reviewed_by) values((v->>'id')::uuid,f->>'url',f->>'type',array(select jsonb_array_elements_text(f->'facts')),(f->>'researched_on')::date,(f->>'reviewed_on')::date,actor);
  end loop;
  update public.business_research set status='published',vendor_id=(v->>'id')::uuid,reviewed_by=actor,updated_at=now() where id=r.id returning * into r;
 else raise exception 'Unknown acquisition operation';
 end if;
 return to_jsonb(r);
end $$;
create function public.acquisition_operation(operation text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.acquisition_operation(operation,payload) $$;
revoke all on function private.validate_research(jsonb),private.acquisition_operation(text,jsonb),public.acquisition_operation(text,jsonb) from public,anon,authenticated;
grant execute on function private.acquisition_operation(text,jsonb),public.acquisition_operation(text,jsonb) to authenticated;
