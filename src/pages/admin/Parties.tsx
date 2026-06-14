import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtINR } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Parties() {
  const { hasRole, canWrite } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data, error } = await supabase.from("parties").select("*").order("name");
    if (error) toast.error(error.message);
    setRows(data || []);
  };
  useEffect(() => { document.title = "Parties | PHD ERP"; load(); }, []);

  const del = async (id: string) => {
    if (!confirm("Delete this party?")) return;
    const { error } = await supabase.from("parties").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const filtered = rows.filter(r => !q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.gstin || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <AdminLayout title="Parties (Customers & Vendors)">
      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or GSTIN" className="pl-9 rounded-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm" />
        </div>
        {canWrite && (
          <Link to="/admin/parties/new"><Button className="rounded-full bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-1" /> New Party</Button></Link>
        )}
      </div>
    <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
            <tr><th className="px-6 py-4 text-left">Name</th><th className="px-6 py-4 text-left">Type</th><th className="px-6 py-4 text-left">GSTIN</th><th className="px-6 py-4 text-left">Phone</th><th className="px-6 py-4 text-left">State</th><th className="px-6 py-4 text-right">Opening Bal</th><th className="px-6 py-4"></th></tr>
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
                <td className="px-6 py-4 text-muted-foreground">{p.state || "—"}</td>
                <td className="px-6 py-4 text-right font-semibold">{fmtINR(p.opening_balance)}</td>
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
