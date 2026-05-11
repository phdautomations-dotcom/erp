
-- Status enum for leads
create type public.lead_status as enum ('new', 'contacted', 'quoted', 'won', 'lost');

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  phone text not null,
  email text,
  machine_type text,
  message text,
  status public.lead_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads enable row level security;

-- Anyone (including anonymous visitors) can submit a lead via the website
create policy "Anyone can submit a lead"
  on public.leads
  for insert
  to anon, authenticated
  with check (true);

-- For now (admin portal not yet built), only authenticated users can view/manage.
-- We will tighten this to admin-only roles in Phase 2 when user_roles is created.
create policy "Authenticated users can view leads"
  on public.leads
  for select
  to authenticated
  using (true);

create policy "Authenticated users can update leads"
  on public.leads
  for update
  to authenticated
  using (true);

create policy "Authenticated users can delete leads"
  on public.leads
  for delete
  to authenticated
  using (true);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();
