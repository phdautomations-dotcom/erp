import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Wrench } from "lucide-react";
import { INDIAN_STATES } from "@/lib/states";
import { fmtINR } from "@/lib/format";
import { toast } from "sonner";

const partySchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(["customer", "vendor", "both"]),
  contact_person: z.string().max(120).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().or(z.literal("")).optional().nullable(),
  gstin: z.string().max(20).optional().nullable(),
  pan: z.string().max(15).optional().nullable(),
  billing_address: z.string().max(500).optional().nullable(),
  shipping_address: z.string().max(500).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  state: z.string().max(80).optional().nullable(),
  state_code: z.string().max(5).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  opening_balance: z.coerce.number().default(0),
  notes: z.string().max(1000).optional().nullable(),
});

export default function PartyForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const isEdit = id && id !== "new";
  const [form, setForm] = useState<any>({ type: "customer", opening_balance: 0 });
  const [ledger, setLedger] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [visitOpen, setVisitOpen] = useState(false);
  const [visit, setVisit] = useState<any>({ visit_date: new Date().toISOString().slice(0, 10), visit_type: "repair", status: "completed", charges: 0 });
  const [busy, setBusy] = useState(false);

  const loadVisits = (pid: string) =>
    supabase.from("service_visits").select("*").eq("party_id", pid).order("visit_date", { ascending: false }).then(({ data }) => setVisits(data || []));

  useEffect(() => {
    document.title = isEdit ? "Edit Party | PHD ERP" : "New Party | PHD ERP";
    if (isEdit) {
      supabase.from("parties").select("*").eq("id", id).single().then(({ data }) => data && setForm(data));
      // ledger: docs + payments
      Promise.all([
        supabase.from("documents").select("id,doc_type,doc_number,doc_date,total,paid").eq("party_id", id).order("doc_date"),
        supabase.from("payments").select("id,payment_number,payment_date,amount,direction,mode").eq("party_id", id).order("payment_date"),
      ]).then(([{ data: docs }, { data: pays }]) => {
        const entries: any[] = [];
        (docs || []).forEach(d => {
          const debit = ["invoice", "challan", "quotation", "proforma"].includes(d.doc_type);
          entries.push({ date: d.doc_date, ref: `${d.doc_type.toUpperCase()} ${d.doc_number}`, debit: debit ? Number(d.total) : 0, credit: !debit ? Number(d.total) : 0 });
        });
        (pays || []).forEach(p => {
          entries.push({ date: p.payment_date, ref: `${p.direction === "received" ? "Receipt" : "Payment"} ${p.payment_number} (${p.mode})`, debit: p.direction === "made" ? Number(p.amount) : 0, credit: p.direction === "received" ? Number(p.amount) : 0 });
        });
        entries.sort((a, b) => a.date.localeCompare(b.date));
        let bal = 0;
        const enriched = entries.map(e => { bal += e.debit - e.credit; return { ...e, balance: bal }; });
        setLedger(enriched);
      });
      loadVisits(id as string);
    }
  }, [id, isEdit]);

  const saveVisit = async () => {
    if (!visit.engineer_name || !visit.work_description) return toast.error("Engineer name & work description required");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("service_visits").insert({
      party_id: id,
      visit_date: visit.visit_date,
      engineer_name: visit.engineer_name,
      visit_type: visit.visit_type,
      machine_details: visit.machine_details || null,
      work_description: visit.work_description,
      parts_used: visit.parts_used || null,
      status: visit.status,
      charges: +visit.charges || 0,
      next_visit_date: visit.next_visit_date || null,
      notes: visit.notes || null,
      created_by: u.user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Visit logged");
    setVisitOpen(false);
    setVisit({ visit_date: new Date().toISOString().slice(0, 10), visit_type: "repair", status: "completed", charges: 0 });
    loadVisits(id as string);
  };

  const delVisit = async (vid: string) => {
    if (!confirm("Delete this visit?")) return;
    const { error } = await supabase.from("service_visits").delete().eq("id", vid);
    if (error) return toast.error(error.message);
    loadVisits(id as string);
  };

  const save = async () => {
    const parsed = partySchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setBusy(true);
    const payload: any = parsed.data;
    if (isEdit) {
      const { error } = await supabase.from("parties").update(payload).eq("id", id);
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Saved");
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("parties").insert({ ...payload, created_by: u.user?.id }).select().single();
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Created"); nav(`/admin/parties/${data.id}`);
    }
  };

  const u = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const closing = form.opening_balance ? Number(form.opening_balance) + (ledger.at(-1)?.balance || 0) : (ledger.at(-1)?.balance || 0);

  return (
    <AdminLayout title={isEdit ? `Party · ${form.name || ""}` : "New Party"}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Name *</Label><Input value={form.name || ""} onChange={(e) => u("name", e.target.value)} /></div>
            <div><Label>Type</Label>
              <Select value={form.type || "customer"} onValueChange={(v) => u("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>GSTIN</Label><Input value={form.gstin || ""} onChange={(e) => u("gstin", e.target.value.toUpperCase())} /></div>
            <div><Label>PAN</Label><Input value={form.pan || ""} onChange={(e) => u("pan", e.target.value.toUpperCase())} /></div>
            <div><Label>Contact Person</Label><Input value={form.contact_person || ""} onChange={(e) => u("contact_person", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.phone || ""} onChange={(e) => u("phone", e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email || ""} onChange={(e) => u("email", e.target.value)} /></div>
            <div><Label>Opening Balance (₹)</Label><Input type="number" step="0.01" value={form.opening_balance ?? 0} onChange={(e) => u("opening_balance", e.target.value)} /></div>
          </div>
          <div><Label>Billing Address</Label><Textarea rows={2} value={form.billing_address || ""} onChange={(e) => u("billing_address", e.target.value)} /></div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><Label>City</Label><Input value={form.city || ""} onChange={(e) => u("city", e.target.value)} /></div>
            <div><Label>State</Label>
              <Select value={form.state || ""} onValueChange={(v) => { const s = INDIAN_STATES.find(x => x.name === v); u("state", v); u("state_code", s?.code); }}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Pincode</Label><Input value={form.pincode || ""} onChange={(e) => u("pincode", e.target.value)} /></div>
          </div>
          <div><Label>Shipping Address (if different)</Label><Textarea rows={2} value={form.shipping_address || ""} onChange={(e) => u("shipping_address", e.target.value)} /></div>
          <div><Label>Notes</Label><Textarea rows={2} value={form.notes || ""} onChange={(e) => u("notes", e.target.value)} /></div>
          <div className="flex gap-3 pt-2">
            <Button onClick={save} disabled={busy} className="rounded-full bg-foreground text-background hover:bg-foreground/90">{busy ? "Saving…" : "Save"}</Button>
            <Link to="/admin/parties"><Button variant="outline" className="rounded-full">Cancel</Button></Link>
          </div>
        </div>

        {isEdit && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display font-semibold mb-3">Ledger</h3>
            <div className="text-sm text-muted-foreground mb-2">Closing balance: <span className="font-semibold text-foreground">{fmtINR(closing)}</span></div>
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground border-b border-border"><tr><th className="text-left py-1">Date</th><th className="text-left">Particulars</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr></thead>
                <tbody>
                  {ledger.map((l, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="py-1">{l.date}</td><td>{l.ref}</td>
                      <td className="text-right">{l.debit ? fmtINR(l.debit) : ""}</td>
                      <td className="text-right">{l.credit ? fmtINR(l.credit) : ""}</td>
                    </tr>
                  ))}
                  {ledger.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No transactions yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isEdit && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><Wrench className="h-4 w-4" /> Service Visit History</h3>
            <Dialog open={visitOpen} onOpenChange={setVisitOpen}>
              <DialogTrigger asChild><Button size="sm" className="rounded-full bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-1" /> Log Visit</Button></DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Log Service Visit</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Visit Date</Label><Input type="date" value={visit.visit_date} onChange={e => setVisit({ ...visit, visit_date: e.target.value })} /></div>
                    <div><Label>Engineer Name *</Label><Input value={visit.engineer_name || ""} onChange={e => setVisit({ ...visit, engineer_name: e.target.value })} /></div>
                    <div><Label>Visit Type</Label>
                      <Select value={visit.visit_type} onValueChange={v => setVisit({ ...visit, visit_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{["installation", "repair", "maintenance", "inspection", "other"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Status</Label>
                      <Select value={visit.status} onValueChange={v => setVisit({ ...visit, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{["scheduled", "in_progress", "completed", "cancelled"].map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Machine Details</Label><Input placeholder="e.g. Mazak VMC SVM-4500, Sl. No. 12345" value={visit.machine_details || ""} onChange={e => setVisit({ ...visit, machine_details: e.target.value })} /></div>
                  <div><Label>Work Description *</Label><Textarea rows={3} value={visit.work_description || ""} onChange={e => setVisit({ ...visit, work_description: e.target.value })} /></div>
                  <div><Label>Parts Used</Label><Textarea rows={2} value={visit.parts_used || ""} onChange={e => setVisit({ ...visit, parts_used: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Charges (₹)</Label><Input type="number" step="0.01" value={visit.charges} onChange={e => setVisit({ ...visit, charges: e.target.value })} /></div>
                    <div><Label>Next Visit Date</Label><Input type="date" value={visit.next_visit_date || ""} onChange={e => setVisit({ ...visit, next_visit_date: e.target.value })} /></div>
                  </div>
                  <div><Label>Notes</Label><Textarea rows={2} value={visit.notes || ""} onChange={e => setVisit({ ...visit, notes: e.target.value })} /></div>
                  <Button onClick={saveVisit} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">Save Visit</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr><th className="text-left py-2">Date</th><th className="text-left">Engineer</th><th className="text-left">Type</th><th className="text-left">Machine</th><th className="text-left">Work</th><th className="text-left">Status</th><th className="text-right">Charges</th><th></th></tr>
              </thead>
              <tbody>
                {visits.map(v => (
                  <tr key={v.id} className="border-b border-border/40 align-top">
                    <td className="py-2 whitespace-nowrap">{v.visit_date}</td>
                    <td>{v.engineer_name}</td>
                    <td className="capitalize">{v.visit_type}</td>
                    <td className="text-xs">{v.machine_details || "—"}</td>
                    <td className="text-xs max-w-[260px]"><div className="line-clamp-2">{v.work_description}</div>{v.parts_used && <div className="text-muted-foreground">Parts: {v.parts_used}</div>}</td>
                    <td><span className="inline-flex rounded-full px-2 py-0.5 text-xs bg-muted capitalize">{v.status.replace("_", " ")}</span></td>
                    <td className="text-right">{fmtINR(v.charges)}</td>
                    <td className="text-right"><Button variant="ghost" size="icon" onClick={() => delVisit(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                  </tr>
                ))}
                {visits.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No service visits logged yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
