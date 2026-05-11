
-- Drop overly permissive policies; we will recreate proper admin-only ones in Phase 2
drop policy if exists "Authenticated users can view leads" on public.leads;
drop policy if exists "Authenticated users can update leads" on public.leads;
drop policy if exists "Authenticated users can delete leads" on public.leads;

-- Harden function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
