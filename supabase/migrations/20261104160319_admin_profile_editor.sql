alter table public.vendor_businesses add column profile_sections jsonb not null default '[]' check(jsonb_typeof(profile_sections)='array' and jsonb_array_length(profile_sections)<=24);

create function private.guard_profile_sections() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' and new.profile_sections='[]' then return new; end if;
 if tg_op='UPDATE' and new.profile_sections=old.profile_sections then return new; end if;
 if not public.is_admin() then raise exception 'Admin access required for custom sections'; end if;
 if exists(select 1 from jsonb_array_elements(new.profile_sections) x where jsonb_typeof(x)<>'object' or x-array['title','body']<>'{}' or jsonb_typeof(x->'title') is distinct from 'string' or jsonb_typeof(x->'body') is distinct from 'string' or length(trim(x->>'title')) not between 1 and 100 or length(trim(x->>'body')) not between 1 and 4000) then raise exception 'Each section needs a heading and details'; end if;
 return new;
end $$;
create trigger guard_profile_sections before insert or update of profile_sections on public.vendor_businesses for each row execute function private.guard_profile_sections();
revoke all on function private.guard_profile_sections() from public, anon, authenticated;

-- Use the signed-in administrator for all manual profile and media changes.
create function private.admin_profile_edit(operation text, payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid; business uuid := (payload->>'vendor_id')::uuid;
 current_row jsonb; edits jsonb := payload->'changes'; prior jsonb := payload->'before';
 b public.vendor_businesses; s public.vendor_services; p public.vendor_photos;
 allowed text[]; path text; url text; position integer;
begin
 actor := private.request_actor();
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if octet_length(payload::text)>65000 then raise exception 'Input too long'; end if;
 select * into strict b from public.vendor_businesses where id=business for update;
 if operation in ('profile','service','new_service') then
   if operation='profile' then
     allowed:=array['business_name','location_name','description','category','service_area_city','base_address','postal_code','phone','email','website_url','profile_sections'];
     current_row:=to_jsonb(b);
   else
     allowed:=array['service_name','category','description','event_types_supported','pricing_type','base_price','hourly_rate','minimum_hours','setup_fee','travel_fee','active'];
     if operation='service' then
       select * into strict s from public.vendor_services where vendor_id=business and id=(payload->>'id')::uuid for update;
     end if;
     current_row:=to_jsonb(s);
   end if;
   if jsonb_typeof(edits) is distinct from 'object' or edits='{}' or edits-allowed<>'{}' then raise exception 'Invalid profile fields'; end if;
   if operation<>'new_service' and (jsonb_typeof(prior) is distinct from 'object' or not current_row @> prior or exists(select 1 from jsonb_object_keys(edits) k where not prior ? k)) then raise exception 'This record changed. Reload before saving.'; end if;
   if operation='profile' then
     b:=jsonb_populate_record(b,edits);
     if coalesce(trim(b.business_name),'')='' or coalesce(trim(b.category),'')='' or (b.website_url is not null and b.website_url !~* '^https?://') then raise exception 'Check the business name, category and website'; end if;
     update public.vendor_businesses set profile_sections=b.profile_sections,business_name=b.business_name,location_name=b.location_name,description=b.description,category=b.category,service_area_city=b.service_area_city,base_address=b.base_address,postal_code=b.postal_code,phone=b.phone,email=b.email,website_url=b.website_url where id=business;
   else
     s:=jsonb_populate_record(s,edits);
     if coalesce(trim(s.service_name),'')='' or coalesce(trim(s.category),'')='' or least(s.base_price,s.hourly_rate,s.minimum_hours,s.setup_fee,s.travel_fee)<0 then raise exception 'Check the service name, category and rates'; end if;
     if operation='new_service' then
       insert into public.vendor_services(id,vendor_id,service_name,category,description,event_types_supported,pricing_type,base_price,hourly_rate,minimum_hours,setup_fee,travel_fee,active)
       values((payload->>'id')::uuid,business,s.service_name,s.category,s.description,coalesce(s.event_types_supported,'{}'),s.pricing_type,s.base_price,s.hourly_rate,s.minimum_hours,coalesce(s.setup_fee,0),coalesce(s.travel_fee,0),coalesce(s.active,true));
     else
       update public.vendor_services set service_name=s.service_name,category=s.category,description=s.description,event_types_supported=s.event_types_supported,pricing_type=s.pricing_type,base_price=s.base_price,hourly_rate=s.hourly_rate,minimum_hours=s.minimum_hours,setup_fee=s.setup_fee,travel_fee=s.travel_fee,active=s.active where id=s.id;
     end if;
   end if;
 elsif operation in ('cover','unpublish') then
   select * into strict p from public.vendor_photos where vendor_id=business and id=(payload->>'id')::uuid and media_status='approved' for update;
   if operation='unpublish' then
     update public.vendor_photos set media_status='candidate',reviewed_at=now(),reviewed_by=actor where id=p.id;
   else
     if p.media_kind<>'business_photo' then raise exception 'Choose a business photo for the cover'; end if;
     select least(coalesce(min(sort_order),0),0)-1 into position from public.vendor_photos where vendor_id=business;
     update public.vendor_photos set sort_order=position where id=p.id;
   end if;
 elsif operation='upload' then
   path:=payload->>'path'; url:=payload->>'url';
   if (payload->>'rights_confirmed') is distinct from 'true' or coalesce(path,'') !~ ('^'||business::text||'/admin/[0-9a-f-]{36}[.](jpg|png|webp)$') or coalesce(url,'') !~ '^https://[a-z0-9]+[.]supabase[.]co/storage/v1/object/public/vendor-photos/' or right(url,length(path))<>path then raise exception 'A confirmed Admin upload is required'; end if;
   if not exists(select 1 from storage.objects where bucket_id='vendor-photos' and name=path and owner_id=auth.uid()::text) then raise exception 'Uploaded file not found'; end if;
   if payload->>'kind' not in ('business_photo','logo') or length(trim(coalesce(payload->>'alt','')))<3 or length(trim(coalesce(payload->>'rights','')))<10 then raise exception 'Describe the image and your rights to publish it'; end if;
   select * into p from public.vendor_photos where vendor_id=business and storage_path=path;
   if found then return to_jsonb(p.id); end if;
   select case when payload->>'placement' in ('cover','logo') then least(coalesce(min(sort_order),0),0)-1 else coalesce(max(sort_order),0)+1 end into position from public.vendor_photos where vendor_id=business;
   insert into public.vendor_photos(vendor_id,image_url,source_url,media_status,media_kind,alt_text,rights_basis,attribution,sort_order)
   values(business,url,url,'approved',payload->>'kind',payload->>'alt',payload->>'rights',nullif(payload->>'credit',''),position) returning * into p;
   update public.vendor_photos set storage_path=path where id=p.id;
 else raise exception 'Unknown edit operation';
 end if;
 insert into public.business_trust_audit(vendor_id,actor_id,action,note) values(business,actor,'admin_profile_'||operation,coalesce(p.id::text,payload->>'id',business::text));
 return jsonb_build_object('ok',true);
end $$;
create function public.admin_profile_edit(operation text,payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$select private.admin_profile_edit(operation,payload)$$;
revoke all on function public.admin_profile_edit(text,jsonb),private.admin_profile_edit(text,jsonb) from public,anon;
grant execute on function public.admin_profile_edit(text,jsonb),private.admin_profile_edit(text,jsonb) to authenticated;
do $$begin
 if to_regclass('storage.objects') is not null then
 execute $policy$create policy admin_vendor_photo_upload on storage.objects for insert to authenticated with check(bucket_id='vendor-photos' and public.is_admin() and name ~ '^[0-9a-f-]{36}/admin/[0-9a-f-]{36}[.](jpg|png|webp)$' and exists(select 1 from public.vendor_businesses b where b.id::text=split_part(name,'/',1)))$policy$;
 end if;
end $$;
