import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmtINR } from "@/lib/format";
import { classifyText } from "@/lib/ai/remote";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import { toast } from "sonner";

const CATEGORIES = ["Travel", "Office", "Tools", "Salaries", "Rent", "Utilities", "Marketing", "Misc"];

export default function Expenses() {
  const { hasRole } = useAuth();
  const confirm = useConfirm();
  const [rows, setRows] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ expense_date: new Date().toISOString().slice(0, 10), mode: "cash", category: "Office", amount: 0 });
  const [suggesting, setSuggesting] = useState(false);

  const suggestCategory = async () => {
    if (!form.description?.trim()) return;
    setSuggesting(true);
    try {
      const suggested = await classifyText(form.description, CATEGORIES);
      if (suggested) setForm((f: any) => ({ ...f, category: suggested }));
    } catch { /* silent — category stays as-is */ } finally { setSuggesting(false); }
  };

  const load = async () => {
    const { data } = await supabase.from("expenses").select("*, profiles(display_name)").order("expense_date", { ascending: false });
    setRows(data || []);
    const { data: profs } = await supabase.from("profiles").select("*");
    setEmployees(profs || []);
  };
  useEffect(() => { document.title = "Expenses | PHD ERP"; load(); }, []);

  const save = async () => {
    if (!form.amount) return toast.error("Amount required");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("expenses").insert({ ...form, amount: +form.amount, created_by: u.user?.id });
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); setForm({ expense_date: new Date().toISOString().slice(0, 10), mode: "cash", category: "Office", amount: 0 }); load();
  };
  const del = async (id: string) => {
    if (!(await confirm("Delete this expense?"))) return;
    await supabase.from("expenses").delete().eq("id", id);
    load();
  };

  return (
    <AdminLayout title="Expenses">
      <div className="flex justify-between mb-5">
        <p className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{fmtINR(rows.reduce((s, r) => s + Number(r.amount), 0))}</span></p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-full btn-gradient"><Plus className="h-4 w-4 mr-1" /> New Expense</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Expense</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} /></div>
                <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Mode</Label>
                  <Select value={form.mode} onValueChange={v => setForm({ ...form, mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["cash", "upi", "bank_transfer", "cheque", "card"].map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
                {form.category === "Salaries" && (
                  <div><Label>Select Employee</Label>
                    <Select value={form.employee_id || ""} onValueChange={v => setForm({ ...form, employee_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Pick Engineer/Staff" /></SelectTrigger>
                      <SelectContent className="max-h-56">
                        {employees.map(e => <SelectItem key={e.user_id} value={e.user_id}>{e.display_name || "Unnamed"}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              <div><Label>Description</Label>
                <div className="relative">
                  <Input value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} onBlur={suggestCategory} className="pr-8" />
                  {suggesting && <Sparkles className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-accent animate-pulse" />}
                </div>
              </div>
              <Button onClick={save} className="w-full rounded-full btn-gradient">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {/* Mobile: stacked cards — no horizontal scrolling */}
      <div className="md:hidden space-y-3">
        {rows.map(r => (
          <div key={r.id} className="rounded-2xl border border-border/50 bg-card/50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{r.category}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.description}
                  {r.category === 'Salaries' && r.profiles?.display_name && <span className="text-emerald-600 font-medium ml-1">(Paid to: {r.profiles.display_name})</span>}
                </p>
              </div>
              <p className="font-semibold shrink-0">{fmtINR(r.amount)}</p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{r.expense_date}</span>
                <span className="inline-flex rounded-full px-2 py-0.5 font-medium bg-muted capitalize">{r.mode.replace("_", " ")}</span>
              </div>
              {hasRole("admin") && <Button variant="ghost" size="icon" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="p-12 text-center text-muted-foreground font-medium">No expenses yet.</p>}
      </div>

      <div className="hidden md:block overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/30 text-xs font-medium text-muted-foreground"><tr><th className="px-6 py-4 text-left">Date</th><th className="px-6 py-4 text-left">Category</th><th className="px-6 py-4 text-left">Description</th><th className="px-6 py-4 text-left">Mode</th><th className="px-6 py-4 text-right">Amount</th><th className="px-6 py-4"></th></tr></thead>
            <tbody className="divide-y divide-border/50">
            {rows.map(r => (
                <tr key={r.id} className="transition-colors hover:bg-muted/30">
                  <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{r.expense_date}</td>
                  <td className="px-6 py-4 font-medium">{r.category}</td>
                  <td className="px-6 py-4 text-muted-foreground">{r.description} {r.category === 'Salaries' && r.profiles?.display_name ? <span className="text-emerald-600 font-medium ml-1">(Paid to: {r.profiles.display_name})</span> : ''}</td>
                  <td className="px-6 py-4 capitalize"><span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">{r.mode.replace("_", " ")}</span></td><td className="px-6 py-4 text-right font-semibold">{fmtINR(r.amount)}</td>
                  <td className="px-6 py-4 text-right">{hasRole("admin") && <Button variant="ghost" size="icon" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</td>
              </tr>
            ))}
              {rows.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-muted-foreground font-medium">No expenses yet.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </AdminLayout>
  );
}
