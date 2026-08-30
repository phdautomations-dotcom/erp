import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search, Trash2, AlertTriangle, ScanLine, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtINR, fmtNum } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import { toast } from "sonner";

export default function Items() {
  const { hasRole, canWrite } = useAuth();
  const confirm = useConfirm();
  const [search] = useSearchParams();
  // Drill-down from the Dashboard's "Low stock items" tile.
  const lowOnly = search.get("low") === "1";
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data, error } = await supabase.from("items").select("*").order("name");
    if (error) toast.error(error.message);
    setRows(data || []);
  };
  useEffect(() => { document.title = "Items | ASTA One"; load(); }, []);

  const del = async (id: string) => {
    if (!(await confirm("Delete this item?"))) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };
  const isLow = (r: any) => r.type === "product" && Number(r.current_stock) <= Number(r.low_stock_threshold || 0);
  const filtered = rows
    .filter(r => !q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.hsn_code || "").includes(q) || (r.barcode || "").includes(q))
    .filter(r => !lowOnly || isLow(r));

  return (
    <AdminLayout title="Items (Services & Spare Parts)">
      {lowOnly && (
        <div className="flex items-center justify-between gap-3 mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-2.5">
          <span className="text-sm font-medium text-destructive">Showing only low-stock items — from the Dashboard tile.</span>
          <Link to="/admin/items" className="text-xs font-semibold text-destructive underline underline-offset-2 shrink-0">Clear filter</Link>
        </div>
      )}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, HSN, barcode" className="pl-9 rounded-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm" />
          <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground" onClick={() => setScanOpen(true)}>
            <ScanLine className="h-4 w-4" />
          </Button>
        </div>
        {canWrite && <Link to="/admin/items/new"><Button className="rounded-full btn-gradient"><Plus className="h-4 w-4 mr-1" /> New Item</Button></Link>}
      </div>
    {/* Mobile: stacked cards — no horizontal scrolling */}
    <div className="md:hidden space-y-3">
      {filtered.map((it) => {
        const low = isLow(it);
        return (
          <div key={it.id} className="rounded-2xl border border-border/50 bg-card/50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link to={`/admin/items/${it.id}`} className="font-medium transition-colors hover:text-accent truncate block">{it.name}</Link>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize mt-1 ${it.type === 'service' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-emerald-500/10 text-emerald-600'}`}>{it.type}</span>
              </div>
              <p className="font-semibold shrink-0">{fmtINR(it.sale_price)}</p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-muted-foreground space-x-2">
                <span>HSN: {it.hsn_code || "—"}</span>
                <span>GST: {it.gst_rate}%</span>
                {it.type === "product" && (
                  <span className={low ? "text-destructive font-medium" : ""}>
                    {low && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}Stock: {fmtNum(it.current_stock, 3)} {it.unit}
                  </span>
                )}
              </div>
              {hasRole("admin") && <Button variant="ghost" size="icon" onClick={() => del(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            </div>
          </div>
        );
      })}
      {filtered.length === 0 && <p className="p-12 text-center font-medium text-muted-foreground">No items found.</p>}
    </div>

    <div className="hidden md:block overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
            <tr><th className="px-6 py-4 text-left">Name</th><th className="px-6 py-4 text-left">Type</th><th className="px-6 py-4 text-left">HSN/SAC</th><th className="px-6 py-4 text-left">Barcode</th><th className="px-6 py-4 text-right">Sale</th><th className="px-6 py-4 text-right">GST%</th><th className="px-6 py-4 text-right">Stock</th><th className="px-6 py-4"></th></tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.map((it) => {
              const low = isLow(it);
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
