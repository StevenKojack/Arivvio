-- Restrict all request mutations to authenticated, participant-scoped operations.
-- No legacy records are removed or reclassified.
alter table public.quote_requests add column quote_revision integer not null default 0;
alter table public.quote_requests add column updated_at timestamptz not null default now();
alter table public.quote_requests add column request_context jsonb;
create unique index bookings_one_per_request on public.bookings(quote_request_id) where quote_request_id is not null;
create index messages_quote_chronology on public.messages(quote_request_id,created_at,id);

create function private.request_actor() returns uuid language plpgsql stable security definer set search_path='' as $$
declare actor uuid;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Sign in to use requests'; end if;
 select id into actor from public.profiles where user_id=auth.uid();
 if actor is null then raise exception 'Account profile unavailable'; end if;
 return actor;
end $$;
create function private.request_provider(vendor uuid,venue uuid) returns uuid language sql stable security definer set search_path='' as $$
 select case when vendor is not null and venue is null then (select owner_id from public.vendor_businesses where id=vendor)
 when venue is not null and vendor is null then (select owner_id from public.venues where id=venue) else null end;
$$;
create function private.request_participant(request uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and exists(
 select 1 from public.quote_requests q join public.profiles p on p.id in (q.planner_id,private.request_provider(q.vendor_id,q.venue_id)) where q.id=request and p.user_id=auth.uid());
$$;
create function private.booking_participant(booking uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and exists(
 select 1 from public.bookings b join public.profiles p on p.id in (b.planner_id,private.request_provider(b.vendor_id,b.venue_id)) where b.id=booking and p.user_id=auth.uid());
$$;
create function private.message_participant(m public.messages) returns boolean language sql stable security definer set search_path='' as $$
 select case when m.quote_request_id is not null then exists(
 select 1 from public.quote_requests q where q.id=m.quote_request_id and private.request_participant(q.id)
 and ((m.sender_id=q.planner_id and m.receiver_id=private.request_provider(q.vendor_id,q.venue_id)) or (m.receiver_id=q.planner_id and m.sender_id=private.request_provider(q.vendor_id,q.venue_id)))
 and (m.booking_id is null or exists(select 1 from public.bookings b where b.id=m.booking_id and b.quote_request_id=q.id)))
 else exists(select 1 from public.bookings b where b.id=m.booking_id and private.booking_participant(b.id)
 and ((m.sender_id=b.planner_id and m.receiver_id=private.request_provider(b.vendor_id,b.venue_id)) or (m.receiver_id=b.planner_id and m.sender_id=private.request_provider(b.vendor_id,b.venue_id)))) end;
$$;

-- Only whitelisted request facts leave the planner's private event. Street address,
-- budget, guest identities, raw planning text and unrelated stages are not exposed.
create function private.request_context_for(q public.quote_requests) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('title',e.title,'event_type',e.event_type,'date',e.date,
 'date_hint',left(e.event_profile->>'dateHint',120),'city',e.city,'guest_count',q.guest_count,
 'start_time',q.requested_start_time,'end_time',q.requested_end_time,
 'stages',coalesce((select jsonb_agg(jsonb_build_object('label',s->>'label','start_time',s->>'startTime','end_time',s->>'endTime'))
 from jsonb_array_elements(case when jsonb_typeof(e.event_profile->'stages')='array' then e.event_profile->'stages' else '[]'::jsonb end) s
 where exists(select 1 from public.vendor_services vs where vs.id=q.service_id and (s->'services' ? vs.category or s->'services' ? vs.service_name))),'[]'::jsonb))
 from public.events e where e.id=q.event_id;
$$;
create function private.guard_new_request() returns trigger language plpgsql security definer set search_path='' as $$
declare provider uuid;
begin
 if new.planner_id is distinct from private.request_actor() then raise exception 'Only the event owner can send a request'; end if;
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
create trigger request_creation_guard before insert on public.quote_requests for each row execute function private.guard_new_request();

drop policy messages_sender_or_receiver_all on public.messages;
drop policy quote_requests_planner_or_vendor_all on public.quote_requests;
drop policy bookings_planner_or_vendor_all on public.bookings;
create policy messages_thread_read on public.messages for select to authenticated using(private.message_participant(messages));
create policy requests_participant_read on public.quote_requests for select to authenticated using(planner_id=private.request_actor() or private.request_provider(vendor_id,venue_id)=private.request_actor());
create policy requests_planner_insert on public.quote_requests for insert to authenticated with check(planner_id=private.request_actor());
create policy bookings_participant_read on public.bookings for select to authenticated using(private.booking_participant(id));
revoke all on public.messages,public.bookings,public.quote_requests from anon,authenticated;
grant select on public.messages,public.bookings,public.quote_requests to authenticated;
grant insert on public.quote_requests to authenticated;

create function private.send_quote_message(request uuid,message_body text) returns public.messages language plpgsql security definer set search_path='' as $$
declare q public.quote_requests; actor uuid; provider uuid; m public.messages; event_state public.event_status;
begin
 actor=private.request_actor();
 select * into q from public.quote_requests where id=request for update;
 provider=private.request_provider(q.vendor_id,q.venue_id);
 if q.id is null or provider is null or actor not in(q.planner_id,provider) then raise exception 'Request unavailable'; end if;
 select status into event_state from public.events where id=q.event_id;
 if q.status in('declined','cancelled','expired') or event_state in('cancelled','completed') then raise exception 'This conversation is read only'; end if;
 message_body=btrim(message_body);
 if message_body is null or length(message_body)=0 or length(message_body)>4000 then raise exception 'Enter a message between 1 and 4000 characters'; end if;
 insert into public.messages(quote_request_id,sender_id,receiver_id,body) values(q.id,actor,case when actor=q.planner_id then provider else q.planner_id end,message_body) returning * into m;
 update public.quote_requests set updated_at=now() where id=q.id;
 return m;
end $$;
create function private.send_vendor_quote(request uuid,price numeric,note text,expected_revision integer) returns public.quote_requests language plpgsql security definer set search_path='' as $$
declare q public.quote_requests; actor uuid;
begin
 actor=private.request_actor(); select * into q from public.quote_requests where id=request for update;
 if q.id is null or actor is distinct from private.request_provider(q.vendor_id,q.venue_id) then raise exception 'Request unavailable'; end if;
 if q.quote_revision is distinct from expected_revision then raise exception 'This quote changed. Refresh before continuing.'; end if;
 if q.status not in('pending','sent','countered') or exists(select 1 from public.bookings where quote_request_id=q.id) then raise exception 'This request cannot receive another quote'; end if;
 if price is null or price<=0 or price>100000000 or price::text in('NaN','Infinity','-Infinity') or price<>round(price,2) then raise exception 'Enter a valid final price with up to two decimal places'; end if;
 if length(coalesce(note,''))>3000 then raise exception 'Keep your quote note under 3000 characters'; end if;
 perform private.send_quote_message(q.id,case when q.vendor_final_price is null then 'Quote sent: $' else 'Updated quote: $' end||price::text||case when nullif(btrim(note),'') is not null then E'\n'||btrim(note) else '' end);
 update public.quote_requests set status='sent',vendor_final_price=price,quote_revision=quote_revision+1,updated_at=now() where id=q.id returning * into q;
 return q;
end $$;
create function private.close_quote_request(request uuid,operation text,note text) returns public.quote_requests language plpgsql security definer set search_path='' as $$
declare q public.quote_requests; actor uuid;
begin
 actor=private.request_actor(); select * into q from public.quote_requests where id=request for update;
 if q.id is null or (operation='decline' and actor is distinct from private.request_provider(q.vendor_id,q.venue_id)) or (operation='withdraw' and actor<>q.planner_id) or operation is null or operation not in('decline','withdraw') then raise exception 'Request unavailable'; end if;
 if q.status not in('pending','sent','countered') and not(q.status='accepted' and not exists(select 1 from public.bookings where quote_request_id=q.id)) then raise exception 'This request is already closed or booked'; end if;
 if exists(select 1 from public.bookings where quote_request_id=q.id) then raise exception 'Booked requests cannot be withdrawn or declined'; end if;
 if length(coalesce(note,''))>3000 then raise exception 'Keep your note under 3000 characters'; end if;
 perform private.send_quote_message(q.id,case when operation='withdraw' then 'Customer withdrew this request.' else 'Provider declined this request.' end||case when nullif(btrim(note),'') is not null then E'\n'||btrim(note) else '' end);
 update public.quote_requests set status=case when operation='decline' then 'declined'::public.quote_status else 'cancelled'::public.quote_status end,quote_revision=quote_revision+1,updated_at=now() where id=q.id returning * into q;
 return q;
end $$;
create function private.accept_quote_and_create_booking(request uuid,expected_revision integer) returns public.bookings language plpgsql security definer set search_path='' as $$
declare q public.quote_requests; b public.bookings; actor uuid; price numeric;
begin
 actor=private.request_actor(); select * into q from public.quote_requests where id=request for update;
 if q.id is null or actor<>q.planner_id then raise exception 'Request unavailable'; end if;
 select * into b from public.bookings where quote_request_id=q.id;
 if b.id is not null then return b; end if;
 if q.quote_revision is distinct from expected_revision then raise exception 'The provider updated this quote. Refresh and review the latest price.'; end if;
 if q.status not in('sent','countered','accepted') then raise exception 'Wait for a provider quote before accepting'; end if;
 if private.request_provider(q.vendor_id,q.venue_id) is null then raise exception 'This provider cannot be booked'; end if;
 -- accepted without a booking is the legacy vendor-offer state. Only that state
 -- may use its original estimate when there is no recorded vendor final price.
 price=coalesce(q.vendor_final_price,case when q.status='accepted' then q.estimated_price end);
 if price is null or price<=0 or price>100000000 or price::text in('NaN','Infinity','-Infinity') then raise exception 'Ask the provider for a valid final quote'; end if;
 if not exists(select 1 from public.events where id=q.event_id and planner_id=actor and status not in('cancelled','completed') for share) then raise exception 'This event cannot accept bookings'; end if;
 insert into public.bookings(event_id,planner_id,vendor_id,service_id,venue_id,quote_request_id,final_price,deposit_amount,balance_due,booking_status,payment_status,booking_timeline)
 values(q.event_id,q.planner_id,q.vendor_id,q.service_id,q.venue_id,q.id,price,0,price,'confirmed','not_started',jsonb_build_array(jsonb_build_object('at',now(),'label','Customer accepted quote. No payment collected.'))) returning * into b;
 update public.quote_requests set status='accepted',quote_revision=quote_revision+1,updated_at=now() where id=q.id;
 perform private.send_quote_message(q.id,'Customer accepted the quote. Booking recorded. No payment collected.');
 return b;
end $$;
create function private.save_booking_note(booking uuid,note text) returns public.bookings language plpgsql security definer set search_path='' as $$
declare b public.bookings; actor uuid;
begin
 actor=private.request_actor(); select * into b from public.bookings where id=booking for update;
 if b.id is null or not private.booking_participant(b.id) then raise exception 'Booking unavailable'; end if;
 if length(coalesce(note,''))>4000 then raise exception 'Keep your note under 4000 characters'; end if;
 if actor=b.planner_id then update public.bookings set planner_notes=nullif(btrim(note),'') where id=b.id returning * into b;
 else update public.bookings set vendor_notes=nullif(btrim(note),'') where id=b.id returning * into b; end if;
 return b;
end $$;

create function private.get_quote_thread(request uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare q public.quote_requests; b public.bookings; actor uuid; provider uuid; ctx jsonb; conflicts integer; event_state public.event_status;
begin
 actor=private.request_actor(); select * into q from public.quote_requests where id=request;
 if q.id is null or not private.request_participant(q.id) then raise exception 'Request unavailable'; end if;
 provider=private.request_provider(q.vendor_id,q.venue_id);
 ctx=coalesce(q.request_context,private.request_context_for(q));
 select * into b from public.bookings where quote_request_id=q.id;
 select status into event_state from public.events where id=q.event_id;
 if actor=provider then
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
create function private.get_request_inbox(audience text) returns jsonb language plpgsql stable security definer set search_path='' as $$
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
 where case when audience='customer' then q.planner_id=actor else private.request_provider(q.vendor_id,q.venue_id)=actor end
 order by q.updated_at desc limit 200) rows),'[]'::jsonb);
