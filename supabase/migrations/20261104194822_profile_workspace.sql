alter table public.vendor_businesses add column short_intro text check(length(short_intro)<=300);
create or replace function private.guard_profile_sections() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' and new.profile_sections='[]' then return new; end if;
 if tg_op='UPDATE' and new.profile_sections=old.profile_sections then return new; end if;
 if not public.is_admin() and not private.business_editor(new.id) then raise exception 'Business editor required for custom sections'; end if;
 if exists(select 1 from jsonb_array_elements(new.profile_sections) x where jsonb_typeof(x)<>'object' or x-array['title','body']<>'{}' or jsonb_typeof(x->'title') is distinct from 'string' or jsonb_typeof(x->'body') is distinct from 'string' or length(trim(x->>'title')) not between 1 and 100 or length(trim(x->>'body')) not between 1 and 4000) then raise exception 'Each section needs a heading and details'; end if;
 return new;
end $$;
create or replace function private.guard_business_media() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor=private.request_actor();
 if not public.is_admin() then
  if not private.business_editor(new.vendor_id) then raise exception 'Business editor required'; end if;
  if tg_op='UPDATE' then
   if old.media_status='approved' and new.media_status='candidate' and (to_jsonb(new)-'media_status')=(to_jsonb(old)-'media_status') then
    new.reviewed_at=now();new.reviewed_by=actor;return new;
   end if;
   if (to_jsonb(new)-array['sort_order','alt_text']) is distinct from (to_jsonb(old)-array['sort_order','alt_text']) or length(trim(coalesce(new.alt_text,'')))<3 then raise exception 'Only photo ordering may be changed. Upload a new photo to replace it'; end if;
   return new;
  end if;
 end if;
 if tg_op='INSERT' and (not public.is_admin() or new.storage_path is not null) then
  if new.storage_path is null or new.storage_path not like new.vendor_id::text||'/%' or new.storage_path like '%..%' or new.image_url !~ '^https://[a-z0-9]+[.]supabase[.]co/storage/v1/object/public/vendor-photos/' or right(new.image_url,length(new.storage_path))<>new.storage_path or new.rights_basis is distinct from 'Vendor attests ownership or permission to publish' then raise exception 'An authorized upload and explicit rights attestation are required'; end if;
  new.media_status='approved';if new.media_kind not in ('logo','business_photo') then raise exception 'Choose a logo or photograph'; end if;new.source_url=new.image_url;
  new.rights_attested_at=now();new.rights_attested_by=actor;
 end if;
 if new.image_url !~ '^https://' or coalesce(new.source_url,'') !~ '^https://' then raise exception 'HTTPS media and source URLs required'; end if;
 if new.media_status='approved' then
  if length(btrim(coalesce(new.rights_basis,'')))<10 or length(btrim(coalesce(new.alt_text,'')))<3 then raise exception 'Approval requires rights basis and accurate alt text'; end if;
  new.reviewed_at=now();new.reviewed_by=actor;
 end if;
 return new;
