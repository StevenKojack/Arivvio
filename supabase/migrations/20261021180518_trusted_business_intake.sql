-- Business identity, account identity and authority are separate. No name uniqueness.
alter table public.vendor_businesses
 add column applicant_id uuid references public.profiles(id),
 add column verification_status text not null default 'unverified' check(verification_status in('unverified','pending','needs_more_information','verified','rejected','disputed','suspended','legacy_review')),
 add column verified_at timestamptz,
 add column location_name text,
 add column postal_code text,
 add column registration_reference text,
 add column official_domain text,
 add column official_phone text,
 add column identity_source_url text,
 add column review_message text,
 add column normalized_name text,
 add column normalized_domain text,
 add column normalized_phone text;
alter table public.vendor_businesses alter column approval_status set default 'pending';
-- Disable the previous owner-only trigger during the tracked backfill.
drop trigger listing_owner_guard on public.vendor_businesses;
update public.vendor_businesses set verification_status='legacy_review' where owner_id is not null;
create table public.vendor_business_memberships (
 id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.vendor_businesses(id),
 profile_id uuid references public.profiles(id), email text not null, role text not null check(role in('owner','admin','manager','staff')),
 status text not null check(status in('invited','active','revoked')), invited_by uuid references public.profiles(id),
 created_at timestamptz not null default now(), accepted_at timestamptz, revoked_at timestamptz, expires_at timestamptz,
 unique(vendor_id,email)
);
create unique index business_member_profile on public.vendor_business_memberships(vendor_id,profile_id) where profile_id is not null;
insert into public.vendor_business_memberships(vendor_id,profile_id,email,role,status,accepted_at)
 select b.id,p.id,lower(p.email),'owner','active',now() from public.vendor_businesses b join public.profiles p on p.id=b.owner_id;
alter table public.vendor_claim_requests add column location_scope text, add column review_message text;
-- Existing owners retain compatibility memberships, but must complete evidence review.
insert into public.vendor_claim_requests(vendor_id,claimant_id,relationship,location_scope,verification_note)
 select b.id,b.owner_id,'Legacy account holder: authority review required',coalesce(b.location_name,b.service_area_city,b.business_name),'Created by trust migration for evidence review. Existing ownership is not proof of verification.'
 from public.vendor_businesses b where b.owner_id is not null
 and not exists(select 1 from public.vendor_claim_requests c where c.vendor_id=b.id and c.claimant_id=b.owner_id and c.status='pending');
create table public.business_verification_evidence (
 id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.vendor_businesses(id),
 claim_id uuid not null references public.vendor_claim_requests(id), claimant_id uuid not null references public.profiles(id),
 method text not null check(method in('domain_email','public_phone','public_record')),
 status text not null check(status in('passed','failed','expired')), source_reference text not null,
 identity_confirmed boolean not null default false, authority_confirmed boolean not null default false,
 location_scope text not null, note text not null, reviewed_by uuid references public.profiles(id),
 created_at timestamptz not null default now(), completed_at timestamptz not null default now(), expires_at timestamptz not null default (now()+interval '90 days')
);
create table public.business_trust_audit (
 id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.vendor_businesses(id),
 actor_id uuid references public.profiles(id), action text not null, reference_id uuid, note text,
 created_at timestamptz not null default now()
);
create table public.business_access_requests (
 id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.vendor_businesses(id),
 profile_id uuid not null references public.profiles(id), note text not null, status text not null default 'pending' check(status in('pending','closed')),
 created_at timestamptz not null default now()
);
create unique index one_access_request on public.business_access_requests(vendor_id,profile_id) where status='pending';
create table private.business_trust_limits (id boolean primary key default true check(id), pending_limit integer not null, daily_limit integer not null default 10, rejection_cooldown interval not null);
insert into private.business_trust_limits (id,pending_limit,rejection_cooldown) values(true,5,interval '7 days');
create index trust_evidence_claim on public.business_verification_evidence(claim_id);
create index trust_audit_vendor on public.business_trust_audit(vendor_id,created_at);
create index member_profile on public.vendor_business_memberships(profile_id);
create index candidate_applicant on public.vendor_businesses(applicant_id);

-- Only the identity adapter knows the authentication provider's schema.
create function private.confirmed_business_email(person uuid) returns text language sql stable security definer set search_path='' as $$
 select lower(u.email) from public.profiles p join auth.users u on u.id=p.user_id where p.id=person and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
$$;
create function private.business_member(business uuid,roles text[] default array['owner','admin','manager','staff']) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and exists(
 select 1 from public.vendor_business_memberships m join public.profiles p on p.id=m.profile_id join public.vendor_businesses b on b.id=m.vendor_id
 where m.vendor_id=business and p.user_id=auth.uid() and m.status='active' and m.role=any(roles) and b.verification_status in('verified','legacy_review'))
