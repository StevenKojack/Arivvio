-- Arivvio Pre-Beta project inquiry table.
-- Run this in the Supabase SQL editor before relying on database-backed
-- support/project inquiry submissions.

create table if not exists public.project_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  organization text,
  interest_types text[] not null default '{}',
  message text not null,
  preferred_contact_method text,
  status text not null default 'new',
  source_page text not null default 'prebeta_gateway'
);

alter table public.project_inquiries enable row level security;

drop policy if exists "Anyone can create project inquiries" on public.project_inquiries;
create policy "Anyone can create project inquiries"
on public.project_inquiries
for insert
to anon, authenticated
with check (true);

drop policy if exists "Approved admin can read project inquiries" on public.project_inquiries;
create policy "Approved admin can read project inquiries"
on public.project_inquiries
for select
to authenticated
using (lower(auth.jwt() ->> 'email') = 'stevenkojack2003@gmail.com');

drop policy if exists "Approved admin can update project inquiries" on public.project_inquiries;
create policy "Approved admin can update project inquiries"
on public.project_inquiries
for update
to authenticated
using (lower(auth.jwt() ->> 'email') = 'stevenkojack2003@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'stevenkojack2003@gmail.com');
