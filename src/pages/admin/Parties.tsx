import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtINR } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import { toast } from "sonner";

export default function Parties() {
  const { hasRole, canWrite } = useAuth();
  const confirm = useConfirm();
  const [rows, setRows] = useState<any[]>([]);
  // Kept as two separate figures on purpose — netting "what they owe us"
  // against "what we owe them" into one number is exactly what confused
  // things before. Receivable = unpaid invoices; Payable = unpaid purchase
  // bills. Quotations/proformas/POs never carry real debt, and a challan is
  // just a delivery record (payment is only ever collected against the invoice).
  const [receivable, setReceivable] = useState<Record<string, number>>({});
  const [payable, setPayable] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");

  const load = async () => {
    const [{ data, error }, { data: invoices }, { data: bills }] = await Promise.all([
      supabase.from("parties").select("*").order("name"),
      supabase.from("documents").select("party_id,total,paid").eq("doc_type", "invoice").neq("status", "cancelled"),
      supabase.from("documents").select("party_id,total,paid").eq("doc_type", "purchase_bill").neq("status", "cancelled"),
    ]);
    if (error) toast.error(error.message);
    const rec: Record<string, number> = {};
    const pay: Record<string, number> = {};
    // opening_balance seeds whichever side it belongs to: positive = they
    // owe us, negative = we owe them.
    (data || []).forEach((p: any) => {
      const ob = Number(p.opening_balance || 0);
      if (ob > 0.01) rec[p.id] = ob;
      else if (ob < -0.01) pay[p.id] = -ob;
    });
    (invoices || []).forEach((d: any) => {
      const amt = Number(d.total) - Number(d.paid || 0);
      if (amt <= 0.01) return;
      rec[d.party_id] = (rec[d.party_id] || 0) + amt;
    });
    (bills || []).forEach((d: any) => {
      const amt = Number(d.total) - Number(d.paid || 0);
      if (amt <= 0.01) return;
      pay[d.party_id] = (pay[d.party_id] || 0) + amt;
    });
    setReceivable(rec);
    setPayable(pay);
    setRows(data || []);
  };
  useEffect(() => { document.title = "Parties | ASTA One"; load(); }, []);

  const del = async (id: string) => {
    if (!(await confirm("Delete this party?"))) return;
    const { error } = await supabase.from("parties").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const states = Array.from(new Set(rows.map(r => r.state).filter(Boolean))).sort();

  const filtered = rows.filter(r => {
    if (q && !r.name.toLowerCase().includes(q.toLowerCase()) && !(r.gstin || "").toLowerCase().includes(q.toLowerCase())) return false;
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (stateFilter !== "all" && r.state !== stateFilter) return false;
    return true;
  });

  return (
    <AdminLayout title="Parties (Customers & Vendors)">
      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or GSTIN" className="pl-9 rounded-full border-border/50 bg-muted/40 shadow-sm" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 rounded-full border-border/50 bg-muted/40 shadow-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
          {states.length > 0 && (
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-40 rounded-full border-border/50 bg-muted/40 shadow-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">All States</SelectItem>
                {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        {canWrite && (
          <Link to="/admin/parties/new"><Button className="rounded-full btn-gradient"><Plus className="h-4 w-4 mr-1" /> New Party</Button></Link>
        )}
      </div>
    {/* Mobile: stacked cards — no horizontal scrolling */}
    <div className="md:hidden space-y-3">
      {filtered.map((p) => (
        <div key={p.id} className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/admin/parties/${p.id}`} className="font-medium transition-colors hover:text-accent truncate block">{p.name}</Link>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize mt-1 ${p.type === 'customer' ? 'bg-blue-500/10 text-blue-600' : p.type === 'vendor' ? 'bg-purple-500/10 text-purple-600' : 'bg-muted text-muted-foreground'}`}>{p.type}</span>
            </div>
            <div className="text-right shrink-0 space-y-0.5">
              {(receivable[p.id] || 0) > 0.01 && (
                <p className="text-sm font-semibold text-destructive">{fmtINR(receivable[p.id])} <span className="text-[10px] font-normal text-muted-foreground">to receive</span></p>
              )}
              {(payable[p.id] || 0) > 0.01 && (
                <p className="text-sm font-semibold text-amber-600">{fmtINR(payable[p.id])} <span className="text-[10px] font-normal text-muted-foreground">to pay</span></p>
              )}
              {(receivable[p.id] || 0) <= 0.01 && (payable[p.id] || 0) <= 0.01 && (
                <p className="text-xs text-muted-foreground">Settled</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-muted-foreground">
              <span>{p.phone || "—"}</span>{p.state && <span> · {p.state}</span>}
              {p.gstin && <div className="font-mono mt-0.5">{p.gstin}</div>}
            </div>
            {hasRole("admin") && <Button variant="ghost" size="icon" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
          </div>
        </div>
      ))}
      {filtered.length === 0 && <p className="p-12 text-center text-muted-foreground font-medium">No parties found.</p>}
    </div>

    <div className="hidden md:block overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
            <tr><th className="px-6 py-4 text-left">Name</th><th className="px-6 py-4 text-left">Type</th><th className="px-6 py-4 text-left">GSTIN</th><th className="px-6 py-4 text-left">Phone</th><th className="px-6 py-4 text-right">To Receive</th><th className="px-6 py-4 text-right">To Pay</th><th className="px-6 py-4"></th></tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-muted/30">
                <td className="px-6 py-4"><Link to={`/admin/parties/${p.id}`} className="font-medium transition-colors hover:text-accent">{p.name}</Link></td>
                <td className="px-6 py-4 capitalize">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${p.type === 'customer' ? 'bg-blue-500/10 text-blue-600' : p.type === 'vendor' ? 'bg-purple-500/10 text-purple-600' : 'bg-muted text-muted-foreground'}`}>{p.type}</span>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{p.gstin || "—"}</td>
                <td className="px-6 py-4 text-muted-foreground">{p.phone || "—"}</td>
                <td className="px-6 py-4 text-right font-semibold text-destructive">{(receivable[p.id] || 0) > 0.01 ? fmtINR(receivable[p.id]) : "—"}</td>
                <td className="px-6 py-4 text-right font-semibold text-amber-600">{(payable[p.id] || 0) > 0.01 ? fmtINR(payable[p.id]) : "—"}</td>
                <td className="px-6 py-4 text-right">
                  {hasRole("admin") && <Button variant="ghost" size="icon" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-muted-foreground font-medium">No parties found.</td></tr>}
          </tbody>
        </table>
      </div>
      </div>
    </AdminLayout>
  );
}
