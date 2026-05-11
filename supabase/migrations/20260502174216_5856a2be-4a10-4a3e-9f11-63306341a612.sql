
drop policy if exists "Anyone can submit a lead" on public.leads;

create policy "Anyone can submit a valid lead"
  on public.leads
  for insert
  to anon, authenticated
  with check (
    length(btrim(name)) between 2 and 100
    and length(btrim(phone)) between 7 and 20
    and (email is null or length(email) <= 255)
    and (company is null or length(company) <= 150)
    and (machine_type is null or length(machine_type) <= 100)
    and (message is null or length(message) <= 2000)
    and status = 'new'
  );
