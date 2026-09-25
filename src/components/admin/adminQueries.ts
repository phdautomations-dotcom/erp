import { Users, Package, FileText, Wallet, Receipt, Inbox, UserCog, Banknote } from "@/lib/icons";
import { supabase } from "@/integrations/supabase/client";
import { fmtINR } from "@/lib/format";

// Data behind the app bar's global search and notifications bell. Shared by every design's
// chrome (the Material/Minimal/iOS bars in AdminLayout and the SAP shell), so they always
// show the same results.

export type SearchResult = { id: string; label: string; sub: string; href: string; icon: React.ElementType };
export type Notif = { id: string; title: string; sub: string; icon: React.ElementType; href: string; time: string };

export async function searchEverything(query: string): Promise<SearchResult[]> {
  const like = `%${query}%`;
  const [parties, items, docs, expenses, payments, cash, leads, profiles] = await Promise.all([
    supabase.from("parties").select("id,name,phone,city").ilike("name", like).limit(4),
    supabase.from("items").select("id,name,sale_price,unit").ilike("name", like).limit(4),
    supabase.from("documents").select("id,doc_number,doc_type,total,doc_date").ilike("doc_number", like).limit(4),
    (supabase as any).from("expenses").select("id,description,amount,category").ilike("description", like).limit(3),
    supabase.from("payments").select("id,payment_number,amount,direction").ilike("payment_number", like).limit(3),
    (supabase as any).from("cash_ledger").select("id,description,amount,type").ilike("description", like).limit(3),
    (supabase as any).from("leads").select("id,name,phone,status").ilike("name", like).limit(3),
    supabase.from("profiles").select("user_id,display_name,phone").ilike("display_name", like).limit(3),
  ]);

  return [
    ...(parties.data || []).map((p: any) => ({
      id: p.id, label: p.name,
      sub: [p.city, p.phone].filter(Boolean).join(" · "),
      href: `/admin/parties/${p.id}`, icon: Users,
    })),
    ...(items.data || []).map((i: any) => ({
      id: i.id, label: i.name,
      sub: `${fmtINR(i.sale_price)} / ${i.unit || "pc"}`,
      href: `/admin/items/${i.id}`, icon: Package,
    })),
    ...(docs.data || []).map((d: any) => ({
      id: d.id, label: d.doc_number,
      sub: `${d.doc_type?.replace("_", " ")} · ${fmtINR(d.total)}`,
      href: `/admin/${["purchase_bill", "purchase_order"].includes(d.doc_type) ? "purchases" : "sales"}/${d.id}`, icon: FileText,
    })),
    ...(expenses.data || []).map((e: any) => ({
      id: e.id, label: e.description || e.category,
      sub: `Expense · ${fmtINR(e.amount)}`,
      href: "/admin/expenses", icon: Receipt,
    })),
    ...(payments.data || []).map((p: any) => ({
      id: p.id, label: p.payment_number,
      sub: `Payment ${p.direction === "received" ? "received" : "made"} · ${fmtINR(p.amount)}`,
      href: "/admin/payments", icon: Wallet,
    })),
    ...(cash.data || []).map((c: any) => ({
      id: c.id, label: c.description || (c.type === "in" ? "Credit entry" : "Debit entry"),
      sub: `Cash ledger · ${fmtINR(c.amount)}`,
      href: "/admin/cash-ledger", icon: Banknote,
    })),
    ...(leads.data || []).map((l: any) => ({
      id: l.id, label: l.name,
      sub: [l.status, l.phone].filter(Boolean).join(" · "),
      href: "/admin/leads", icon: Inbox,
    })),
    ...(profiles.data || []).map((u: any) => ({
      id: u.user_id, label: u.display_name || "Unnamed",
      sub: [u.phone].filter(Boolean).join(" · ") || "User",
      href: "/admin/users", icon: UserCog,
    })),
  ];
}

export async function fetchNotifications(): Promise<Notif[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [overdue, recentExp, newLeads] = await Promise.all([
    supabase.from("documents")
      .select("id,doc_number,total,doc_date,parties(name)")
      .eq("doc_type", "invoice")
      .lte("doc_date", thirtyDaysAgo)
      .order("doc_date", { ascending: false })
      .limit(5),
    (supabase as any).from("expenses")
      .select("id,description,amount,category,expense_date")
      .gte("expense_date", sevenDaysAgo)
      .order("expense_date", { ascending: false })
      .limit(4),
    (supabase as any).from("leads")
      .select("id,name,phone,created_at")
      .gte("created_at", sevenDaysAgo + "T00:00:00Z")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const all: Notif[] = [];
  (overdue.data || []).forEach((d: any) => {
    all.push({
      id: `inv-${d.id}`,
      title: `Invoice ${d.doc_number} overdue`,
      sub: `${(d.parties as any)?.name || "Party"} · ${fmtINR(d.total)}`,
      icon: FileText,
      href: "/admin/sales",
      time: d.doc_date,
    });
  });
  (recentExp.data || []).forEach((e: any) => {
    all.push({
      id: `exp-${e.id}`,
      title: e.description || e.category || "Expense",
      sub: `Expense · ${fmtINR(e.amount)}`,
      icon: Receipt,
      href: "/admin/expenses",
      time: e.expense_date || "",
    });
  });
  (newLeads.data || []).forEach((l: any) => {
    all.push({
      id: `lead-${l.id}`,
      title: `New lead: ${l.name}`,
      sub: l.phone || "",
      icon: Inbox,
      href: "/admin/leads",
      time: (l.created_at || "").slice(0, 10),
    });
  });
  return all;
}
