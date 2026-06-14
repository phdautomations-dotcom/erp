import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INDIAN_STATES } from "@/lib/states";
import { toast } from "sonner";

export default function Settings() {
  const [s, setS] = useState<any>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Settings | PHD ERP";
    supabase.from("company_settings").select("*").limit(1).single().then(({ data }) => data && setS(data));
  }, []);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("company_settings").update({
      name: s.name, gstin: s.gstin, pan: s.pan, address_line1: s.address_line1, address_line2: s.address_line2,
      city: s.city, state: s.state, state_code: s.state_code, pincode: s.pincode, phone: s.phone, email: s.email, website: s.website,
      bank_name: s.bank_name, bank_account: s.bank_account, bank_ifsc: s.bank_ifsc, bank_branch: s.bank_branch, upi_id: s.upi_id, terms: s.terms,
    }).eq("id", s.id);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };
  const u = (k: string, v: any) => setS((x: any) => ({ ...x, [k]: v }));

  return (
    <AdminLayout title="Settings">
      <div className="grid gap-6 lg:grid-cols-2 max-w-5xl">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-display font-semibold">Company</h3>
          <div><Label>Name</Label><Input value={s.name || ""} onChange={e => u("name", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>GSTIN</Label><Input value={s.gstin || ""} onChange={e => u("gstin", e.target.value.toUpperCase())} /></div>
            <div><Label>PAN</Label><Input value={s.pan || ""} onChange={e => u("pan", e.target.value.toUpperCase())} /></div>
          </div>
          <div><Label>Address Line 1</Label><Input value={s.address_line1 || ""} onChange={e => u("address_line1", e.target.value)} /></div>
          <div><Label>Address Line 2</Label><Input value={s.address_line2 || ""} onChange={e => u("address_line2", e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>City</Label><Input value={s.city || ""} onChange={e => u("city", e.target.value)} /></div>
            <div><Label>State</Label>
              <Select value={s.state || ""} onValueChange={(v) => { const st = INDIAN_STATES.find(x => x.name === v); u("state", v); u("state_code", st?.code); }}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{INDIAN_STATES.map(x => <SelectItem key={x.code} value={x.name}>{x.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Pincode</Label><Input value={s.pincode || ""} onChange={e => u("pincode", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone</Label><Input value={s.phone || ""} onChange={e => u("phone", e.target.value)} /></div>
            <div><Label>Email</Label><Input value={s.email || ""} onChange={e => u("email", e.target.value)} /></div>
          </div>
          <div><Label>Website</Label><Input value={s.website || ""} onChange={e => u("website", e.target.value)} /></div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-display font-semibold">Bank Details</h3>
            <div><Label>Bank Name</Label><Input value={s.bank_name || ""} onChange={e => u("bank_name", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>A/c Number</Label><Input value={s.bank_account || ""} onChange={e => u("bank_account", e.target.value)} /></div>
              <div><Label>IFSC</Label><Input value={s.bank_ifsc || ""} onChange={e => u("bank_ifsc", e.target.value.toUpperCase())} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Branch</Label><Input value={s.bank_branch || ""} onChange={e => u("bank_branch", e.target.value)} /></div>
              <div><Label>UPI ID</Label><Input value={s.upi_id || ""} onChange={e => u("upi_id", e.target.value)} /></div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-display font-semibold">Default Terms</h3>
            <Textarea rows={5} value={s.terms || ""} onChange={e => u("terms", e.target.value)} />
          </div>
          <Button onClick={save} disabled={busy} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">{busy ? "Saving…" : "Save Settings"}</Button>
        </div>
      </div>
    </AdminLayout>
  );
}