$$;
create function private.business_editor(business uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.business_member(business,array['owner','admin','manager']) or exists(select 1 from public.vendor_businesses b join public.profiles p on p.id=b.applicant_id where b.id=business and p.user_id=auth.uid() and b.owner_id is null and b.approval_status='pending' and b.verification_status in('pending','needs_more_information'))
$$;
create function private.business_domain(value text) returns text language plpgsql immutable set search_path='' as $$
declare d text;
begin
 d=lower(btrim(value)); d=regexp_replace(d,'^https?://',''); d=split_part(d,'/',1); d=split_part(d,'?',1); d=split_part(d,'#',1); d=regexp_replace(d,'^www\.','');
 if d !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' or length(d)>253 then return null; end if; return d;
end $$;
create function private.normalize_business() returns trigger language plpgsql set search_path='' as $$
begin
 new.normalized_name=regexp_replace(lower(new.business_name),'[^a-z0-9]','','g');
 new.normalized_domain=private.business_domain(new.website_url);
 new.normalized_phone=regexp_replace(coalesce(new.phone,''),'[^0-9]','','g');
 if length(new.normalized_phone)=11 and left(new.normalized_phone,1)='1' then new.normalized_phone=substring(new.normalized_phone from 2); end if;
 return new;
end $$;
create trigger business_normalization before insert or update on public.vendor_businesses for each row execute function private.normalize_business();
update public.vendor_businesses set business_name=business_name;
create index business_domain_match on public.vendor_businesses(normalized_domain);
create index business_phone_match on public.vendor_businesses(normalized_phone);

-- Invoker trigger distinguishes direct API writes from validated privileged operations.
create or replace function private.guard_listing_owner() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user in('authenticated','anon','service_role') then
  if tg_op='INSERT' then raise exception 'Use the pending business intake'; end if;
  if (to_jsonb(new)-array['business_name','category','description','phone','service_area_city','service_radius_miles','website_url','base_address','vacation_mode','updated_at','normalized_name','normalized_domain','normalized_phone']) is distinct from
     (to_jsonb(old)-array['business_name','category','description','phone','service_area_city','service_radius_miles','website_url','base_address','vacation_mode','updated_at','normalized_name','normalized_domain','normalized_phone']) then raise exception 'Trust and ownership fields require verification review'; end if;
  if old.verification_status='verified' and (new.business_name,new.website_url,new.phone,new.base_address,new.service_area_city) is distinct from (old.business_name,old.website_url,old.phone,old.base_address,old.service_area_city) then raise exception 'Contact ARIVVIO to review changes to verified business identity'; end if;
 end if;
 return new;
end $$;
create trigger listing_owner_guard before insert or update on public.vendor_businesses for each row execute function private.guard_listing_owner();
revoke insert,delete on public.vendor_businesses from authenticated,anon;
drop policy vendor_businesses_owner_all on public.vendor_businesses;
drop policy if exists vendor_businesses_admin_read_update on public.vendor_businesses;
create policy business_private_read on public.vendor_businesses for select to authenticated using(public.is_admin() or private.business_member(id) or applicant_id=private.request_actor());
create policy business_profile_edit on public.vendor_businesses for update to authenticated using(private.business_editor(id)) with check(private.business_editor(id));
-- Replace every legacy owner-only child policy, including storage, below.
do $$ declare t text; p record; begin
 foreach t in array array['vendor_services','vendor_photos','vendor_availability','vendor_tags'] loop
  for p in select policyname from pg_policies where schemaname='public' and tablename=t and cmd='ALL' loop execute format('drop policy %I on public.%I',p.policyname,t); end loop;
  execute format('create policy business_team_edit on public.%I for all to authenticated using(private.business_editor(vendor_id)) with check(private.business_editor(vendor_id))',t);
 end loop;
end $$;
drop policy vendor_service_tags_owner_all on public.vendor_service_tags;
create policy business_team_tags on public.vendor_service_tags for all to authenticated using(exists(select 1 from public.vendor_services s where s.id=service_id and private.business_editor(s.vendor_id))) with check(exists(select 1 from public.vendor_services s where s.id=service_id and private.business_editor(s.vendor_id)));
-- Protected records are writable only through the operation boundary.
do $$ declare t text; begin
 foreach t in array array['vendor_business_memberships','business_verification_evidence','business_trust_audit','business_access_requests'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
create policy members_read on public.vendor_business_memberships for select to authenticated using(public.is_admin() or private.business_member(vendor_id,array['owner','admin']) or profile_id=private.request_actor() or email=private.confirmed_business_email(private.request_actor()));
create policy evidence_read on public.business_verification_evidence for select to authenticated using(public.is_admin() or claimant_id=private.request_actor());
create policy audit_admin_read on public.business_trust_audit for select to authenticated using(public.is_admin());
create policy access_read on public.business_access_requests for select to authenticated using(public.is_admin() or profile_id=private.request_actor() or private.business_member(vendor_id,array['owner','admin']));
create function private.business_matches(payload jsonb) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r) order by score desc,business_name),'[]') from (
 select b.id,b.business_name,b.category,b.service_area_city,b.base_address,b.location_name,b.website_url,b.phone,b.owner_id,
 (case when b.normalized_domain=private.business_domain(payload->>'website_url') then 60 else 0 end+
 case when length(b.normalized_phone)>=7 and b.normalized_phone=regexp_replace(regexp_replace(coalesce(payload->>'phone',''),'[^0-9]','','g'),'^1(?=[0-9]{10}$)','') then 60 else 0 end+
 case when length(coalesce(b.base_address,''))>5 and lower(b.base_address)=lower(payload->>'address') and lower(b.service_area_city)=lower(payload->>'city') then 70 else 0 end+
 case when b.normalized_name=regexp_replace(lower(payload->>'business_name'),'[^a-z0-9]','','g') then 25 else 0 end+
 case when b.normalized_name like '%'||regexp_replace(lower(payload->>'business_name'),'[^a-z0-9]','','g')||'%' and length(coalesce(payload->>'business_name',''))>=4 then 10 else 0 end+
 case when lower(b.service_area_city)=lower(payload->>'city') then 10 else 0 end+
 case when b.registration_reference is not null and b.registration_reference=payload->>'registration_reference' then 80 else 0 end) score
 from public.vendor_businesses b where (b.approval_status='approved' or public.is_admin()) and b.id::text is distinct from payload->>'id'
 ) r where score>=25
