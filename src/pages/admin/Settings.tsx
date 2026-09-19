import { useEffect, useState } from "react";
import { PanelLeft, LayoutGrid } from "@/lib/icons";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INDIAN_STATES } from "@/lib/states";
import { toast } from "sonner";
import { useNavStyle, setNavStyle, NavStyle } from "@/hooks/useNavStyle";
import { useUITheme, setUITheme, UITheme } from "@/lib/uiTheme";
import { cn } from "@/lib/utils";

// Tiny fixed-colour mock-ups of each design. They use literal colours (not
// theme tokens) so each one always shows *its own* look, whichever theme is active.
function ThemePreview({ kind }: { kind: UITheme }) {
  if (kind === "ios") {
    return (
      <div
        className="relative h-20 w-full overflow-hidden rounded-xl p-2"
        style={{ background: "radial-gradient(60% 80% at 10% 0%, #9CC8FF, transparent 70%), radial-gradient(60% 80% at 100% 100%, #D9B8FF, transparent 70%), #EEF1F8" }}
      >
        <div className="flex items-center gap-1.5 rounded-full px-1.5 py-1" style={{ background: "rgba(255,255,255,0.7)", boxShadow: "inset 0 1px 0 #fff, 0 2px 8px rgba(30,50,110,0.12)" }}>
          <div className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "linear-gradient(160deg,#5AC8FA,#007AFF)" }} />
          <div className="h-2 flex-1 rounded-full" style={{ background: "rgba(0,0,0,0.07)" }} />
        </div>
        <div className="mt-1.5 flex gap-1.5">
          <div className="w-6 space-y-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.65)", boxShadow: "inset 0 1px 0 #fff" }}>
            <div className="h-2 rounded-full" style={{ background: "rgba(0,122,255,0.25)" }} />
            <div className="h-2 rounded-full" style={{ background: "rgba(0,0,0,0.07)" }} />
          </div>
          <div className="flex-1 rounded-xl p-1.5" style={{ background: "rgba(255,255,255,0.65)", boxShadow: "inset 0 1px 0 #fff, 0 2px 8px rgba(30,50,110,0.1)" }}>
            <div className="h-1.5 w-8 rounded-full" style={{ background: "rgba(0,0,0,0.12)" }} />
            <div className="mt-1.5 h-3 w-10 rounded-full" style={{ background: "#007AFF" }} />
          </div>
        </div>
      </div>
    );
  }
  if (kind === "material") {
    return (
      <div className="h-20 w-full overflow-hidden rounded-xl p-2" style={{ background: "#F6F2F7" }}>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#4D44E3" }} />
          <div className="h-3 flex-1 rounded-full" style={{ background: "#EBE7EC" }} />
          <div className="h-3 w-3 rounded-full" style={{ background: "#E2DFFF" }} />
        </div>
        <div className="mt-1.5 flex gap-1.5">
          <div className="w-6 space-y-1">
            <div className="h-2.5 rounded-full" style={{ background: "#E3E0F9" }} />
            <div className="h-2.5 rounded-full" style={{ background: "#EBE7EC" }} />
          </div>
          <div className="flex-1 rounded-lg bg-white p-1.5 shadow-sm">
            <div className="h-1.5 w-8 rounded-full" style={{ background: "#C8C5D0" }} />
            <div className="mt-1.5 flex gap-1">
              <div className="h-3 w-9 rounded-full" style={{ background: "#4D44E3" }} />
              <div className="h-3 w-7 rounded-full" style={{ background: "#E3E0F9" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="h-20 w-full overflow-hidden rounded-xl p-2" style={{ background: "#F8F8FC" }}>
      <div className="flex items-center gap-1.5 rounded-md bg-white px-1.5 py-1 shadow-sm">
        <div className="h-2 w-2 rounded" style={{ background: "linear-gradient(135deg,#8B5CF6,#4F46E5)" }} />
        <div className="h-2 flex-1 rounded-full" style={{ background: "#F0F0F6" }} />
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <div className="w-6 space-y-1 rounded-md bg-white p-1 shadow-sm">
          <div className="h-2 rounded" style={{ background: "linear-gradient(135deg,#8B5CF6,#4F46E5)" }} />
          <div className="h-2 rounded" style={{ background: "#F0F0F6" }} />
        </div>
        <div className="flex-1 rounded-md bg-white p-1.5 shadow-sm">
          <div className="h-1.5 w-8 rounded-full" style={{ background: "#E2E2EC" }} />
          <div className="mt-1.5 h-3 w-10 rounded-md" style={{ background: "linear-gradient(135deg,#8B5CF6,#4F46E5)" }} />
        </div>
      </div>
    </div>
  );
}

function AppearanceCard() {
  const navStyle = useNavStyle();
  const uiTheme = useUITheme();
  const designs: { value: UITheme; label: string; desc: string }[] = [
    { value: "material", label: "Material", desc: "Google Material 3" },
    { value: "minimal", label: "Minimal", desc: "Flat, clean & indigo" },
    { value: "ios", label: "iOS", desc: "Liquid Glass" },
  ];
  const navOptions: { value: NavStyle; label: string; desc: string; icon: typeof PanelLeft }[] = [
    { value: "sidebar", label: "Sidebar", desc: "Persistent left navigation bar", icon: PanelLeft },
    { value: "tiles", label: "Tiles", desc: "Module tiles as the home page", icon: LayoutGrid },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
      <div>
        <h3 className="font-display font-semibold">Appearance</h3>
        <p className="text-sm text-muted-foreground mt-1">Personal preferences — saved in this browser only.</p>
      </div>

      <div className="space-y-2.5">
        <Label>Design</Label>
        <div className="grid grid-cols-3 gap-2.5">
          {designs.map(d => (
            <button
              key={d.value}
              onClick={() => setUITheme(d.value)}
              aria-pressed={uiTheme === d.value}
              className={cn(
                "flex flex-col gap-2.5 rounded-xl border p-2.5 text-left transition-colors",
                uiTheme === d.value ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:bg-muted/50",
              )}
            >
              <ThemePreview kind={d.value} />
              <div>
                <p className="text-sm font-semibold text-foreground">{d.label}</p>
                <p className="text-xs text-muted-foreground">{d.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <Label>Navigation</Label>
        <div className="grid grid-cols-2 gap-3">
          {navOptions.map(o => (
            <button
              key={o.value}
              onClick={() => setNavStyle(o.value)}
              aria-pressed={navStyle === o.value}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
                navStyle === o.value ? "border-accent bg-accent/5" : "border-border hover:bg-muted/50",
              )}
            >
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", navStyle === o.value ? "bg-accent text-white" : "bg-muted text-muted-foreground")}>
                <o.icon className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{o.label}</p>
                <p className="text-xs text-muted-foreground">{o.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const [s, setS] = useState<any>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Settings | ASTA One";
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
          <AppearanceCard />
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
          <Button onClick={save} disabled={busy} className="w-full rounded-full btn-gradient">{busy ? "Saving…" : "Save Settings"}</Button>
        </div>
      </div>
    </AdminLayout>
  );
}
