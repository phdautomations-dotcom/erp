-- The previous auto-heal only matched documents against the NEW short
-- prefix (e.g. 'PHDPB-2627-'), so doc_types that haven't had a document
-- saved since the prefix format changed (purchase_bill, challan, ...)
-- still had their real max sitting in the OLD prefix format
-- ('PHD/PB/2026-27/0035') and were invisible to the heal check — which
-- would have handed out a duplicate of the highest number already used.
--
-- Fix: match on doc_type + financial year (accepting either the old
-- 'YYYY-YY' or new compact 'YYYYYY' form), not on the current prefix
-- string, so both formats are seen regardless of transition state.
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
  v_compact_fy text := substring(p_fy from 3 for 2) || right(p_fy, 2);
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
    where doc_type = p_doc_type
      and (doc_number like '%' || p_fy || '%' or doc_number like '%' || v_compact_fy || '%');

  v_reserved := greatest(v_current, v_real_max + 1);

  update public.number_series
    set next_number = v_reserved + 1, prefix = p_prefix, updated_at = now()
    where doc_type = p_doc_type and fy = p_fy;

  return p_prefix || lpad(v_reserved::text, 4, '0');
end;
$$;
