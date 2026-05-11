import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtINR, fmtNum } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Items() {
  const { hasRole, canWrite } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data, error } = await supabase.from("items").select("*").order("name");
    if (error) toast.error(error.message);
    setRows(data || []);
  };
  useEffect(() => { document.title = "Items | PHD ERP"; load(); }, []);

  const del = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };
  const filtered = rows.filter(r => !q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.hsn_code || "").includes(q) || (r.barcode || "").includes(q));

  return (
    <AdminLayout title="Items (Services & Spare Parts)">
      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, HSN, barcode" className="pl-9 rounded-full" />
        </div>
        {canWrite && <Link to="/admin/items/new"><Button className="rounded-full bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-1" /> New Item</Button></Link>}
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr><th className="text-left p-3">Name</th><th className="text-left">Type</th><th className="text-left">HSN/SAC</th><th className="text-left">Barcode</th><th className="text-right">Sale</th><th className="text-right">GST%</th><th className="text-right">Stock</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((it) => {
              const low = it.type === "product" && Number(it.current_stock) <= Number(it.low_stock_threshold || 0);
              return (
                <tr key={it.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3"><Link to={`/admin/items/${it.id}`} className="font-medium hover:underline">{it.name}</Link></td>
                  <td className="capitalize">{it.type}</td>
                  <td className="font-mono text-xs">{it.hsn_code || "—"}</td>
                  <td className="font-mono text-xs">{it.barcode || "—"}</td>
                  <td className="text-right">{fmtINR(it.sale_price)}</td>
                  <td className="text-right">{it.gst_rate}%</td>
                  <td className="text-right">
                    {it.type === "product" ? (
                      <span className={low ? "text-destructive font-medium inline-flex items-center gap-1" : ""}>
                        {low && <AlertTriangle className="h-3 w-3" />}{fmtNum(it.current_stock, 3)} {it.unit}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="text-right p-3">{hasRole("admin") && <Button variant="ghost" size="icon" onClick={() => del(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No items yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
