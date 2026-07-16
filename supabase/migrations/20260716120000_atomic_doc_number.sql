-- One counter row per (doc_type, fy) — required for the atomic upsert below.
alter table public.number_series
  add constraint number_series_doc_type_fy_key unique (doc_type, fy);

-- Atomically reserve the next document number for a doc_type + financial year.
-- Runs as SECURITY DEFINER so the row lock/UPDATE always succeeds regardless
-- of caller role, and concurrent callers can never receive the same number.
create or replace function public.reserve_doc_number(p_doc_type text, p_fy text, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserved int;
begin
  loop
    update public.number_series
      set next_number = next_number + 1, prefix = p_prefix, updated_at = now()
      where doc_type = p_doc_type and fy = p_fy
      returning next_number - 1 into v_reserved;

    exit when found;

    begin
      insert into public.number_series (doc_type, fy, prefix, next_number)
      values (p_doc_type, p_fy, p_prefix, 2);
      v_reserved := 1;
      exit;
    exception when unique_violation then
      -- another concurrent call inserted the row first; loop and take the UPDATE path
    end;
  end loop;

  return p_prefix || lpad(v_reserved::text, 4, '0');
end;
$$;

grant execute on function public.reserve_doc_number(text, text, text) to authenticated;