$$;
create function public.business_matches(payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.business_matches(payload) $$;

create function private.trust_operation(operation text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; v public.vendor_businesses; c public.vendor_claim_requests; m public.vendor_business_memberships; ev public.business_verification_evidence;
 rid uuid; result jsonb; email text; method text; decision text; limits private.business_trust_limits; note text; scope text; matched jsonb;
begin
 actor=private.request_actor();
 if octet_length(payload::text)>30000 then raise exception 'Details are too long'; end if;
 if operation in('evidence','review','identity','state','reopen','close_access','admin') and not public.is_admin() then raise exception 'Admin access required'; end if;
 if operation='admin' then
 return jsonb_build_object('evidence',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from public.business_verification_evidence e),
 'memberships',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.vendor_business_memberships x),
 'audit',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]') from public.business_trust_audit x),
 'access',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.business_access_requests x));
 elsif operation='mine' then
 return jsonb_build_object('actor_id',actor,'businesses',(select coalesce(jsonb_agg(to_jsonb(b)),'[]') from public.vendor_businesses b where b.applicant_id=actor or private.business_member(b.id)),
 'claims',(select coalesce(jsonb_agg(to_jsonb(mc)||jsonb_build_object('business_name',b.business_name,'verification_status',b.verification_status,'official_domain',b.official_domain,'review_message',coalesce(mc.review_message,b.review_message))),'[]') from public.vendor_claim_requests mc join public.vendor_businesses b on b.id=mc.vendor_id where mc.claimant_id=actor),
 'evidence',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from public.business_verification_evidence e where e.claimant_id=actor),
 'memberships',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.vendor_business_memberships x where x.profile_id=actor or x.email=private.confirmed_business_email(actor) or private.business_member(x.vendor_id,array['owner','admin'])));
 end if;
 if operation in('candidate','claim','domain_email','accept_invite') and private.confirmed_business_email(actor) is null then raise exception 'Confirm your account email before continuing business verification'; end if;
 select * into limits from private.business_trust_limits where id;
 if operation in('candidate','claim') then
  -- Serialize per account to enforce limits under concurrent requests.
  perform 1 from public.profiles where id=actor for update;
  if (select count(*) from public.vendor_claim_requests where claimant_id=actor and status='pending')>=limits.pending_limit then raise exception 'You have several open applications. Complete an existing review first'; end if;
  if (select count(*) from public.vendor_claim_requests where claimant_id=actor and created_at>now()-interval '1 day')>=limits.daily_limit then raise exception 'Daily application limit reached. Please continue an existing application'; end if;
  if operation='candidate' then
   if nullif(btrim(payload->>'business_name'),'') is null or nullif(btrim(payload->>'city'),'') is null or nullif(btrim(payload->>'category'),'') is null then raise exception 'Business name, city and category are required'; end if;
   matched=private.business_matches(payload);
   if jsonb_array_length(matched)>0 and length(btrim(coalesce(payload->>'separate_reason','')))<10 then return jsonb_build_object('matches',matched,'review_required',true); end if;
   insert into public.vendor_businesses(applicant_id,owner_id,business_name,category,service_area_city,base_address,postal_code,location_name,website_url,phone,description,approval_status,verification_status)
   values(actor,null,btrim(payload->>'business_name'),payload->>'category',payload->>'city',nullif(payload->>'address',''),nullif(payload->>'postal_code',''),nullif(payload->>'location_name',''),nullif(payload->>'website_url',''),nullif(payload->>'phone',''),nullif(payload->>'description',''),'pending','pending') returning * into v;
  else
   select * into v from public.vendor_businesses where id=(payload->>'vendor_id')::uuid for update;
   if v.id is null or v.owner_id is not null or v.approval_status<>'approved' or v.verification_status in('verified','disputed','suspended') then raise exception 'This business is not available to claim. Request team access or contact ARIVVIO'; end if;
   if exists(select 1 from public.vendor_claim_requests where vendor_id=v.id and claimant_id=actor and status='rejected' and reviewed_at>now()-limits.rejection_cooldown) then raise exception 'A recent claim was reviewed. Contact ARIVVIO before resubmitting'; end if;
  end if;
  if nullif(btrim(payload->>'relationship'),'') is null or nullif(btrim(payload->>'location_scope'),'') is null then raise exception 'Tell us your role and the specific location you represent'; end if;
  insert into public.vendor_claim_requests(vendor_id,claimant_id,relationship,business_email,business_phone,verification_note,location_scope)
   values(v.id,actor,left(payload->>'relationship',200),left(payload->>'business_email',254),left(payload->>'business_phone',80),left(concat_ws(E'\n',payload->>'verification_note',payload->>'separate_reason'),2000),left(payload->>'location_scope',300))
   on conflict(vendor_id,claimant_id) where status='pending' do update set relationship=excluded.relationship returning * into c;
  insert into public.business_trust_audit(vendor_id,actor_id,action,reference_id,note) values(v.id,actor,'claim_submitted',c.id,left(payload->>'separate_reason',2000));
  return to_jsonb(c);
 end if;
 if operation in('evidence','domain_email','review','reopen') then
  select vendor_id into rid from public.vendor_claim_requests where id=(payload->>'claim_id')::uuid;
 else rid=(payload->>'vendor_id')::uuid; end if;
 if operation='accept_invite' then select vendor_id into rid from public.vendor_business_memberships where id=(payload->>'id')::uuid; end if;
 select * into v from public.vendor_businesses where id=rid for update;
 if v.id is null then raise exception 'Business unavailable'; end if;
 note=left(btrim(payload->>'note'),2000);
 if operation='identity' then
  if length(coalesce(note,''))<10 or coalesce(payload->>'source_url','') !~ '^https?://' then raise exception 'Record independent source and review basis'; end if;
  update public.vendor_businesses set official_domain=private.business_domain(payload->>'website_url'),official_phone=nullif(payload->>'phone',''),identity_source_url=payload->>'source_url',registration_reference=nullif(payload->>'registration_reference','') where id=v.id;
  insert into public.listing_sources(vendor_id,source_url,source_type,supported_fields,note) values(v.id,payload->>'source_url','independent identity review',array['official_domain','official_phone','location'],note);
 elsif operation in('evidence','domain_email') then
  select * into c from public.vendor_claim_requests where id=(payload->>'claim_id')::uuid;
  if c.status<>'pending' or (operation='domain_email' and c.claimant_id<>actor) or (operation='evidence' and c.claimant_id=actor) then raise exception 'Claim cannot be verified by this account'; end if;
  if operation='domain_email' then
   email=private.confirmed_business_email(actor); method='domain_email';
   if v.official_domain is null or v.identity_source_url is null then raise exception 'ARIVVIO must independently confirm this location’s official domain first'; end if;
   decision=case when split_part(email,'@',2)=v.official_domain and v.official_domain not in('gmail.com','googlemail.com','yahoo.com','outlook.com','hotmail.com','icloud.com','aol.com','proton.me','protonmail.com','live.com','msn.com','mail.com','gmx.com','yandex.com') then 'passed' else 'failed' end;
   if exists(select 1 from public.business_verification_evidence e where e.claim_id=c.id and e.method='domain_email' and created_at>now()-interval '1 minute') then raise exception 'Please wait a minute before retrying'; end if;
   insert into public.business_verification_evidence(vendor_id,claim_id,claimant_id,method,status,source_reference,location_scope,note)
   values(v.id,c.id,actor,method,decision,v.identity_source_url,c.location_scope,'Confirmed account email checked against independently sourced exact domain. Admin must still verify location authority.') returning * into ev;
  else
   method=payload->>'method'; scope=btrim(payload->>'location_scope');
   if method is null or method not in('public_phone','public_record','domain_email') or length(coalesce(note,''))<15 or length(coalesce(scope,''))<3 or v.identity_source_url is null then raise exception 'Record identity source, method, location and authority verification notes'; end if;
   if method='public_phone' and (v.official_phone is null or coalesce(payload->>'source_reference','')<>v.official_phone) then raise exception 'Callback must use the independently sourced public phone'; end if;
   if method='domain_email' and not exists(select 1 from public.business_verification_evidence e where e.claim_id=c.id and e.method='domain_email' and status='passed' and expires_at>now()) then raise exception 'Claimant must pass official-domain email check first'; end if;
   if coalesce(payload->>'identity_confirmed','')<>'true' or coalesce(payload->>'authority_confirmed','')<>'true' or length(coalesce(payload->>'source_reference',''))<3 then raise exception 'Business existence and specific claimant authority must both be established'; end if;
   insert into public.business_verification_evidence(vendor_id,claim_id,claimant_id,method,status,source_reference,identity_confirmed,authority_confirmed,location_scope,note,reviewed_by)
   values(v.id,c.id,c.claimant_id,method,'passed',payload->>'source_reference',true,true,scope,note,actor) returning * into ev;
  end if;
  insert into public.business_trust_audit(vendor_id,actor_id,action,reference_id) values(v.id,actor,'verification_'||ev.status,ev.id);
  return to_jsonb(ev);
 elsif operation='review' then
  select * into c from public.vendor_claim_requests where id=(payload->>'claim_id')::uuid for update;
  if c.status<>'pending' or c.claimant_id=actor then raise exception 'Claim cannot be reviewed'; end if;
  decision=payload->>'decision';
  if decision='approved' then
   if (v.owner_id is not null and v.owner_id<>c.claimant_id) or v.verification_status in('disputed','suspended') then raise exception 'Resolve business control dispute before approving'; end if;
   if private.confirmed_business_email(c.claimant_id) is null then raise exception 'Claimant email is not confirmed'; end if;
   if not exists(select 1 from public.business_verification_evidence where claim_id=c.id and claimant_id=c.claimant_id and vendor_id=v.id and status='passed' and identity_confirmed and authority_confirmed and reviewed_by is not null and reviewed_by<>c.claimant_id and expires_at>now()) then raise exception 'Valid identity and location authority evidence required'; end if;
   update public.vendor_businesses set owner_id=c.claimant_id,claimed_at=now(),verification_status='verified',verified_at=now(),approval_status='approved',review_message=null where id=v.id;
   insert into public.vendor_business_memberships(vendor_id,profile_id,email,role,status,accepted_at) values(v.id,c.claimant_id,private.confirmed_business_email(c.claimant_id),'owner','active',now()) on conflict(vendor_id,profile_id) where profile_id is not null do update set status='active',email=excluded.email,role='owner',accepted_at=now(),revoked_at=null;
   insert into public.business_trust_audit(vendor_id,actor_id,action,reference_id) select v.id,actor,'competing_claim_rejected',id from public.vendor_claim_requests where vendor_id=v.id and status='pending' and id<>c.id;
   update public.vendor_claim_requests set status='rejected',reviewed_by=actor,reviewed_at=now(),review_message='Another claimant completed verified authority review. Contact ARIVVIO if you dispute this decision.' where vendor_id=v.id and status='pending' and id<>c.id;
  elsif decision='needs_more_information' then
   if length(coalesce(note,''))<10 then raise exception 'Explain what information is needed'; end if;
   update public.vendor_claim_requests set review_message=note where id=c.id;
   if v.applicant_id=c.claimant_id then update public.vendor_businesses set verification_status='needs_more_information',review_message=note where id=v.id; end if;
  elsif decision<>'rejected' or decision is null then raise exception 'Invalid decision'; end if;
  if decision in('approved','rejected') then update public.vendor_claim_requests set status=decision,reviewed_by=actor,reviewed_at=now(),review_message=note where id=c.id; end if;
  insert into public.business_trust_audit(vendor_id,actor_id,action,reference_id,note) values(v.id,actor,'claim_'||decision,c.id,note);
  return jsonb_build_object('status',decision);
 elsif operation='reopen' then
  select * into c from public.vendor_claim_requests where id=(payload->>'claim_id')::uuid;
  if c.claimant_id=actor or length(coalesce(note,''))<10 or (v.owner_id is not null and v.owner_id<>c.claimant_id) then raise exception 'Choose the existing owner claim and record review reason'; end if;
  update public.vendor_claim_requests set status='pending',review_message=note where id=c.id;
  update public.vendor_businesses set verification_status='needs_more_information',approval_status='pending',review_message=note where id=v.id;
  update public.business_verification_evidence set status='expired',expires_at=now() where vendor_id=v.id and status='passed';
 elsif operation='close_access' then
  if length(coalesce(note,''))<10 then raise exception 'Record the access request review outcome'; end if;
  update public.business_access_requests set status='closed' where id=(payload->>'id')::uuid and vendor_id=v.id;
 elsif operation='state' then
  decision=payload->>'status';
  if decision is null or decision not in('disputed','suspended','needs_more_information') or length(coalesce(note,''))<10 then raise exception 'Choose a review state and explain why'; end if;
  update public.vendor_businesses set verification_status=decision,approval_status='pending',review_message=note where id=v.id;
  update public.business_verification_evidence set status='expired',expires_at=now() where vendor_id=v.id and status='passed';
 elsif operation='invite' then
  if v.verification_status<>'verified' or not private.business_member(v.id,array['owner','admin']) then raise exception 'Verified owner or admin required'; end if;
  email=lower(btrim(payload->>'email')); decision=payload->>'role';
  if email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' or decision is null or decision not in('admin','manager','staff') then raise exception 'Choose email and permitted team role'; end if;
  if decision='admin' and not private.business_member(v.id,array['owner']) then raise exception 'Only owner may invite an admin'; end if;
  insert into public.vendor_business_memberships(vendor_id,email,role,status,invited_by,expires_at) values(v.id,email,decision,'invited',actor,now()+interval '7 days')
   on conflict on constraint vendor_business_memberships_vendor_id_email_key do update set role=excluded.role,status='invited',invited_by=actor,expires_at=excluded.expires_at,profile_id=null,accepted_at=null,revoked_at=null where vendor_business_memberships.status='revoked' and vendor_business_memberships.role<>'owner' returning * into m;
  if m.id is null then raise exception 'This person already has membership or an invitation'; end if;
  rid=m.id;
 elsif operation='accept_invite' then
  select * into m from public.vendor_business_memberships where id=(payload->>'id')::uuid for update;
  if v.verification_status<>'verified' or m.status<>'invited' or m.expires_at<=now() or m.email is distinct from private.confirmed_business_email(actor) then raise exception 'Invitation expired or belongs to a different confirmed email'; end if;
  update public.vendor_business_memberships set profile_id=actor,status='active',accepted_at=now() where id=m.id;
  rid=m.id;
 elsif operation='revoke' then
  select * into m from public.vendor_business_memberships where id=(payload->>'id')::uuid and vendor_id=v.id for update;
  if m.id is null or (not public.is_admin() and (not private.business_member(v.id,array['owner','admin']) or m.role in('owner','admin'))) then raise exception 'Not permitted to revoke this member'; end if;
  update public.vendor_business_memberships set status='revoked',revoked_at=now() where id=m.id;
  rid=m.id;
 elsif operation='access' then
  if v.owner_id is null or length(coalesce(note,''))<10 then raise exception 'Explain your access request for an already managed business'; end if;
  if (select count(*) from public.business_access_requests where profile_id=actor and status='pending')>=limits.pending_limit then raise exception 'Please wait for your open access requests to be reviewed'; end if;
  insert into public.business_access_requests(vendor_id,profile_id,note) values(v.id,actor,note) on conflict do nothing;
 else raise exception 'Unknown trust operation'; end if;
 insert into public.business_trust_audit(vendor_id,actor_id,action,reference_id,note) values(v.id,actor,operation,rid,note);
 return jsonb_build_object('ok',true);
