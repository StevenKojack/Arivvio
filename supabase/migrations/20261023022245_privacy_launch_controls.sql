-- Self-attestation is a declaration, never a business authorization grant.
create table public.legal_acceptances (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 profile_id uuid references public.profiles(id), terms_version text not null, privacy_version text not null,
 adult_attested boolean not null check(adult_attested), declared_at timestamptz not null default now(),
 authenticated_at timestamptz, unique(user_id,terms_version,privacy_version)
);
alter table public.legal_acceptances enable row level security;
revoke all on public.legal_acceptances from public,anon,authenticated;
grant select on public.legal_acceptances to authenticated;
create policy acceptance_own_read on public.legal_acceptances for select to authenticated using(user_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
create function private.capture_signup_acceptance() returns trigger language plpgsql security definer set search_path='' as $$
declare a jsonb;
begin
 a=new.raw_user_meta_data->'legal_acceptance';
 if coalesce(new.is_anonymous,false) or a->>'terms_version' is distinct from '2026-10-22' or a->>'privacy_version' is distinct from '2026-10-22' or a->>'accepted' is distinct from 'true' or a->>'adult' is distinct from 'true' then
  raise exception 'Account signup requires current Terms, Privacy acknowledgement and age 18+ attestation';
 end if;
 insert into public.legal_acceptances(user_id,terms_version,privacy_version,adult_attested) values(new.id,a->>'terms_version',a->>'privacy_version',true);
 return new;
end $$;
create trigger arivvio_signup_acceptance after insert on auth.users for each row execute function private.capture_signup_acceptance();
-- The timestamp and versions captured at signup survive email confirmation and later metadata edits.
create function private.complete_legal_acceptance() returns void language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor=private.request_actor();
 update public.legal_acceptances set profile_id=actor,authenticated_at=coalesce(authenticated_at,now()) where user_id=auth.uid();
end $$;
create function public.complete_legal_acceptance() returns void language sql security invoker set search_path='' as $$ select private.complete_legal_acceptance() $$;

create table public.privacy_requests (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id),
 request_type text not null check(request_type in('deletion','access','correction')),
 status text not null default 'new' check(status in('new','in_review','completed','denied','cancelled')),
 details text not null default '' check(length(details)<=2000), response text not null default '',
 created_at timestamptz not null default now(), reviewed_at timestamptz, completed_at timestamptz
);
create unique index privacy_open_request on public.privacy_requests(profile_id,request_type) where status in('new','in_review');
create table private.privacy_request_notes (id uuid primary key default gen_random_uuid(),request_id uuid not null references public.privacy_requests(id),author_id uuid not null references public.profiles(id),note text not null,created_at timestamptz not null default now());
alter table public.privacy_requests enable row level security;
alter table private.privacy_request_notes enable row level security;
revoke all on public.privacy_requests,private.privacy_request_notes from public,anon,authenticated;
grant select on public.privacy_requests to authenticated;
create policy privacy_own_read on public.privacy_requests for select to authenticated using(profile_id=private.request_actor() or public.is_admin());
create function private.privacy_operation(operation text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; r public.privacy_requests; choice text; visible_response text; note text;
begin
 actor=private.request_actor();
 if octet_length(payload::text)>10000 then raise exception 'Request is too long'; end if;
 if operation='mine' then return coalesce((select jsonb_agg(to_jsonb(p) order by created_at desc) from public.privacy_requests p where profile_id=actor),'[]');
 elsif operation='submit' then
  choice=payload->>'request_type';
  if choice is null or choice not in('deletion','access','correction') then raise exception 'Choose a request type'; end if;
  if payload ? 'profile_id' or payload ? 'user_id' then raise exception 'Submit only for your signed-in account'; end if;
  perform 1 from public.profiles where id=actor for update;
  if (select count(*) from public.privacy_requests where profile_id=actor and created_at>now()-interval '1 day')>=10 then raise exception 'Please wait before creating another request'; end if;
  insert into public.privacy_requests(profile_id,request_type,details) values(actor,choice,left(coalesce(payload->>'details',''),2000)) returning * into r;
  return to_jsonb(r);
 elsif operation='cancel' then
  update public.privacy_requests set status='cancelled',reviewed_at=now() where id=(payload->>'id')::uuid and profile_id=actor and status='new' returning * into r;
  if r.id is null then raise exception 'Only your pending request can be cancelled'; end if;
  return to_jsonb(r);
 end if;
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if operation='admin' then return jsonb_build_object('requests',coalesce((select jsonb_agg(to_jsonb(p) order by created_at desc) from public.privacy_requests p),'[]'),'notes',coalesce((select jsonb_agg(to_jsonb(n) order by created_at desc) from private.privacy_request_notes n),'[]'));
 elsif operation='resolve' then
  choice=payload->>'status'; visible_response=btrim(coalesce(payload->>'response','')); note=btrim(coalesce(payload->>'note',''));
  if choice is null or choice not in('in_review','completed','denied') then raise exception 'Choose a review state'; end if;
  if length(visible_response)<10 or length(visible_response)>2000 or length(note)>2000 then raise exception 'Provide a useful response, up to 2000 characters'; end if;
  if choice='completed' and payload->>'processed' is distinct from 'true' then raise exception 'Confirm the actual data work is complete first'; end if;
  update public.privacy_requests set status=choice,response=visible_response,reviewed_at=now(),completed_at=case when choice='completed' then now() else null end where id=(payload->>'id')::uuid and status in('new','in_review') returning * into r;
  if r.id is null then raise exception 'Request is already closed or unavailable'; end if;
  if note<>'' then insert into private.privacy_request_notes(request_id,author_id,note) values(r.id,actor,note); end if;
  return to_jsonb(r);
 end if;
 raise exception 'Unknown privacy operation';
end $$;
create function public.privacy_operation(operation text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.privacy_operation(operation,payload) $$;

create table private.business_contact_suppression (vendor_id uuid primary key references public.vendor_businesses(id),suppressed boolean not null default true,reason text not null,updated_by uuid not null references public.profiles(id),updated_at timestamptz not null default now());
alter table private.business_contact_suppression enable row level security;
revoke all on private.business_contact_suppression from public,anon,authenticated;
create function private.contact_control(operation text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor=private.request_actor(); if not public.is_admin() then raise exception 'Admin access required'; end if;
 if operation='list' then return coalesce((select jsonb_agg(to_jsonb(s)) from private.business_contact_suppression s),'[]'); end if;
 if operation<>'set' or length(btrim(coalesce(payload->>'reason','')))<10 or length(payload->>'reason')>2000 or payload->>'suppressed' not in('true','false') or payload->>'suppressed' is null then raise exception 'Record a contact preference and reason'; end if;
 insert into private.business_contact_suppression(vendor_id,suppressed,reason,updated_by) values((payload->>'vendor_id')::uuid,(payload->>'suppressed')::boolean,payload->>'reason',actor) on conflict(vendor_id) do update set suppressed=excluded.suppressed,reason=excluded.reason,updated_by=actor,updated_at=now();
 insert into public.business_trust_audit(vendor_id,actor_id,action,note) values((payload->>'vendor_id')::uuid,actor,'contact_preference',payload->>'reason');
 return jsonb_build_object('ok',true);
end $$;
create function public.contact_control(operation text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.contact_control(operation,payload) $$;
alter function private.listing_operation(text,jsonb) rename to listing_operation_trust;
revoke all on function private.listing_operation_trust(text,jsonb) from public,anon,authenticated;
create function private.listing_operation(operation text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.request_actor();
 if operation in('update_lead','handoff') and (operation='handoff' or payload->>'status' in('contacted','interested')) and exists(select 1 from public.concierge_leads l join private.business_contact_suppression s on s.vendor_id=l.vendor_id where l.id=(payload->>'id')::uuid and s.suppressed) then raise exception 'Do not contact: outreach is suppressed for this business'; end if;
 return private.listing_operation_trust(operation,payload);
end $$;
-- Record authority declarations separately from decisive verification evidence.
create table public.business_authority_attestations(id uuid primary key default gen_random_uuid(),claim_id uuid not null references public.vendor_claim_requests(id),profile_id uuid not null references public.profiles(id),version text not null,created_at timestamptz not null default now());
alter table public.business_authority_attestations enable row level security;
revoke all on public.business_authority_attestations from public,anon,authenticated;
grant select on public.business_authority_attestations to authenticated;
create policy attestation_own_read on public.business_authority_attestations for select to authenticated using(profile_id=private.request_actor() or public.is_admin());
alter function private.trust_operation(text,jsonb) rename to trust_operation_verified;
revoke all on function private.trust_operation_verified(text,jsonb) from public,anon,authenticated;
create function private.trust_operation(operation text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; result jsonb;
begin
 actor=private.request_actor();
 if operation in('candidate','claim') and (payload->>'authority_attested' is distinct from 'true' or payload->>'adult_attested' is distinct from 'true') then raise exception 'Confirm accurate information, authority to request access and age 18+'; end if;
 result=private.trust_operation_verified(operation,payload);
 if operation in('candidate','claim') and result->>'id' is not null then insert into public.business_authority_attestations(claim_id,profile_id,version) values((result->>'id')::uuid,actor,'2026-10-22'); end if;
 return result;
end $$;
-- Rebind SQL wrappers after implementation renames to avoid cached OID binding.
create or replace function public.trust_operation(operation text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.trust_operation(operation,payload) $$;
create or replace function public.listing_operation(operation text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.listing_operation(operation,payload) $$;
revoke all on function private.capture_signup_acceptance(),private.complete_legal_acceptance(),public.complete_legal_acceptance(),private.privacy_operation(text,jsonb),public.privacy_operation(text,jsonb),private.contact_control(text,jsonb),public.contact_control(text,jsonb),private.listing_operation(text,jsonb),private.trust_operation(text,jsonb) from public,anon,authenticated;
grant execute on function private.complete_legal_acceptance(),public.complete_legal_acceptance(),private.privacy_operation(text,jsonb),public.privacy_operation(text,jsonb),private.contact_control(text,jsonb),public.contact_control(text,jsonb),private.listing_operation(text,jsonb),private.trust_operation(text,jsonb) to authenticated;