end $$;
create function private.profile_workspace_edit(operation text, payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid; business uuid := (payload->>'vendor_id')::uuid;
 current_row jsonb; edits jsonb := payload->'changes'; prior jsonb := payload->'before';
 b public.vendor_businesses; s public.vendor_services; p public.vendor_photos;
 allowed text[]; path text; url text; position integer;
begin
 actor := private.request_actor();
 if not public.is_admin() and not private.business_editor(business) then raise exception 'Business editor required'; end if;
 if octet_length(payload::text)>65000 then raise exception 'Input too long'; end if;
 select * into strict b from public.vendor_businesses where id=business for update;
 if operation in ('profile','service','new_service') then
   if operation='profile' then
     allowed:=array['business_name','location_name','description','category','service_area_city','base_address','postal_code','phone','email','website_url','profile_sections','service_radius_miles','short_intro'];
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
     if not public.is_admin() and b.verification_status='verified' and edits ?| array['business_name','location_name','website_url','phone','base_address','service_area_city','postal_code','email'] then raise exception 'Verified identity changes require Admin review'; end if;
     b:=jsonb_populate_record(b,edits);
     if b.service_radius_miles < 0 or length(coalesce(b.short_intro,''))>300 then raise exception 'Check the radius and short introduction'; end if;
     if coalesce(trim(b.business_name),'')='' or coalesce(trim(b.category),'')='' or (b.website_url is not null and b.website_url !~* '^https?://') then raise exception 'Check the business name, category and website'; end if;
     update public.vendor_businesses set short_intro=b.short_intro,service_radius_miles=b.service_radius_miles,profile_sections=b.profile_sections,business_name=b.business_name,location_name=b.location_name,description=b.description,category=b.category,service_area_city=b.service_area_city,base_address=b.base_address,postal_code=b.postal_code,phone=b.phone,email=b.email,website_url=b.website_url where id=business;
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
 elsif operation='specialties' then
   if jsonb_typeof(payload->'tags') is distinct from 'array' or jsonb_array_length(payload->'tags')>50 then raise exception 'Choose up to 50 specialties'; end if;
   if coalesce((select jsonb_agg(t.tag order by t.tag collate "C") from public.vendor_tags t where vendor_id=business),'[]') is distinct from (select coalesce(jsonb_agg(x order by x collate "C"),'[]') from jsonb_array_elements_text(payload->'before_tags') x) then raise exception 'Specialties changed. Reload before saving'; end if;
   delete from public.vendor_tags where vendor_id=business;
   insert into public.vendor_tags(vendor_id,tag) select distinct business,trim(x) from jsonb_array_elements_text(payload->'tags') x where length(trim(x)) between 1 and 100;
 elsif operation in ('cover','unpublish','caption','earlier','later') then
   select * into strict p from public.vendor_photos where vendor_id=business and id=(payload->>'id')::uuid and media_status='approved' for update;
   if operation='caption' then
     if length(trim(coalesce(payload->>'alt','')))<3 then raise exception 'Describe this image'; end if;
     update public.vendor_photos set alt_text=payload->>'alt' where id=p.id and alt_text is not distinct from payload->>'before_alt';
     if not found then raise exception 'Caption changed. Reload before saving'; end if;
   elsif operation in ('earlier','later') then
     with ordered as (select id,row_number() over(order by sort_order,id) as n from public.vendor_photos where vendor_id=business and media_status='approved' and media_kind=p.media_kind),
     target as (select n from ordered where id=p.id),
     sorted as (select o.id,row_number() over(order by case when o.id=p.id then o.n+case when operation='earlier' then -1.5 else 1.5 end else o.n end) as n from ordered o)
     update public.vendor_photos f set sort_order=(s.n-100000)::int from sorted s where f.id=s.id;
   elsif operation='unpublish' and not public.is_admin() then
     update public.vendor_photos set media_status='candidate' where id=p.id;
   elsif operation='unpublish' then
     update public.vendor_photos set media_status='candidate',reviewed_at=now(),reviewed_by=actor where id=p.id;
   else
     if p.media_kind<>'business_photo' then raise exception 'Choose a business photo for the cover'; end if;
     select least(coalesce(min(sort_order),0),0)-1 into position from public.vendor_photos where vendor_id=business;
     update public.vendor_photos set sort_order=position where id=p.id;
   end if;
 elsif operation='upload' then
   if b.approval_status<>'approved' then raise exception 'Publish the business before uploading public media'; end if;
   path:=payload->>'path'; url:=payload->>'url';
   if (payload->>'rights_confirmed') is distinct from 'true' or coalesce(path,'') !~ ('^'||business::text||'/(admin|editor)/[0-9a-f-]{36}[.](jpg|png|webp)$') or coalesce(url,'') !~ '^https://[a-z0-9]+[.]supabase[.]co/storage/v1/object/public/vendor-photos/' or right(url,length(path))<>path then raise exception 'A confirmed Admin upload is required'; end if;
   if not exists(select 1 from storage.objects where bucket_id='vendor-photos' and name=path and owner_id=auth.uid()::text) then raise exception 'Uploaded file not found'; end if;
   if payload->>'kind' not in ('business_photo','logo') or length(trim(coalesce(payload->>'alt','')))<3 or length(trim(coalesce(payload->>'rights','')))<10 then raise exception 'Describe the image and your rights to publish it'; end if;
   select * into p from public.vendor_photos where vendor_id=business and storage_path=path;
   if found then return to_jsonb(p.id); end if;
   select case when payload->>'placement' in ('cover','logo') then least(coalesce(min(sort_order),0),0)-1 else coalesce(max(sort_order),0)+1 end into position from public.vendor_photos where vendor_id=business;
   if not public.is_admin() then
     insert into public.vendor_photos(vendor_id,image_url,source_url,media_status,media_kind,alt_text,rights_basis,attribution,sort_order,storage_path,creator)
     values(business,url,url,'approved',payload->>'kind',payload->>'alt','Vendor attests ownership or permission to publish',nullif(payload->>'credit',''),position,path,null) returning * into p;
   else
   insert into public.vendor_photos(vendor_id,image_url,source_url,media_status,media_kind,alt_text,rights_basis,attribution,sort_order)
   values(business,url,url,'approved',payload->>'kind',payload->>'alt',payload->>'rights',nullif(payload->>'credit',''),position) returning * into p;
   update public.vendor_photos set storage_path=path where id=p.id;
   end if;
 else raise exception 'Unknown edit operation';
 end if;
 insert into public.business_trust_audit(vendor_id,actor_id,action,note) values(business,actor,(case when public.is_admin() then 'admin_profile_' else 'vendor_profile_' end)||operation,coalesce(p.id::text,payload->>'id',business::text)||case when operation='upload' then ': '||left(payload->>'rights',1000) else '' end);
 return jsonb_build_object('ok',true);
end $$;

create function public.profile_workspace_edit(operation text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.profile_workspace_edit(operation,payload)$$;
revoke all on function private.profile_workspace_edit(text,jsonb),public.profile_workspace_edit(text,jsonb) from public,anon;
grant execute on function private.profile_workspace_edit(text,jsonb),public.profile_workspace_edit(text,jsonb) to authenticated;
