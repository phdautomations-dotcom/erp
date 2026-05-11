import { useEffect, useState } from "react";
import { Plus, Download, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmtINR, todayFY } from "@/lib/format";
import { generateReceiptPDF } from "@/lib/pdf";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Payments() {
  const { hasRole } = useAuth();
  const [direction, setDirection] = useState<"received" | "made">("received");
  const [rows, setRows] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [openDocs, setOpenDocs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ payment_date: new Date().toISOString().slice(0, 10), mode: "bank_transfer", amount: 0 });
  const [allocs, setAllocs] = useState<Record<string, number>>({});

  const load = async () => {
    const { data } = await supabase.from("payments").select("*, parties(name)").eq("direction", direction).order("payment_date", { ascending: false });
    setRows(data || []);
  };
  useEffect(() => {
    document.title = "Payments | PHD ERP"; load();
    supabase.from("parties").select("*").order("name").then(({ data }) => setParties(data || []));
    supabase.from("company_settings").select("*").limit(1).single().then(({ data }) => setSettings(data || {}));
  }, [direction]);

  useEffect(() => {
    if (!form.party_id) { setOpenDocs([]); return; }
    const dt = direction === "received" ? "invoice" : "purchase_bill";
    supabase.from("documents").select("*").eq("party_id", form.party_id).eq("doc_type", dt).then(({ data }) => {
      setOpenDocs((data || []).filter(d => Number(d.total) - Number(d.paid) > 0.01));
    });
  }, [form.party_id, direction]);

  const save = async () => {
    if (!form.party_id || !form.amount) return toast.error("Party and amount required");
    const { data: num } = await supabase.rpc("next_doc_number", { _doc_type: "invoice" as any, _fy: todayFY() });
    const payment_number = `${direction === "received" ? "RCT" : "PMT"}/${todayFY()}/${Date.now().toString().slice(-5)}`;
    const { data: u } = await supabase.auth.getUser();
    const { data: p, error } = await supabase.from("payments").insert({
      direction, payment_number, party_id: form.party_id, payment_date: form.payment_date,
      amount: +form.amount, mode: form.mode, reference: form.reference, notes: form.notes, created_by: u.user?.id,
    }).select().single();
    if (error) return toast.error(error.message);
    // allocations
    for (const [docId, amt] of Object.entries(allocs)) {
      if (!amt) continue;
      await supabase.from("payment_allocations").insert({ payment_id: p.id, document_id: docId, amount: +amt });
      const doc = openDocs.find(d => d.id === docId);
      if (doc) {
        const newPaid = Number(doc.paid) + Number(amt);
        const status = newPaid >= Number(doc.total) - 0.01 ? "paid" : "partial";
        await supabase.from("documents").update({ paid: newPaid, status }).eq("id", docId);
      }
    }
    toast.success("Payment recorded");
    setOpen(false); setForm({ payment_date: new Date().toISOString().slice(0, 10), mode: "bank_transfer", amount: 0 }); setAllocs({});
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete payment? Allocations will be reversed.")) return;
    const { data: a } = await supabase.from("payment_allocations").select("*").eq("payment_id", id);
    for (const al of a || []) {
      const { data: d } = await supabase.from("documents").select("paid,total").eq("id", al.document_id).single();
      if (d) {
        const np = Math.max(0, Number(d.paid) - Number(al.amount));
        await supabase.from("documents").update({ paid: np, status: np <= 0.01 ? "draft" : np >= Number(d.total) - 0.01 ? "paid" : "partial" }).eq("id", al.document_id);
      }
    }
    await supabase.from("payments").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  const downloadReceipt = async (p: any) => {
    const party = parties.find(x => x.id === p.party_id);
    if (party) await generateReceiptPDF(p, party, settings);
  };

  return (
    <AdminLayout title="Payments">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <Tabs value={direction} onValueChange={(v) => setDirection(v as any)}>
          <TabsList><TabsTrigger value="received">Received</TabsTrigger><TabsTrigger value="made">Made</TabsTrigger></TabsList>
        </Tabs>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-full bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-1" /> New Payment</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New {direction === "received" ? "Receipt" : "Payment"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Party</Label>
                <Select value={form.party_id || ""} onValueChange={v => setForm({ ...form, party_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="max-h-72">{parties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Date</Label><Input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} /></div>
                <div><Label>Amount (₹)</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Mode</Label>
                  <Select value={form.mode} onValueChange={v => setForm({ ...form, mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["cash", "upi", "bank_transfer", "cheque", "card"].map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Reference</Label><Input value={form.reference || ""} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>

              {openDocs.length > 0 && (
                <div>
                  <Label>Allocate to open {direction === "received" ? "invoices" : "bills"}</Label>
                  <div className="border border-border rounded-lg divide-y divide-border max-h-52 overflow-y-auto">
                    {openDocs.map(d => {
                      const due = Number(d.total) - Number(d.paid);
                      return (
                        <div key={d.id} className="flex items-center justify-between p-2 text-sm">
                          <div><div className="font-mono text-xs">{d.doc_number}</div><div className="text-xs text-muted-foreground">Due: {fmtINR(due)}</div></div>
                          <Input type="number" step="0.01" max={due} className="h-8 w-28 text-right" value={allocs[d.id] || ""} onChange={e => setAllocs({ ...allocs, [d.id]: +e.target.value })} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <Button onClick={save} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">Save Payment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
            <th className="text-left p-3">Date</th><th className="text-left">Number</th><th className="text-left">Party</th><th className="text-left">Mode</th><th className="text-right">Amount</th><th></th>
          </tr></thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3">{p.payment_date}</td>
                <td className="font-mono text-xs">{p.payment_number}</td>
                <td>{(p.parties as any)?.name}</td>
                <td className="capitalize">{p.mode.replace("_", " ")}</td>
                <td className="text-right">{fmtINR(p.amount)}</td>
                <td className="text-right p-3">
                  <Button variant="ghost" size="icon" onClick={() => downloadReceipt(p)}><Download className="h-4 w-4" /></Button>
                  {hasRole("admin") && <Button variant="ghost" size="icon" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No payments yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
