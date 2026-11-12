create table public.vendor_private_operations (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_businesses(id) on delete cascade,
  request_id uuid unique references public.quote_requests(id) on delete cascade,
  booking_id uuid unique references public.bookings(id) on delete cascade,
  proposed_amount numeric(12,2) check (proposed_amount between 0 and 9999999999.99),
  draft_notes text not null default '' check (length(draft_notes) <= 10000),
  private_notes text not null default '' check (length(private_notes) <= 10000),
  tasks jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (request_id is not null and booking_id is null and tasks = '[]'::jsonb)
    or (booking_id is not null and request_id is null and proposed_amount is null and draft_notes = '')
  )
);

create index vendor_private_operations_branch on public.vendor_private_operations(vendor_id);

alter table public.vendor_private_operations enable row level security;
revoke all on public.vendor_private_operations from public, anon, authenticated;
grant select on public.vendor_private_operations to authenticated;
grant insert (vendor_id, request_id, booking_id, proposed_amount, draft_notes, private_notes, tasks)
  on public.vendor_private_operations to authenticated;
grant update (proposed_amount, draft_notes, private_notes, tasks)
  on public.vendor_private_operations to authenticated;

-- Source checks run with the authenticated caller's existing source-table RLS.
create function private.vendor_operation_source(vendor uuid, request uuid, booking uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select private.business_member(vendor, array['owner','admin','manager'])
    and (
      exists(select 1 from public.quote_requests q where q.id = request and q.vendor_id = vendor)
      or exists(select 1 from public.bookings b where b.id = booking and b.vendor_id = vendor)
    )
$$;
revoke all on function private.vendor_operation_source(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function private.vendor_operation_source(uuid, uuid, uuid) to authenticated;

create policy vendor_private_operations_read on public.vendor_private_operations for select to authenticated
  using (private.vendor_operation_source(vendor_id, request_id, booking_id));
create policy vendor_private_operations_create on public.vendor_private_operations for insert to authenticated
  with check (private.vendor_operation_source(vendor_id, request_id, booking_id));
create policy vendor_private_operations_edit on public.vendor_private_operations for update to authenticated
  using (private.vendor_operation_source(vendor_id, request_id, booking_id))
  with check (private.vendor_operation_source(vendor_id, request_id, booking_id));

create function private.guard_vendor_operation() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare task jsonb;
begin
  if jsonb_typeof(new.tasks) <> 'array' then raise exception 'Tasks must be a list'; end if;
  if jsonb_array_length(new.tasks) > 100 then raise exception 'Use at most 100 preparation tasks'; end if;
  for task in select value from jsonb_array_elements(new.tasks) loop
    if jsonb_typeof(task) <> 'object'
      or jsonb_typeof(task->'title') is distinct from 'string'
      or length(btrim(task->>'title')) not between 1 and 300
      or jsonb_typeof(task->'done') is distinct from 'boolean'
      or (task - 'title' - 'done') <> '{}'::jsonb
    then raise exception 'Each task needs a title and completion state'; end if;
  end loop;
  if tg_op = 'UPDATE' then
    new.version := old.version + 1;
    new.updated_at := clock_timestamp();
  end if;
  return new;
end $$;
revoke all on function private.guard_vendor_operation() from public, anon, authenticated;
create trigger guard_vendor_operation before insert or update on public.vendor_private_operations
  for each row execute function private.guard_vendor_operation();
