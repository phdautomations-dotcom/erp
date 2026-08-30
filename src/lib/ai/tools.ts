// Read-only data lookups the AI assistant can pull facts from. The model
// never computes numbers itself — it only phrases whatever these functions
// return, so figures shown to the user always come straight from the DB.

export const getDashboardSnapshot = async (supabase: any) => {
  const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);
  const [{ data: docs }, { data: items }, { data: exps }, { data: cash }] = await Promise.all([
    supabase.from("documents").select("doc_type, total, paid, doc_date, status"),
    supabase.from("items").select("current_stock, low_stock_threshold"),
    supabase.from("expenses").select("expense_date, amount"),
    supabase.from("cash_ledger").select("type, amount"),
  ]);

  const receivable = (docs || []).filter((d: any) => d.doc_type === "invoice" && d.status !== "cancelled")
    .reduce((s: number, d: any) => s + Number(d.total) - Number(d.paid), 0);
  const monthSales = (docs || []).filter((d: any) => d.doc_type === "invoice" && d.doc_date >= startMonth.toISOString().slice(0, 10))
    .reduce((s: number, d: any) => s + Number(d.total), 0);
  const monthExpenses = (exps || []).filter((e: any) => e.expense_date >= startMonth.toISOString().slice(0, 10))
    .reduce((s: number, e: any) => s + Number(e.amount), 0);
  const lowStock = (items || []).filter((i: any) => Number(i.current_stock) <= Number(i.low_stock_threshold || 0)).length;
  const cashBalance = (cash || []).reduce((s: number, r: any) => s + (r.type === "in" ? Number(r.amount) : -Number(r.amount)), 0);

  return { receivable, monthSales, monthExpenses, lowStock, cashBalance };
};

export const findParties = async (supabase: any, query: string, limit = 5) => {
  const { data } = await supabase.from("parties").select("id, name, phone, type, opening_balance").ilike("name", `%${query}%`).limit(limit);
  return data || [];
};

// Mirrors the exact balance formula used on the party detail page
// (src/pages/admin/PartyForm.tsx) so the AI never contradicts it.
export const getPartyBalance = async (supabase: any, partyId: string, openingBalance: number) => {
  const [{ data: docs }, { data: pays }] = await Promise.all([
    supabase.from("documents").select("doc_type, total, status").eq("party_id", partyId),
    supabase.from("payments").select("amount, direction").eq("party_id", partyId),
  ]);
  let bal = openingBalance || 0;
  (docs || []).forEach((d: any) => {
    if (d.status === "cancelled") return;
    // Only invoice/purchase_bill are real debt — quotations/proformas are
    // pipeline docs, and a challan is just a delivery record (payment is
    // only ever collected against the invoice), so neither counts here.
    if (d.doc_type === "invoice") bal += Number(d.total);
    else if (d.doc_type === "purchase_bill") bal -= Number(d.total);
  });
  (pays || []).forEach((p: any) => {
    bal += p.direction === "made" ? Number(p.amount) : -Number(p.amount);
  });
  return bal;
};

export const getCashLedgerSummary = async (supabase: any, days = 30) => {
  const since = new Date(); since.setDate(since.getDate() - days);
  const { data } = await supabase.from("cash_ledger").select("type, amount, entry_date").gte("entry_date", since.toISOString().slice(0, 10));
  const rows = data || [];
  const credit = rows.filter((r: any) => r.type === "in").reduce((s: number, r: any) => s + Number(r.amount), 0);
  const debit = rows.filter((r: any) => r.type === "out").reduce((s: number, r: any) => s + Number(r.amount), 0);
  return { days, credit, debit, entries: rows.length };
};

export const getRecentDocuments = async (supabase: any, docType: string, limit = 5) => {
  const { data } = await supabase.from("documents").select("doc_number, doc_date, total, status, parties(name)")
    .eq("doc_type", docType).order("created_at", { ascending: false }).limit(limit);
  return data || [];
};

export const findItems = async (supabase: any, query: string, limit = 5) => {
  const { data } = await supabase.from("items").select("name, unit, sale_price, current_stock, low_stock_threshold").ilike("name", `%${query}%`).limit(limit);
  return data || [];
};

// Invoices with an outstanding balance (total > paid), oldest first — the
// same "who owes us and since when" view a collections follow-up needs.
export const getOverdueInvoices = async (supabase: any, limit = 5) => {
  const { data } = await supabase.from("documents").select("doc_number, doc_date, total, paid, parties(name)")
    .eq("doc_type", "invoice").neq("status", "cancelled").order("doc_date", { ascending: true }).limit(50);
  return (data || [])
    .filter((d: any) => Number(d.total) - Number(d.paid || 0) > 0.01)
    .slice(0, limit)
    .map((d: any) => ({ ...d, due: Number(d.total) - Number(d.paid || 0) }));
};
