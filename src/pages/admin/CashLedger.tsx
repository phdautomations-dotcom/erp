import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmtINR, fmtDate } from "@/lib/format";
import { Plus, Trash2, Edit2, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import { toast } from "sonner";

const emptyForm = () => ({ entry_date: new Date().toISOString().slice(0, 10), type: "in", amount: 0, description: "", party_id: "" });
const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function CashLedger() {
  const { hasRole, user } = useAuth();
  const confirm = useConfirm();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [openingBalance, setOpeningBalance] = useState(0);
  const [parties, setParties] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm());
  const [month, setMonth] = useState(currentMonth());

  // Scope the query itself to the selected month instead of pulling the
  // entire all-time ledger and filtering client-side — with thousands of
  // entries that all-time fetch was the real cost. The opening balance is
  // seeded from a slim two-column aggregate query (no join, no full rows)
  // over everything strictly before the selected month. A search term
  // narrows further within that same month's range via description/party.
  const load = async () => {
    const monthStart = `${month}-01`;
    // Plain string/integer arithmetic — going through Date + toISOString()
    // here shifts the boundary by the local timezone offset (e.g. IST is
    // UTC+5:30), which silently turned "end of month" into the 31st instead
    // of the 1st of next month, excluding entries dated the 31st itself.
    const [y, m] = month.split("-").map(Number);
    const monthEnd = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

    const { data: priorRows } = await supabase.from("cash_ledger" as any).select("type, amount").lt("entry_date", monthStart);
    setOpeningBalance((priorRows || []).reduce((s: number, r: any) => s + (r.type === "in" ? Number(r.amount) : -Number(r.amount)), 0));

    const term = q.trim();
    if (term) {
      const needle = `%${term}%`;
      // PostgREST here rejects a joined column (parties.name) inside .or() —
      // confirmed against the live API (PGRST100 "failed to parse logic
      // tree" on every variant). Resolve matching party ids first, then OR
      // them in via party_id.in().
      const { data: matchingParties } = await supabase.from("parties").select("id").ilike("name", needle).limit(50);
      const partyIds = (matchingParties || []).map((p: any) => p.id);
      const orParts = [`description.ilike.${needle}`];
      if (partyIds.length) orParts.push(`party_id.in.(${partyIds.join(",")})`);
      const { data } = await supabase.from("cash_ledger" as any)
        .select("*, parties(name)")
        .gte("entry_date", monthStart).lt("entry_date", monthEnd)
        .or(orParts.join(","))
        .order("entry_date", { ascending: true }).order("created_at", { ascending: true });
      setRows((data as any[]) || []);
    } else {
      const { data } = await supabase.from("cash_ledger" as any)
        .select("*, parties(name)")
        .gte("entry_date", monthStart).lt("entry_date", monthEnd)
        .order("entry_date", { ascending: true }).order("created_at", { ascending: true });
      setRows((data as any[]) || []);
    }

    const { data: profs } = await supabase.from("profiles").select("user_id, display_name");
    setProfiles(Object.fromEntries((profs || []).map((p: any) => [p.user_id, p.display_name || "Unnamed"])));
    const { data: parts } = await supabase.from("parties").select("id, name, gstin").order("name");
    setParties(parts || []);
  };
  useEffect(() => { document.title = "Cash Ledger | PHD ERP"; }, []);
  // Debounce the search query so it doesn't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [month, q]);

  const openNew = () => { setEditingId(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = async (r: any) => {
    if (!(await confirm({ title: "Edit this cash entry?", confirmText: "Edit" }))) return;
    setEditingId(r.id);
    setForm({ entry_date: r.entry_date, type: r.type, amount: r.amount, description: r.description || "", party_id: r.party_id || "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.amount || +form.amount <= 0) return toast.error("Enter a valid amount");
    const payload = {
      entry_date: form.entry_date, type: form.type, amount: +form.amount,
      description: form.description || null, party_id: form.party_id || null,
    };
    const { error } = editingId
      ? await supabase.from("cash_ledger" as any).update(payload).eq("id", editingId)
      : await supabase.from("cash_ledger" as any).insert({ ...payload, created_by: user?.id });
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); setEditingId(null);
    setForm(emptyForm());
    load();
  };

  const del = async (id: string) => {
    if (!(await confirm("Delete this cash entry?"))) return;
    await supabase.from("cash_ledger" as any).delete().eq("id", id);
    load();
  };

  // rows are already scoped to the selected month by the query — seed the
  // running balance from the opening balance computed before this month.
  let running = openingBalance;
  const withBalance = rows.map(r => {
    running += r.type === "in" ? Number(r.amount) : -Number(r.amount);
    return { ...r, balance: running };
  });
  const closingBalance = running;

  const monthCredit = rows.reduce((s, r) => s + (r.type === "in" ? Number(r.amount) : 0), 0);
  const monthDebit = rows.reduce((s, r) => s + (r.type === "out" ? Number(r.amount) : 0), 0);

  return (
    <AdminLayout title="Cash Ledger">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-40" />
          <p className="text-sm text-muted-foreground">
            Credit: <span className="font-semibold text-emerald-600">{fmtINR(monthCredit)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Debit: <span className="font-semibold text-destructive">{fmtINR(monthDebit)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Balance (as of month end): <span className={`font-semibold ${closingBalance < 0 ? "text-destructive" : "text-foreground"}`}>{fmtINR(closingBalance)}</span>
          </p>
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by description or party" className="pl-9 rounded-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm" />
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm(emptyForm()); } }}>
          <DialogTrigger asChild><Button onClick={openNew} className="rounded-full btn-gradient ml-auto"><Plus className="h-4 w-4 mr-1" /> New Entry</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Edit Cash Entry" : "New Cash Entry"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} /></div>
                <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Credit</SelectItem>
                      <SelectItem value="out">Debit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Party (optional)</Label>
                <Select value={form.party_id || "none"} onValueChange={v => setForm({ ...form, party_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Type to search a party..." /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="none">— No party —</SelectItem>
                    {parties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}{p.gstin ? ` · ${p.gstin}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Received from client, paid for fuel" /></div>
              <Button onClick={save} className="w-full rounded-full btn-gradient">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mobile: stacked cards — no horizontal scrolling */}
      <div className="md:hidden space-y-3">
        {[...withBalance].reverse().map(r => (
          <div key={r.id} className="rounded-2xl border border-border/50 bg-card/50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{r.parties?.name || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{r.description || "—"}</p>
              </div>
              <p className={`font-semibold shrink-0 ${r.type === "in" ? "text-emerald-600" : "text-destructive"}`}>
                {r.type === "in" ? "+" : "-"}{fmtINR(r.amount)}
              </p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-muted-foreground">
                <span>{fmtDate(r.entry_date)}</span> · <span>{profiles[r.created_by] || "—"}</span> · Bal: <span className="font-medium text-foreground">{fmtINR(r.balance)}</span>
              </div>
              <div className="flex items-center">
                <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit2 className="h-4 w-4" /></Button>
                {hasRole("admin") && <Button variant="ghost" size="icon" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
            </div>
          </div>
        ))}
        {withBalance.length === 0 && <p className="p-12 text-center text-muted-foreground font-medium">{q ? "No entries match your search" : "No cash entries for this month."}</p>}
      </div>

      <div className="hidden md:block overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Party</th>
                <th className="px-6 py-4 text-left">Description</th>
                <th className="px-6 py-4 text-left">Added By</th>
                <th className="px-6 py-4 text-right">Credit</th>
                <th className="px-6 py-4 text-right">Debit</th>
                <th className="px-6 py-4 text-right">Balance</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[...withBalance].reverse().map(r => (
                <tr key={r.id} className="transition-colors hover:bg-muted/30">
                  <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{fmtDate(r.entry_date)}</td>
                  <td className="px-6 py-4 text-muted-foreground">{r.parties?.name || "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{r.description || "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{profiles[r.created_by] || "—"}</td>
                  <td className="px-6 py-4 text-right font-medium text-emerald-600">{r.type === "in" ? fmtINR(r.amount) : ""}</td>
                  <td className="px-6 py-4 text-right font-medium text-destructive">{r.type === "out" ? fmtINR(r.amount) : ""}</td>
                  <td className="px-6 py-4 text-right font-semibold">{fmtINR(r.balance)}</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit2 className="h-4 w-4" /></Button>
                    {hasRole("admin") && <Button variant="ghost" size="icon" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </td>
                </tr>
              ))}
              {withBalance.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-muted-foreground font-medium">{q ? "No entries match your search" : "No cash entries for this month."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
