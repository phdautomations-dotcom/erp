-- Optional party link on cash ledger entries (e.g. "cash received from
-- customer X") — nullable, since most entries (fuel, misc cash expense)
-- have no party at all.
alter table public.cash_ledger
  add column party_id uuid references public.parties(id) on delete set null;
