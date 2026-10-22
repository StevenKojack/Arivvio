-- Small manually researched pilot. Official sources retrieved 2026-10-21.
-- Administrative data migration, no fabricated user/session or ownership grant.
-- Same duplicate scoring used by Admin intake. Abort rather than publish an ambiguous match.
do $$
declare item jsonb; business uuid; matches jsonb;
begin
 for item in select value from jsonb_array_elements($pilot$[
 {"business_name":"Scooter's Jungle","location_name":"El Segundo / South Bay","city":"El Segundo","address":"606 Hawaii Street, El Segundo, CA 90245","postal_code":"90245","category":"Venue","website_url":"https://scootersjungle.com/el-segundo/","phone":"310-848-1380","source_url":"https://scootersjungle.com/el-segundo/contact-el-segundo-store/","description":"El Segundo location offering private children's birthday parties, open play and camps. This listing represents the South Bay location only. Contact ARIVVIO to ask about your event.","event_types":["Birthday"]},
 {"business_name":"The Ebell of Los Angeles","location_name":"Los Angeles campus","city":"Los Angeles","address":"743 S Lucerne Blvd, Los Angeles, CA 90005","postal_code":"90005","category":"Venue","website_url":"https://www.ebellofla.org/","phone":"323-931-1277","source_url":"https://www.ebellofla.org/contact","additional_source":"https://www.ebellofla.org/about-us","description":"Los Angeles cultural campus that hosts weddings, gatherings and private events. The public contact address is on South Lucerne Boulevard. Event arrangements require confirmation with the venue.","event_types":["Wedding","Private Party"]},
 {"business_name":"NOOR","location_name":"Pasadena / The PASEO","city":"Pasadena","address":"300 East Colorado Boulevard Suite 200, Pasadena, CA 91101","postal_code":"91101","category":"Venue","website_url":"https://noorevents.com/","phone":"626-793-4518","source_url":"https://noorevents.com/contact-noor","description":"Pasadena event venue at The PASEO with spaces for weddings, corporate events and celebrations. Site tours are by appointment. Pricing, dates and event arrangements require confirmation.","event_types":["Wedding","Corporate","Birthday"]}
]$pilot$::jsonb) loop
 matches=private.business_matches(item);
 if jsonb_array_length(matches)>0 or exists(select 1 from public.vendor_businesses b where b.normalized_domain=private.business_domain(item->>'website_url')) then raise exception 'Pilot possible duplicate requires manual intake review: %',item->>'business_name'; end if;
 insert into public.vendor_businesses(owner_id,business_name,location_name,service_area_city,base_address,postal_code,category,website_url,phone,description,approval_status,verification_status,official_domain,official_phone,identity_source_url)
 values(null,item->>'business_name',item->>'location_name',item->>'city',item->>'address',item->>'postal_code',item->>'category',item->>'website_url',item->>'phone',item->>'description','approved','unverified',private.business_domain(item->>'website_url'),item->>'phone',item->>'source_url') returning id into business;
 insert into public.listing_sources(vendor_id,source_url,source_type,supported_fields,note) values(business,item->>'source_url','official business website',array['business_name','location_name','city','address','postal_code','phone','website_url','category'],'Manually researched pilot. Public identity facts only. No claimant authority verified. No reviews, ratings, prices, availability or third-party photos copied.');
 if item->>'additional_source' is not null then
 insert into public.listing_sources(vendor_id,source_url,source_type,supported_fields,note) values(business,item->>'additional_source','official business website',array['category','event_types'],'Official description confirms private events and weddings. ARIVVIO summary is original.');
 end if;
 insert into public.vendor_services(vendor_id,service_name,category,description,pricing_type,event_types_supported)
 values(business,(item->>'business_name')||' · '||(item->>'location_name'),'Venue',item->>'description','flat',array(select jsonb_array_elements_text(item->'event_types')));
 insert into public.business_trust_audit(vendor_id,action,note) values(business,'pilot_public_listing_created','Official source checked and duplicate search passed. Published as unclaimed, not verified. No outreach performed.');
 end loop;
end $$;
