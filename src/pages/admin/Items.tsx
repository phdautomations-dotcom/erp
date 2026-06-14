import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Plus, Search, Trash2, AlertTriangle, ScanLine, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtINR, fmtNum } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Items() {
  const { hasRole, canWrite } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

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
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, HSN, barcode" className="pl-9 rounded-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm" />
          <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground" onClick={() => setScanOpen(true)}>
            <ScanLine className="h-4 w-4" />
          </Button>
        </div>
        {canWrite && <Link to="/admin/items/new"><Button className="rounded-full bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-1" /> New Item</Button></Link>}
      </div>
    <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
            <tr><th className="px-6 py-4 text-left">Name</th><th className="px-6 py-4 text-left">Type</th><th className="px-6 py-4 text-left">HSN/SAC</th><th className="px-6 py-4 text-left">Barcode</th><th className="px-6 py-4 text-right">Sale</th><th className="px-6 py-4 text-right">GST%</th><th className="px-6 py-4 text-right">Stock</th><th className="px-6 py-4"></th></tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.map((it) => {
              const low = it.type === "product" && Number(it.current_stock) <= Number(it.low_stock_threshold || 0);
              return (
                <tr key={it.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-6 py-4"><Link to={`/admin/items/${it.id}`} className="font-medium transition-colors hover:text-accent">{it.name}</Link></td>
                  <td className="px-6 py-4 capitalize">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${it.type === 'service' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-emerald-500/10 text-emerald-600'}`}>{it.type}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{it.hsn_code || "—"}</td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{it.barcode || "—"}</td>
                  <td className="px-6 py-4 text-right font-semibold">{fmtINR(it.sale_price)}</td>
                  <td className="px-6 py-4 text-right text-muted-foreground">{it.gst_rate}%</td>
                  <td className="px-6 py-4 text-right">
                    {it.type === "product" ? (
                      <span className={`inline-flex items-center gap-1.5 ${low ? "text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded-full text-xs" : ""}`}>
                        {low && <AlertTriangle className="h-3.5 w-3.5" />}{fmtNum(it.current_stock, 3)} {it.unit}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">{hasRole("admin") && <Button variant="ghost" size="icon" onClick={() => del(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={8} className="p-12 text-center font-medium text-muted-foreground">No items found.</td></tr>}
          </tbody>
        </table>
      </div>
      </div>
      
      <Dialog open={scanOpen} onOpenChange={(open) => { setScanOpen(open); if(!open) setTimeout(() => searchRef.current?.focus(), 100); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Smart Barcode Scanner</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-5 text-center">
            <div className="relative h-48 w-48 border-2 border-dashed border-accent/50 rounded-3xl flex items-center justify-center bg-accent/5 overflow-hidden">
               <motion.div animate={{ y: [0, 192, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute top-0 left-0 w-full h-0.5 bg-accent shadow-[0_0_8px_2px_rgba(var(--accent),0.8)] z-10" />
               <QrCode className="h-16 w-16 text-muted-foreground/30" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Scan item barcode or QR</p>
              <p className="text-xs text-muted-foreground">Aim your hardware scanner and pull the trigger.</p>
            </div>
            <Input autoFocus value={q} onChange={(e) => { setQ(e.target.value); if(e.target.value.length > 4) setScanOpen(false); }} placeholder="Waiting for input..." className="text-center font-mono h-12 text-lg bg-muted/30" />
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
