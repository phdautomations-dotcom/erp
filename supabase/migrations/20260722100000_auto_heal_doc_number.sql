-- reserve_doc_number() previously trusted number_series.next_number blindly.
-- That has two failure modes in practice:
--   1. If something reserves without ever saving a document (e.g. the admin
--      "new invoice" page reserving on every page open), the counter runs
--      ahead of real usage and every open silently skips a number.
--   2. If the counter ever falls behind real usage (seen on purchase_bill:
--      highest saved doc was #35 but the counter still pointed at 35), the
--      very next reservation would hand out a number that's already in use.
--
-- Fix: reconcile against the real max used number (parsed from documents)
-- every time, inside the same row-locked transaction, so it's impossible to
-- either skip ahead of or collide with what's actually been saved.
create or replace function public.reserve_doc_number(p_doc_type text, p_fy text, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current int;
  v_real_max int;
  v_reserved int;
begin
  insert into public.number_series (doc_type, fy, prefix, next_number)
  values (p_doc_type, p_fy, p_prefix, 1)
  on conflict (doc_type, fy) do nothing;

  select next_number into v_current
    from public.number_series
    where doc_type = p_doc_type and fy = p_fy
    for update;

  select coalesce(max((regexp_match(doc_number, '(\d+)$'))[1]::int), 0)
    into v_real_max
    from public.documents
    where doc_type = p_doc_type and doc_number like p_prefix || '%';

  v_reserved := greatest(v_current, v_real_max + 1);

  update public.number_series
    set next_number = v_reserved + 1, prefix = p_prefix, updated_at = now()
    where doc_type = p_doc_type and fy = p_fy;

  return p_prefix || lpad(v_reserved::text, 4, '0');
end;
$$;
