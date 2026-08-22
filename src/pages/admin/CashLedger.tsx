import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmtINR, fmtDate } from "@/lib/format";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const emptyForm = () => ({ entry_date: new Date().toISOString().slice(0, 10), type: "in", amount: 0, description: "", party_id: "" });

export default function CashLedger() {
  const { hasRole, user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  const load = async () => {
    const { data } = await supabase.from("cash_ledger" as any).select("*, parties(name)").order("entry_date", { ascending: true }).order("created_at", { ascending: true });
    setRows((data as any[]) || []);
    const { data: profs } = await supabase.from("profiles").select("user_id, display_name");
    setProfiles(Object.fromEntries((profs || []).map((p: any) => [p.user_id, p.display_name || "Unnamed"])));
    const { data: parts } = await supabase.from("parties").select("id, name, gstin").order("name");
    setParties(parts || []);
  };
  useEffect(() => { document.title = "Cash Ledger | PHD ERP"; load(); }, []);

  const openNew = () => { setEditingId(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (r: any) => {
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

  const del = async (id: string) => { await supabase.from("cash_ledger" as any).delete().eq("id", id); load(); };

  let running = 0;
  const withBalance = rows.map(r => {
    running += r.type === "in" ? Number(r.amount) : -Number(r.amount);
    return { ...r, balance: running };
  });
  const balance = running;

  return (
    <AdminLayout title="Cash Ledger">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm text-muted-foreground">
          Current balance: <span className={`font-semibold ${balance < 0 ? "text-destructive" : "text-foreground"}`}>{fmtINR(balance)}</span>
        </p>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm(emptyForm()); } }}>
          <DialogTrigger asChild><Button onClick={openNew} className="rounded-full bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-1" /> New Entry</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Edit Cash Entry" : "New Cash Entry"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} /></div>
                <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                <div className="col-span-2"><Label>Type</Label>
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
              <Button onClick={save} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl">
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
              {rows.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-muted-foreground font-medium">No cash entries yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
