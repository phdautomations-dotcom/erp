-- Shared cash book: independent of documents/payments/expenses, so it never
-- touches revenue figures, invoices or reports. Every authenticated user
-- (admin + engineers) can add entries and sees the same shared list.
create table public.cash_ledger (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  type text not null check (type in ('in', 'out')),
  amount numeric not null check (amount > 0),
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index cash_ledger_entry_date_idx on public.cash_ledger (entry_date, created_at);

alter table public.cash_ledger enable row level security;

create policy "Enable ALL for authenticated" on public.cash_ledger
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
