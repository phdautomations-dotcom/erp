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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, Wrench, Cpu, Printer, MapPin, Map } from "lucide-react";
import { INDIAN_STATES } from "@/lib/states";
import { fmtINR, fmtNum } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addPdfBranding, type Settings } from "@/lib/pdf";

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
  map_url: z.string().max(1000).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export default function PartyForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { hasRole } = useAuth();
  const isEdit = id && id !== "new";
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<any>({ type: "customer", opening_balance: 0 });
  const [ledger, setLedger] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [visitOpen, setVisitOpen] = useState(false);
  const [visit, setVisit] = useState<any>({ visit_date: new Date().toISOString().slice(0, 10), visit_type: "repair", status: "completed", charges: 0 });
  const [busy, setBusy] = useState(false);
  const [machines, setMachines] = useState<any[]>([]);
  const [machineOpen, setMachineOpen] = useState(false);
  const [machineForm, setMachineForm] = useState<any>({});
  const [activeTab, setActiveTab] = useState("details");
  const [ledgerFrom, setLedgerFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10));
  const [ledgerTo, setLedgerTo] = useState(new Date().toISOString().slice(0, 10));
  const [engineers, setEngineers] = useState<any[]>([]);

  const loadVisits = (pid: string) =>
    supabase.from("service_visits").select("*").eq("party_id", pid).order("visit_date", { ascending: false }).then(({ data }) => setVisits(data || []));
  const loadMachines = (pid: string) =>
    (supabase as any).from("party_machines").select("*").eq("party_id", pid).order("created_at", { ascending: false }).then(({ data }: any) => setMachines(data || []));

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
      loadMachines(id as string);
    }
    supabase.from("profiles").select("user_id, display_name").then(({ data }) => setEngineers(data || []));
    supabase.from("company_settings").select("*").limit(1).single().then(({ data }) => setSettings(data));
  }, [id, isEdit]);

  const saveVisit = async () => {
    if (!visit.work_description) return toast.error("Work description required");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("service_visits").insert({
      party_id: id,
      visit_date: visit.visit_date,
      engineer_name: visit.engineer_name || "Unassigned",
      engineer_user_id: visit.engineer_user_id || null,
      visit_type: visit.visit_type,
      machine_details: visit.machine_details || null,
      work_description: visit.work_description,
      parts_used: visit.parts_used || null,
      status: visit.status,
      charges: +visit.charges || 0,
      next_visit_date: visit.next_visit_date || null,
      notes: visit.notes || null,
      created_by: u.user?.id,
      is_verified: visit.status === "completed" ? true : false,
    });
    if (error) return toast.error(error.message);
    toast.success("Visit logged");
    setVisitOpen(false);
    setVisit({ visit_date: new Date().toISOString().slice(0, 10), visit_type: "repair", status: "completed", charges: 0 });
    loadVisits(id as string);
  };

  const verifyVisit = async (vid: string) => {
    const { error } = await supabase.from("service_visits").update({ is_verified: true }).eq("id", vid);
    if (error) return toast.error(error.message);
    toast.success("Visit verified successfully!");
    loadVisits(id as string);
  };

  const delVisit = async (vid: string) => {
    if (!confirm("Delete this visit?")) return;
    const { error } = await supabase.from("service_visits").delete().eq("id", vid);
    if (error) return toast.error(error.message);
    loadVisits(id as string);
  };

  const saveMachine = async () => {
    if (!machineForm.name) return toast.error("Machine Name required");
    const { error } = await (supabase as any).from("party_machines").insert({ ...machineForm, party_id: id });
    if (error) return toast.error(error.message);
    toast.success("Machine added");
    setMachineOpen(false);
    setMachineForm({});
    loadMachines(id as string);
  };

  const delMachine = async (mid: string) => {
    if (!confirm("Delete this machine?")) return;
    await (supabase as any).from("party_machines").delete().eq("id", mid);
    loadMachines(id as string);
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
  const filteredLedger = ledger.filter(l => l.date >= ledgerFrom && l.date <= ledgerTo);

  const printLedger = async () => {
    if (!settings) {
      return toast.error("Company settings not loaded yet. Please wait and try again.");
    }
    const pdf = new jsPDF("p", "mm", "a4");
    let y = await addPdfBranding(pdf, "LEDGER STATEMENT", settings);

    // Add party details and date range
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(form.name || "Party", 12, y);

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    const dateRange = `From: ${new Date(ledgerFrom).toLocaleDateString('en-GB')} To: ${new Date(ledgerTo).toLocaleDateString('en-GB')}`;
    pdf.text(dateRange, pdf.internal.pageSize.getWidth() - 12, y, { align: "right" });
    y += 10;

    // Find balance before the start date
    const openingBalance = Number(form.opening_balance || 0);
    const entriesBefore = ledger.filter(l => l.date < ledgerFrom);
    const balanceBroughtForward = openingBalance + (entriesBefore.at(-1)?.balance || 0);

    const head = [['Date', 'Particulars', 'Debit', 'Credit', 'Balance']];
    
    const body = filteredLedger.map(l => {
        const runningBalance = openingBalance + l.balance;
        return [
            new Date(l.date).toLocaleDateString('en-GB'),
            l.ref,
            l.debit ? fmtNum(l.debit) : "",
            l.credit ? fmtNum(l.credit) : "",
            fmtNum(runningBalance)
        ];
    });

    body.unshift(['', 'Balance Brought Forward', '', '', fmtNum(balanceBroughtForward)]);

    const lastEntryInPeriod = filteredLedger.at(-1);
    const closingBalance = lastEntryInPeriod ? (openingBalance + lastEntryInPeriod.balance) : balanceBroughtForward;
    const totalDebit = filteredLedger.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = filteredLedger.reduce((sum, l) => sum + (l.credit || 0), 0);

    const foot = [
        ['', 'Period Total', fmtNum(totalDebit), fmtNum(totalCredit), ''],
        ['', 'Closing Balance', '', '', fmtNum(closingBalance)]
    ];

    autoTable(pdf, {
        startY: y,
        head, body, foot,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'normal' },
        footStyles: { fillColor: [240, 240, 240], textColor: 15, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 1.8, valign: "middle" },
        columnStyles: {
            0: { cellWidth: 20 }, 1: { cellWidth: 'auto' },
            2: { halign: 'right', cellWidth: 25 }, 3: { halign: 'right', cellWidth: 25 },
            4: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
        },
    });

    pdf.save(`Ledger_${form.name.replace(/\s/g, "_")}_${ledgerFrom}_${ledgerTo}.pdf`);
  };

  return (
    <AdminLayout title={isEdit ? `Party · ${form.name || ""}` : "New Party"}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {isEdit && (
          <TabsList className="mb-6 bg-card/50 backdrop-blur border border-border/50 p-1.5 h-auto rounded-2xl flex w-full sm:w-fit gap-1 overflow-x-auto justify-start">
            <TabsTrigger value="details" className="rounded-xl px-4 py-2">Party Details</TabsTrigger>
            <TabsTrigger value="machines" className="rounded-xl px-4 py-2">Machines & AMC</TabsTrigger>
            <TabsTrigger value="ledger" className="rounded-xl px-4 py-2">Ledger</TabsTrigger>
            <TabsTrigger value="service" className="rounded-xl px-4 py-2">Service Log</TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="details" className="mt-0">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 max-w-4xl">
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
          <div className="grid sm:grid-cols-4 gap-4">
            <div><Label>City</Label><Input value={form.city || ""} onChange={(e) => u("city", e.target.value)} /></div>
            <div><Label>State</Label>
              <Select value={form.state || ""} onValueChange={(v) => { const s = INDIAN_STATES.find(x => x.name === v); u("state", v); u("state_code", s?.code); }}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>State Code</Label><Input value={form.state_code || ""} onChange={(e) => u("state_code", e.target.value)} placeholder="e.g. 06" /></div>
            <div><Label>Pincode</Label><Input value={form.pincode || ""} onChange={(e) => u("pincode", e.target.value)} /></div>
          </div>
          <div className="sm:col-span-2">
            <Label>Plant / Site Location (Map Link)</Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={form.map_url || ""} onChange={(e) => u("map_url", e.target.value)} placeholder="Paste Google Maps Link here" className="flex-1" />
              <Button type="button" variant="outline" onClick={() => window.open("https://maps.google.com", "_blank")} title="Open Google Maps">
                 <Map className="h-4 w-4 sm:mr-2 text-blue-500" /> <span className="hidden sm:inline">Search on Maps</span>
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                if (navigator.geolocation) {
                  toast.info("Fetching GPS location...");
                  navigator.geolocation.getCurrentPosition(
                    (pos) => u("map_url", `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`),
                    (err) => toast.error("Could not get location: " + err.message),
                    { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
                  );
                } else {
                  toast.error("Geolocation not supported");
                }
              }}>
                 <MapPin className="h-4 w-4 sm:mr-2 text-emerald-500" /> <span className="hidden sm:inline">GPS Location</span>
              </Button>
            </div>
          </div>
          <div><Label>Shipping Address (if different)</Label><Textarea rows={2} value={form.shipping_address || ""} onChange={(e) => u("shipping_address", e.target.value)} /></div>
          <div><Label>Notes</Label><Textarea rows={2} value={form.notes || ""} onChange={(e) => u("notes", e.target.value)} /></div>
          <div className="flex gap-3 pt-2">
            <Button onClick={save} disabled={busy} className="rounded-full bg-foreground text-background hover:bg-foreground/90">{busy ? "Saving…" : "Save"}</Button>
            <Link to="/admin/parties"><Button variant="outline" className="rounded-full">Cancel</Button></Link>
          </div>
        </div>
        </TabsContent>

        {isEdit && (
          <TabsContent value="ledger" className="mt-0">
            <div className="rounded-2xl border border-border bg-card p-6 max-w-4xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-display font-semibold">Ledger</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Input type="date" value={ledgerFrom} onChange={e => setLedgerFrom(e.target.value)} className="h-8 text-xs w-32" />
                <span className="text-muted-foreground text-xs">to</span>
                <Input type="date" value={ledgerTo} onChange={e => setLedgerTo(e.target.value)} className="h-8 text-xs w-32" />
                <Button size="sm" variant="outline" onClick={printLedger} disabled={!settings} className="rounded-full shadow-sm hover:shadow-md"><Printer className="h-4 w-4 mr-1" /> Print</Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mb-2">Closing balance: <span className="font-semibold text-foreground">{fmtINR(closing)}</span></div>
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground border-b border-border"><tr><th className="text-left py-1">Date</th><th className="text-left">Particulars</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr></thead>
                <tbody>
                  {filteredLedger.map((l, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="py-1">{l.date}</td><td>{l.ref}</td>
                      <td className="text-right">{l.debit ? fmtINR(l.debit) : ""}</td>
                      <td className="text-right">{l.credit ? fmtINR(l.credit) : ""}</td>
                    </tr>
                  ))}
                  {filteredLedger.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No transactions in this period.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          </TabsContent>
        )}

      {isEdit && (
        <TabsContent value="machines" className="mt-0">
          <div className="rounded-2xl border border-border bg-card p-6 max-w-5xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-display font-semibold flex items-center gap-2"><Cpu className="h-4 w-4" /> Machines & AMC</h3>
              <Dialog open={machineOpen} onOpenChange={setMachineOpen}>
                <DialogTrigger asChild><Button size="sm" className="rounded-full bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-1" /> Add Machine</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Machine</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Machine Name / Type *</Label><Input placeholder="e.g. CNC Lathe" value={machineForm.name || ""} onChange={e => setMachineForm({...machineForm, name: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Brand & Model</Label><Input placeholder="e.g. Haas ST-20" value={machineForm.model || ""} onChange={e => setMachineForm({...machineForm, model: e.target.value})} /></div>
                      <div><Label>Serial Number</Label><Input value={machineForm.serial_number || ""} onChange={e => setMachineForm({...machineForm, serial_number: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Installation Date</Label><Input type="date" value={machineForm.installation_date || ""} onChange={e => setMachineForm({...machineForm, installation_date: e.target.value})} /></div>
                      <div><Label>AMC Expiry Date</Label><Input type="date" value={machineForm.amc_expiry_date || ""} onChange={e => setMachineForm({...machineForm, amc_expiry_date: e.target.value})} /></div>
                    </div>
                    <Button onClick={saveMachine} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">Save Machine</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {machines.map(m => (
                <div key={m.id} className="border border-border/60 bg-muted/20 p-4 rounded-xl relative group">
                  <Button variant="ghost" size="icon" onClick={() => delMachine(m.id)} className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-sm text-muted-foreground">{m.model || "—"}</div>
                  <div className="text-xs text-muted-foreground mt-2 font-mono">SN: {m.serial_number || "—"}</div>
                  {m.amc_expiry_date && <div className="mt-3 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600">AMC Exp: {new Date(m.amc_expiry_date).toLocaleDateString('en-GB')}</div>}
                </div>
              ))}
              {machines.length === 0 && <div className="col-span-full py-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">No machines added yet.</div>}
            </div>
          </div>
        </TabsContent>
      )}

      {isEdit && (
        <TabsContent value="service" className="mt-0">
          <div className="rounded-2xl border border-border bg-card p-6 max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><Wrench className="h-4 w-4" /> Service Visit History</h3>
            <Dialog open={visitOpen} onOpenChange={setVisitOpen}>
              <DialogTrigger asChild><Button size="sm" className="rounded-full bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-1" /> Log Visit</Button></DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Log Service Visit</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Visit Date</Label><Input type="date" value={visit.visit_date} onChange={e => setVisit({ ...visit, visit_date: e.target.value })} /></div>
                    <div><Label>Engineer</Label>
                      <Select value={visit.engineer_user_id || "unassigned"} onValueChange={v => {
                        const eng = engineers.find(e => e.user_id === v);
                        setVisit({ ...visit, engineer_user_id: v === "unassigned" ? null : v, engineer_name: eng ? eng.display_name : "Unassigned" });
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{engineers.map(e => <SelectItem key={e.user_id} value={e.user_id}>{e.display_name || 'Unnamed User'}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
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
                <div className="flex items-end gap-2">
                  <div className="flex-1"><Label>Select Saved Machine (Optional)</Label>
                    <Select onValueChange={v => { const m = machines.find(x => x.id === v); if(m) setVisit({...visit, machine_details: `${m.name} ${m.model || ""} (SN: ${m.serial_number || "—"})`}); }}>
                      <SelectTrigger><SelectValue placeholder="Pick a machine..." /></SelectTrigger>
                      <SelectContent>{machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name} {m.model}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Machine Details *</Label><Input placeholder="Type manually or select above" value={visit.machine_details || ""} onChange={e => setVisit({ ...visit, machine_details: e.target.value })} /></div>
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
                    <td>
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs bg-muted capitalize">{v.status.replace("_", " ")}</span>
                      {v.status === 'completed' && !v.is_verified && <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold bg-yellow-500/10 text-yellow-600 ml-2">Unverified</span>}
                      {v.is_verified && <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold bg-green-500/10 text-green-600 ml-2">Verified</span>}
                    </td>
                    <td className="text-right">{fmtINR(v.charges)}</td>
                    <td className="text-right flex justify-end gap-1">
                      {hasRole("admin") && v.status === 'completed' && !v.is_verified && <Button variant="outline" size="sm" className="h-7 text-xs rounded-full" onClick={() => verifyVisit(v.id)}>Verify</Button>}
                      <Button variant="ghost" size="icon" onClick={() => delVisit(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
                {visits.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No service visits logged yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        </TabsContent>
      )}
      </Tabs>
    </AdminLayout>
  );
}
