-- Media rights are separate from factual listing provenance and business authority.
alter table public.vendor_photos
 add column media_status text not null default 'candidate' check(media_status in('candidate','rights_review','approved','rejected')),
 add column media_kind text not null default 'business_photo' check(media_kind in('business_photo','logo','illustration')),
 add column source_url text,
 add column rights_basis text,
 add column creator text,
 add column attribution text,
 add column alt_text text,
 add column reviewed_at timestamptz,
 add column reviewed_by uuid references public.profiles(id),
 add column rights_attested_at timestamptz,
 add column rights_attested_by uuid references public.profiles(id);
create function private.guard_business_media() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor=private.request_actor();
 if not public.is_admin() then
  if not private.business_editor(new.vendor_id) then raise exception 'Business editor required'; end if;
  if tg_op='UPDATE' then
   if (to_jsonb(new)-'sort_order') is distinct from (to_jsonb(old)-'sort_order') then raise exception 'Only photo ordering may be changed. Upload a new photo to replace it'; end if;
   return new;
  end if;
 end if;
 if tg_op='INSERT' and (not public.is_admin() or new.storage_path is not null) then
  if new.storage_path is null or new.storage_path not like new.vendor_id::text||'/%' or new.storage_path like '%..%' or new.image_url !~ '^https://[a-z0-9]+[.]supabase[.]co/storage/v1/object/public/vendor-photos/' or right(new.image_url,length(new.storage_path))<>new.storage_path or new.rights_basis is distinct from 'Vendor attests ownership or permission to publish' then raise exception 'An authorized upload and explicit rights attestation are required'; end if;
  new.media_status='approved';new.media_kind='business_photo';new.source_url=new.image_url;
  new.rights_attested_at=now();new.rights_attested_by=actor;
 end if;
 if new.image_url !~ '^https://' or coalesce(new.source_url,'') !~ '^https://' then raise exception 'HTTPS media and source URLs required'; end if;
 if new.media_status='approved' then
  if length(btrim(coalesce(new.rights_basis,'')))<10 or length(btrim(coalesce(new.alt_text,'')))<3 then raise exception 'Approval requires rights basis and accurate alt text'; end if;
  new.reviewed_at=now();new.reviewed_by=actor;
 end if;
 return new;
end $$;
create trigger guard_business_media before insert or update on public.vendor_photos for each row execute function private.guard_business_media();
drop policy vendor_photos_public_read on public.vendor_photos;
create policy vendor_photos_public_read on public.vendor_photos for select using(media_status='approved' and exists(select 1 from public.vendor_businesses v where v.id=vendor_id and v.approval_status='approved'));
create function private.media_operation(operation text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; result public.vendor_photos; v uuid; ids uuid[];
begin
 actor=private.request_actor();
 if octet_length(payload::text)>20000 then raise exception 'Payload too large'; end if;
 if operation='reorder' then
  v=(payload->>'vendor_id')::uuid;
  if not private.business_editor(v) then raise exception 'Business editor required'; end if;
  perform 1 from public.vendor_businesses where id=v for update;
  select array_agg(value::uuid) into ids from jsonb_array_elements_text(payload->'ids');
  if coalesce(array_length(ids,1),0)=0 or (select count(distinct x) from unnest(ids) x)<>array_length(ids,1) or (select count(*) from public.vendor_photos where vendor_id=v)<>array_length(ids,1) or exists(select 1 from unnest(ids) x where not exists(select 1 from public.vendor_photos p where p.id=x and p.vendor_id=v)) then raise exception 'Refresh the complete photo list before ordering'; end if;
  update public.vendor_photos p set sort_order=o.position-1 from unnest(ids) with ordinality o(id,position) where p.id=o.id;
  return jsonb_build_object('ok',true);
 end if;
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if operation='list' then return coalesce((select jsonb_agg(to_jsonb(p) order by p.vendor_id,p.sort_order) from public.vendor_photos p),'[]'::jsonb); end if;
 if operation='candidate' then
  insert into public.vendor_photos(vendor_id,image_url,source_url,media_kind,media_status,alt_text,creator,attribution,rights_basis,sort_order)
  values((payload->>'vendor_id')::uuid,payload->>'image_url',payload->>'source_url',payload->>'media_kind','candidate',payload->>'alt_text',payload->>'creator',payload->>'attribution',payload->>'rights_basis',0) returning * into result;
 elsif operation='review' then
  if payload->>'status'='approved' and coalesce(payload->>'rights_confirmed','false')<>'true' then raise exception 'Explicit rights confirmation required'; end if;
  update public.vendor_photos set media_status=payload->>'status',rights_basis=payload->>'rights_basis',alt_text=payload->>'alt_text',attribution=payload->>'attribution',reviewed_at=now(),reviewed_by=actor where id=(payload->>'id')::uuid returning * into result;
 else raise exception 'Unknown media operation'; end if;
 if result.id is null then raise exception 'Media not found'; end if;
 insert into public.business_trust_audit(vendor_id,actor_id,action,note) values(result.vendor_id,actor,'media_'||operation,result.id::text||': '||result.media_status);
 return to_jsonb(result);
end $$;
create function public.media_operation(operation text,payload jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.media_operation(operation,payload)$$;
revoke all on function private.guard_business_media() from public,anon,authenticated;
revoke all on function private.media_operation(text,jsonb),public.media_operation(text,jsonb) from public,anon;
grant execute on function private.media_operation(text,jsonb),public.media_operation(text,jsonb) to authenticated;