end $$;
create function public.trust_operation(operation text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.trust_operation(operation,payload)$$;
alter function private.listing_operation(text,jsonb) rename to listing_operation_legacy;
revoke all on function private.listing_operation_legacy(text,jsonb) from public,anon,authenticated;
create function private.listing_operation(operation text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; matches jsonb; v public.vendor_businesses;
begin
 perform private.request_actor();
 if operation='claim' then return private.trust_operation('claim',payload); end if;
 if operation='review_claim' then return private.trust_operation('review',payload||jsonb_build_object('claim_id',payload->>'id','decision',payload->>'status')); end if;
 if operation='save_listing' then
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if nullif(payload->>'id','') is not null then select * into v from public.vendor_businesses where id=(payload->>'id')::uuid; end if;
  if v.applicant_id is not null then raise exception 'Review candidate evidence through Claims before publication'; end if;
  if payload->>'publish'='true' and nullif(btrim(payload->>'city'),'') is null then raise exception 'Public location context required'; end if;
  matches=private.business_matches(payload);
  if exists(select 1 from jsonb_array_elements(matches) x where (x->>'score')::int>=60) and length(btrim(coalesce(payload->>'separate_reason','')))<10 then raise exception 'Possible duplicate. Review matches and record why this is a separate business'; end if;
  result=private.listing_operation_legacy(operation,payload);
  update public.vendor_businesses set location_name=nullif(payload->>'location_name',''),postal_code=nullif(payload->>'postal_code','') where id=(result->>'id')::uuid;
  insert into public.business_trust_audit(vendor_id,actor_id,action,note) values((result->>'id')::uuid,private.request_actor(),'public_listing_saved',payload->>'separate_reason');
  return result;
 end if;
 return private.listing_operation_legacy(operation,payload);
end $$;

-- Team members act as themselves, while the primary owner remains the compatibility contact.
create function private.provider_access(vendor uuid,venue uuid) returns boolean language sql stable security definer set search_path='' as $$
 select case when vendor is not null and venue is null then private.business_member(vendor)
 when venue is not null and vendor is null then exists(select 1 from public.venues v join public.profiles p on p.id=v.owner_id where v.id=venue and p.user_id=auth.uid()) else false end
$$;
create or replace function private.request_participant(request uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and exists(select 1 from public.quote_requests q where q.id=request and (q.planner_id=private.request_actor() or private.provider_access(q.vendor_id,q.venue_id)))
$$;
create or replace function private.booking_participant(booking uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and exists(select 1 from public.bookings b where b.id=booking and (b.planner_id=private.request_actor() or private.provider_access(b.vendor_id,b.venue_id)))
$$;
create or replace function private.message_participant(m public.messages) returns boolean language sql stable security definer set search_path='' as $$
 select case when m.quote_request_id is not null then private.request_participant(m.quote_request_id) and (m.booking_id is null or exists(select 1 from public.bookings b where b.id=m.booking_id and b.quote_request_id=m.quote_request_id)) else private.booking_participant(m.booking_id) end
$$;
drop policy requests_participant_read on public.quote_requests;
create policy requests_participant_read on public.quote_requests for select to authenticated using(planner_id=private.request_actor() or private.provider_access(vendor_id,venue_id));
create function private.guard_verified_request() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.vendor_id is not null and not exists(select 1 from public.vendor_businesses b join public.vendor_business_memberships m on m.vendor_id=b.id and m.profile_id=b.owner_id and m.role='owner' and m.status='active' where b.id=new.vendor_id and b.verification_status='verified' and b.verified_at is not null and b.approval_status='approved') then raise exception 'Business verification required before direct requests'; end if;
 return new;
end $$;
create trigger verified_request_guard before insert on public.quote_requests for each row execute function private.guard_verified_request();

create or replace function private.send_quote_message(request uuid,message_body text) returns public.messages language plpgsql security definer set search_path='' as $$
declare q public.quote_requests; actor uuid; provider uuid; m public.messages; event_state public.event_status;
begin
 actor=private.request_actor();
 select * into q from public.quote_requests where id=request for update;
 provider=private.request_provider(q.vendor_id,q.venue_id);
 if q.id is null or provider is null or (actor<>q.planner_id and not private.provider_access(q.vendor_id,q.venue_id)) then raise exception 'Request unavailable'; end if;
 select status into event_state from public.events where id=q.event_id;
 if q.status in('declined','cancelled','expired') or event_state in('cancelled','completed') then raise exception 'This conversation is read only'; end if;
 message_body=btrim(message_body);
 if message_body is null or length(message_body)=0 or length(message_body)>4000 then raise exception 'Enter a message between 1 and 4000 characters'; end if;
 insert into public.messages(quote_request_id,sender_id,receiver_id,body) values(q.id,actor,case when actor=q.planner_id then provider else q.planner_id end,message_body) returning * into m;
 update public.quote_requests set updated_at=now() where id=q.id;
 return m;
end $$;

create or replace function private.send_vendor_quote(request uuid,price numeric,note text,expected_revision integer) returns public.quote_requests language plpgsql security definer set search_path='' as $$
declare q public.quote_requests; actor uuid;
begin
 actor=private.request_actor(); select * into q from public.quote_requests where id=request for update;
 if q.id is null or not private.provider_access(q.vendor_id,q.venue_id) then raise exception 'Request unavailable'; end if;
 if q.quote_revision is distinct from expected_revision then raise exception 'This quote changed. Refresh before continuing.'; end if;
 if q.status not in('pending','sent','countered') or exists(select 1 from public.bookings where quote_request_id=q.id) then raise exception 'This request cannot receive another quote'; end if;
 if price is null or price<=0 or price>100000000 or price::text in('NaN','Infinity','-Infinity') or price<>round(price,2) then raise exception 'Enter a valid final price with up to two decimal places'; end if;
 if length(coalesce(note,''))>3000 then raise exception 'Keep your quote note under 3000 characters'; end if;
 perform private.send_quote_message(q.id,case when q.vendor_final_price is null then 'Quote sent: $' else 'Updated quote: $' end||price::text||case when nullif(btrim(note),'') is not null then E'\n'||btrim(note) else '' end);
 update public.quote_requests set status='sent',vendor_final_price=price,quote_revision=quote_revision+1,updated_at=now() where id=q.id returning * into q;
 return q;
end $$;

create or replace function private.close_quote_request(request uuid,operation text,note text) returns public.quote_requests language plpgsql security definer set search_path='' as $$
declare q public.quote_requests; actor uuid;
begin
 actor=private.request_actor(); select * into q from public.quote_requests where id=request for update;
 if q.id is null or (operation='decline' and not private.provider_access(q.vendor_id,q.venue_id)) or (operation='withdraw' and actor<>q.planner_id) or operation is null or operation not in('decline','withdraw') then raise exception 'Request unavailable'; end if;
 if q.status not in('pending','sent','countered') and not(q.status='accepted' and not exists(select 1 from public.bookings where quote_request_id=q.id)) then raise exception 'This request is already closed or booked'; end if;
 if exists(select 1 from public.bookings where quote_request_id=q.id) then raise exception 'Booked requests cannot be withdrawn or declined'; end if;
 if length(coalesce(note,''))>3000 then raise exception 'Keep your note under 3000 characters'; end if;
 perform private.send_quote_message(q.id,case when operation='withdraw' then 'Customer withdrew this request.' else 'Provider declined this request.' end||case when nullif(btrim(note),'') is not null then E'\n'||btrim(note) else '' end);
 update public.quote_requests set status=case when operation='decline' then 'declined'::public.quote_status else 'cancelled'::public.quote_status end,quote_revision=quote_revision+1,updated_at=now() where id=q.id returning * into q;
 return q;
end $$;

create or replace function private.get_quote_thread(request uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare q public.quote_requests; b public.bookings; actor uuid; provider uuid; ctx jsonb; conflicts integer; event_state public.event_status;
begin
 actor=private.request_actor(); select * into q from public.quote_requests where id=request;
 if q.id is null or not private.request_participant(q.id) then raise exception 'Request unavailable'; end if;
 provider=private.request_provider(q.vendor_id,q.venue_id);
 ctx=coalesce(q.request_context,private.request_context_for(q));
 select * into b from public.bookings where quote_request_id=q.id;
 select status into event_state from public.events where id=q.event_id;
 if private.provider_access(q.vendor_id,q.venue_id) then
 select count(*) into conflicts from public.bookings other join public.quote_requests oq on oq.id=other.quote_request_id join public.events e on e.id=other.event_id
 where other.id is distinct from b.id and other.booking_status<>'cancelled' and private.request_provider(other.vendor_id,other.venue_id)=provider
 and e.date=(ctx->>'date')::date and oq.requested_start_time<q.requested_end_time and oq.requested_end_time>q.requested_start_time;
 end if;
 return jsonb_build_object('quote',to_jsonb(q),'booking',case when b.id is null then null else to_jsonb(b) end,'context',ctx,
 'viewer_role',case when actor=q.planner_id then 'customer' else 'vendor' end,'viewer_id',actor,
 'read_only',q.status in('declined','cancelled','expired') or event_state in('cancelled','completed') or provider is null,
 'provider_name',coalesce((select business_name from public.vendor_businesses where id=q.vendor_id),(select name from public.venues where id=q.venue_id),'Provider'),
 'service_name',coalesce((select service_name from public.vendor_services where id=q.service_id),case when q.venue_id is not null then 'Venue' else 'Event service' end),
 'schedule_conflicts',coalesce(conflicts,0),
 'messages',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at,m.id) from public.messages m where (m.quote_request_id=q.id or (m.quote_request_id is null and m.booking_id=b.id)) and private.message_participant(m)),'[]'::jsonb));
end $$;

create or replace function private.get_request_inbox(audience text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid;
begin
 actor=private.request_actor();
 if audience not in('customer','vendor') then raise exception 'Unknown workspace'; end if;
 return coalesce((select jsonb_agg(item order by updated_at desc) from (
 select jsonb_build_object('quote',to_jsonb(q),'context',coalesce(q.request_context,private.request_context_for(q)),
 'provider_name',coalesce(v.business_name,ve.name,'Provider'),'service_name',coalesce(s.service_name,case when q.venue_id is not null then 'Venue' else 'Event service' end),
 'booking_id',b.id,'booking',case when b.id is null then null else to_jsonb(b) end,
 'needs_reply',q.status not in('declined','cancelled','expired') and (last_message.sender_id is distinct from actor and (last_message.id is not null or (audience='vendor' and q.status='pending'))),
 'last_activity',q.updated_at) item,q.updated_at
 from public.quote_requests q left join public.vendor_businesses v on v.id=q.vendor_id left join public.venues ve on ve.id=q.venue_id left join public.vendor_services s on s.id=q.service_id left join public.bookings b on b.quote_request_id=q.id
 left join lateral(select m.id,m.sender_id from public.messages m where m.quote_request_id=q.id and private.message_participant(m) order by created_at desc,id desc limit 1) last_message on true
 where case when audience='customer' then q.planner_id=actor else private.provider_access(q.vendor_id,q.venue_id) end
 order by q.updated_at desc limit 200) rows),'[]'::jsonb);
end $$;

-- Storage policies are optional in local fixtures, present on the deployed project.
do $$ begin
 if to_regclass('storage.objects') is not null then
 execute 'drop policy if exists vendor_photos_storage_owner_insert on storage.objects';
 execute 'drop policy if exists vendor_photos_storage_owner_update on storage.objects';
 execute 'drop policy if exists vendor_photos_storage_owner_delete on storage.objects';
 execute $p$create policy vendor_photos_team_insert on storage.objects for insert to authenticated with check(bucket_id='vendor-photos' and exists(select 1 from public.vendor_businesses b where b.id::text=(storage.foldername(name))[1] and private.business_editor(b.id)))$p$;
 execute $p$create policy vendor_photos_team_update on storage.objects for update to authenticated using(bucket_id='vendor-photos' and exists(select 1 from public.vendor_businesses b where b.id::text=(storage.foldername(name))[1] and private.business_editor(b.id))) with check(bucket_id='vendor-photos' and exists(select 1 from public.vendor_businesses b where b.id::text=(storage.foldername(name))[1] and private.business_editor(b.id)))$p$;
 execute $p$create policy vendor_photos_team_delete on storage.objects for delete to authenticated using(bucket_id='vendor-photos' and exists(select 1 from public.vendor_businesses b where b.id::text=(storage.foldername(name))[1] and private.business_editor(b.id)))$p$;
 end if;
end $$;
revoke all on function private.confirmed_business_email(uuid),private.business_member(uuid,text[]),private.business_editor(uuid),private.business_domain(text),private.normalize_business(),private.business_matches(jsonb),public.business_matches(jsonb),private.trust_operation(text,jsonb),public.trust_operation(text,jsonb),private.listing_operation(text,jsonb),private.provider_access(uuid,uuid),private.guard_verified_request() from public,anon,authenticated;
grant execute on function private.confirmed_business_email(uuid),private.business_member(uuid,text[]),private.business_editor(uuid),private.business_domain(text),private.trust_operation(text,jsonb),public.trust_operation(text,jsonb),private.listing_operation(text,jsonb),private.provider_access(uuid,uuid) to authenticated;
grant execute on function private.business_matches(jsonb),public.business_matches(jsonb) to anon,authenticated;

-- Editing candidate identity invalidates prior proof so approval cannot use stale evidence.
create function private.invalidate_business_evidence() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.business_name,new.website_url,new.phone,new.base_address,new.service_area_city,new.location_name,new.official_domain,new.official_phone) is distinct from (old.business_name,old.website_url,old.phone,old.base_address,old.service_area_city,old.location_name,old.official_domain,old.official_phone) then
 update public.business_verification_evidence set status='expired',expires_at=now() where vendor_id=new.id and status='passed';
 insert into public.business_trust_audit(vendor_id,actor_id,action) values(new.id,private.request_actor(),'identity_changed_evidence_invalidated');
 end if; return new;
end $$;
create trigger invalidate_business_proof after update on public.vendor_businesses for each row execute function private.invalidate_business_evidence();
revoke all on function private.invalidate_business_evidence() from public,anon,authenticated;

grant usage on schema private to anon;

alter function public.is_admin() set search_path='';
revoke all on function public.normalize_profile_role() from public,anon,authenticated;