end $$;

-- Public API wrappers run as the caller. Privileged implementations live outside
-- the exposed schema and independently authorize every operation.
create function public.send_quote_message(request uuid,message_body text) returns public.messages language sql security invoker set search_path='' as $$select private.send_quote_message(request,message_body)$$;
create function public.send_vendor_quote(request uuid,price numeric,note text,expected_revision integer) returns public.quote_requests language sql security invoker set search_path='' as $$select private.send_vendor_quote(request,price,note,expected_revision)$$;
create function public.decline_quote(request uuid,note text) returns public.quote_requests language sql security invoker set search_path='' as $$select private.close_quote_request(request,'decline',note)$$;
create function public.withdraw_quote_request(request uuid) returns public.quote_requests language sql security invoker set search_path='' as $$select private.close_quote_request(request,'withdraw',null)$$;
create function public.accept_quote_and_create_booking(request uuid,expected_revision integer) returns public.bookings language sql security invoker set search_path='' as $$select private.accept_quote_and_create_booking(request,expected_revision)$$;
create function public.save_booking_note(booking uuid,note text) returns public.bookings language sql security invoker set search_path='' as $$select private.save_booking_note(booking,note)$$;
create function public.get_quote_thread(request uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.get_quote_thread(request)$$;
create function public.get_request_inbox(audience text) returns jsonb language sql stable security invoker set search_path='' as $$select private.get_request_inbox(audience)$$;

revoke all on function private.request_actor(),private.request_provider(uuid,uuid),private.request_participant(uuid),private.booking_participant(uuid),private.message_participant(public.messages),private.request_context_for(public.quote_requests),private.guard_new_request(),private.send_quote_message(uuid,text),private.send_vendor_quote(uuid,numeric,text,integer),private.close_quote_request(uuid,text,text),private.accept_quote_and_create_booking(uuid,integer),private.save_booking_note(uuid,text),private.get_quote_thread(uuid),private.get_request_inbox(text) from public,anon,authenticated;
grant execute on function private.request_provider(uuid,uuid),private.request_actor(),private.request_participant(uuid),private.booking_participant(uuid),private.message_participant(public.messages),private.send_quote_message(uuid,text),private.send_vendor_quote(uuid,numeric,text,integer),private.close_quote_request(uuid,text,text),private.accept_quote_and_create_booking(uuid,integer),private.save_booking_note(uuid,text),private.get_quote_thread(uuid),private.get_request_inbox(text) to authenticated;
revoke all on function public.send_quote_message(uuid,text),public.send_vendor_quote(uuid,numeric,text,integer),public.decline_quote(uuid,text),public.withdraw_quote_request(uuid),public.accept_quote_and_create_booking(uuid,integer),public.save_booking_note(uuid,text),public.get_quote_thread(uuid),public.get_request_inbox(text) from public,anon;
grant execute on function public.send_quote_message(uuid,text),public.send_vendor_quote(uuid,numeric,text,integer),public.decline_quote(uuid,text),public.withdraw_quote_request(uuid),public.accept_quote_and_create_booking(uuid,integer),public.save_booking_note(uuid,text),public.get_quote_thread(uuid),public.get_request_inbox(text) to authenticated;
