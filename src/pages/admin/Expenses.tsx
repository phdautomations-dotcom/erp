import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmtINR } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const CATEGORIES = ["Travel", "Office", "Tools", "Salaries", "Rent", "Utilities", "Marketing", "Misc"];

export default function Expenses() {
  const { hasRole } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ expense_date: new Date().toISOString().slice(0, 10), mode: "cash", category: "Office", amount: 0 });

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
  const del = async (id: string) => { await supabase.from("expenses").delete().eq("id", id); load(); };

  return (
    <AdminLayout title="Expenses">
      <div className="flex justify-between mb-5">
        <p className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{fmtINR(rows.reduce((s, r) => s + Number(r.amount), 0))}</span></p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-full bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-1" /> New Expense</Button></DialogTrigger>
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
              <div><Label>Description</Label><Input value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <Button onClick={save} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl">
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
