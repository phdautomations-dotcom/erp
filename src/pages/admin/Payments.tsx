import { useEffect, useState } from "react";
import { Plus, Download, Trash2, Printer } from "lucide-react";
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
    supabase.from("documents").select("*").eq("party_id", form.party_id).eq("doc_type", dt).neq("status", "cancelled").order("doc_date", { ascending: true }).then(({ data }) => {
      setOpenDocs((data || []).filter(d => Number(d.total) - Number(d.paid || 0) > 0.01));
    });
  }, [form.party_id, direction]);

  const handleAutoAllocate = () => {
    let remaining = Number(form.amount) || 0;
    const newAllocs: Record<string, number> = {};
    openDocs.forEach(d => {
      if (remaining <= 0.01) return;
      const due = Number(d.total) - Number(d.paid || 0);
      const allocate = Math.min(due, remaining);
      newAllocs[d.id] = Number(allocate.toFixed(2));
      remaining -= allocate;
    });
    setAllocs(newAllocs);
    toast.success("Auto-allocated to oldest pending documents");
  };

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
        const newPaid = Number(doc.paid || 0) + Number(amt);
        const status = newPaid >= (Number(doc.total) - 0.01) ? "paid" : "partial";
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

  const printReceipt = (p: any) => {
    const party = parties.find(x => x.id === p.party_id);
    const w = window.open("", "_blank");
    if (!w) return;
    
    const isReceived = p.direction === "received";
    const title = isReceived ? "PAYMENT RECEIPT" : "PAYMENT VOUCHER";
    const partyLabel = isReceived ? "Received From" : "Paid To";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - ${p.payment_number}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
          .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 28px; font-weight: 800; color: #111; margin: 0; letter-spacing: -0.5px; }
          .subtitle { font-size: 14px; color: #666; margin-top: 6px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .box { border: 1px solid #eaeaea; background: #fafafa; padding: 20px; border-radius: 12px; }
          .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600; }
          .value { font-size: 15px; font-weight: 500; color: #111; }
          .full-box { border: 1px solid #eaeaea; padding: 20px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .amount-text { font-size: 32px; font-weight: 700; color: #111; }
          .footer { margin-top: 60px; display: flex; justify-content: space-between; padding-top: 40px; border-top: 1px solid #eee; }
          .sign-box { text-align: center; width: 200px; }
          .sign-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 8px; font-size: 13px; color: #666; font-weight: 500; }
          @media print { 
            body { padding: 0; } 
            .box { border: 1px solid #ccc; background: transparent; }
            .full-box { border: 1px solid #ccc; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${title}</h1>
            <div class="subtitle">Receipt No: <strong>${p.payment_number}</strong><br/>Date: <strong>${new Date(p.payment_date).toLocaleDateString('en-GB')}</strong></div>
          </div>
          <div style="text-align: right;">
            <h2 style="margin:0; font-size:20px; color:#2563eb;">${settings.name || 'PHD Automations'}</h2>
            <div class="subtitle">${settings.phone || '+91 99995 02399'}<br/>${settings.email || 'contact@phdautomations.in'}</div>
          </div>
        </div>

        <div class="grid">
          <div class="box">
            <div class="label">${partyLabel}</div>
            <div class="value">${party?.name || 'Unknown'}</div>
            ${party?.phone ? `<div style="font-size: 14px; color: #555; margin-top: 6px;">📞 ${party.phone}</div>` : ''}
            ${party?.gstin ? `<div style="font-size: 14px; color: #555; margin-top: 2px;">GSTIN: ${party.gstin}</div>` : ''}
          </div>
          <div class="box">
            <div class="label">Payment Details</div>
            <div style="display:flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color:#666; font-size:14px;">Mode:</span>
              <span class="value" style="text-transform: capitalize;">${(p.mode || '').replace('_', ' ')}</span>
            </div>
            <div style="display:flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color:#666; font-size:14px;">Reference:</span>
              <span class="value">${p.reference || '—'}</span>
            </div>
          </div>
        </div>

        <div class="full-box">
          <div>
            <div class="label">Payment Amount</div>
            <div style="font-size: 14px; color: #666; margin-top: 4px;">${isReceived ? 'Amount received with thanks.' : 'Amount paid.'}</div>
          </div>
          <div class="amount-text">${fmtINR(p.amount)}</div>
        </div>

        ${p.notes ? `
        <div class="full-box" style="display: block;">
          <div class="label">Notes / Remarks</div>
          <div class="value" style="white-space: pre-wrap; font-weight: 400; line-height: 1.6; margin-top: 8px;">${p.notes}</div>
        </div>
        ` : ''}

        <div class="footer">
          <div class="sign-box">
            <div class="sign-line">${isReceived ? 'Customer Signature' : 'Receiver Signature'}</div>
          </div>
          <div class="sign-box">
            <div class="sign-line">Authorized Signatory</div>
          </div>
        </div>
      </body>
      </html>
    `;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 250);
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
                <div><Label>Amount (₹)</Label><Input type="number" step="0.01" value={form.amount} onChange={e => { setForm({ ...form, amount: e.target.value }); setAllocs({}); }} /></div>
                <div><Label>Mode</Label>
                  <Select value={form.mode} onValueChange={v => setForm({ ...form, mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["cash", "upi", "bank_transfer", "cheque", "card"].map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Reference</Label><Input value={form.reference || ""} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>

              {openDocs.length > 0 ? (
                <div className="mt-2 border border-border rounded-xl bg-muted/10 overflow-hidden">
                  <div className="flex justify-between items-center p-3 border-b border-border bg-muted/20">
                    <Label className="font-semibold text-foreground">Allocate to open {direction === "received" ? "invoices" : "bills"}</Label>
                    <Button variant="secondary" size="sm" onClick={handleAutoAllocate} type="button" className="h-7 text-xs rounded-full">Auto Allocate</Button>
                  </div>
                  <div className="divide-y divide-border max-h-52 overflow-y-auto p-2 space-y-1">
                    {openDocs.map(d => {
                      const due = Number(d.total) - Number(d.paid || 0);
                      return (
                        <div key={d.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors border border-transparent">
                          <div>
                            <div className="font-mono text-sm font-semibold">{d.doc_number}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Total: {fmtINR(d.total)} · Due: <span className="text-destructive font-medium">{fmtINR(due)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Pay:</span>
                            <Input type="number" step="0.01" max={due} placeholder="0.00" className="h-8 w-28 text-right font-semibold" value={allocs[d.id] || ""} onChange={e => {
                              const val = Number(e.target.value);
                              if (val > due) {
                                toast.error(`Cannot allocate more than due amount (${fmtINR(due)})`);
                                setAllocs({ ...allocs, [d.id]: due });
                              } else {
                                setAllocs({ ...allocs, [d.id]: val });
                              }
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-3 border-t border-border bg-muted/20 flex justify-between items-center">
                    <span className="text-xs font-medium text-muted-foreground">Unallocated: {fmtINR(Math.max(0, Number(form.amount || 0) - Object.values(allocs).reduce((a, b) => a + (Number(b) || 0), 0)))}</span>
                    <span className="text-xs font-bold text-emerald-600">Total Allocated: {fmtINR(Object.values(allocs).reduce((a, b) => a + (Number(b) || 0), 0))}</span>
                  </div>
                </div>
              ) : form.party_id ? (
                <div className="p-4 text-center border border-dashed border-border rounded-xl text-muted-foreground text-sm">No open documents for this party.<br/>Payment will be recorded as advance.</div>
              ) : null}
              <Button onClick={save} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">Save Payment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/30 text-xs font-medium text-muted-foreground"><tr>
              <th className="px-6 py-4 text-left">Date</th><th className="px-6 py-4 text-left">Number</th><th className="px-6 py-4 text-left">Party</th><th className="px-6 py-4 text-left">Mode</th><th className="px-6 py-4 text-right">Amount</th><th className="px-6 py-4"></th>
          </tr></thead>
            <tbody className="divide-y divide-border/50">
            {rows.map(p => (
                <tr key={p.id} className="transition-colors hover:bg-muted/30">
                  <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{p.payment_date}</td>
                  <td className="px-6 py-4 font-mono text-xs text-accent">{p.payment_number}</td>
                  <td className="px-6 py-4 font-medium">{(p.parties as any)?.name}</td>
                  <td className="px-6 py-4 capitalize"><span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground">{p.mode.replace("_", " ")}</span></td>
                  <td className="px-6 py-4 text-right font-semibold">{fmtINR(p.amount)}</td>
                  <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon" onClick={() => printReceipt(p)} title="Print Receipt/Voucher"><Printer className="h-4 w-4 text-muted-foreground hover:text-foreground" /></Button>
                  {hasRole("admin") && <Button variant="ghost" size="icon" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No payments yet.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </AdminLayout>
  );
}
