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
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or GSTIN" className="pl-9 rounded-full" />
        </div>
        {canWrite && (
          <Link to="/admin/parties/new"><Button className="rounded-full bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-1" /> New Party</Button></Link>
        )}
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr><th className="text-left p-3">Name</th><th className="text-left">Type</th><th className="text-left">GSTIN</th><th className="text-left">Phone</th><th className="text-left">State</th><th className="text-right">Opening Bal</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3"><Link to={`/admin/parties/${p.id}`} className="font-medium hover:underline">{p.name}</Link></td>
                <td className="capitalize">{p.type}</td>
                <td className="font-mono text-xs">{p.gstin || "—"}</td>
                <td>{p.phone || "—"}</td>
                <td>{p.state || "—"}</td>
                <td className="text-right">{fmtINR(p.opening_balance)}</td>
                <td className="text-right p-3">
                  {hasRole("admin") && <Button variant="ghost" size="icon" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No parties yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
