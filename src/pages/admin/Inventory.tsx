import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmtNum } from "@/lib/format";
import { toast } from "sonner";
import { Plus, AlertTriangle } from "lucide-react";

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [moves, setMoves] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ movement: "in", quantity: 0 });

  const load = () => {
    supabase.from("items").select("*").eq("type", "product").order("name").then(({ data }) => setItems(data || []));
    supabase.from("stock_ledger").select("*, items(name, unit)").order("created_at", { ascending: false }).limit(100).then(({ data }) => setMoves(data || []));
  };
  useEffect(() => { document.title = "Inventory | PHD ERP"; load(); }, []);

  const adjust = async () => {
    if (!form.item_id || !form.quantity) return toast.error("Item and quantity required");
    const it = items.find(x => x.id === form.item_id);
    if (!it) return;
    await supabase.from("stock_ledger").insert({ item_id: form.item_id, movement: form.movement, quantity: +form.quantity, notes: form.notes });
    let newStock = Number(it.current_stock);
    if (form.movement === "in") newStock += +form.quantity;
    else if (form.movement === "out") newStock -= +form.quantity;
    else newStock = +form.quantity;
    await supabase.from("items").update({ current_stock: newStock }).eq("id", form.item_id);
    toast.success("Stock updated"); setOpen(false); setForm({ movement: "in", quantity: 0 }); load();
  };

  return (
    <AdminLayout title="Inventory">
      <div className="flex justify-between items-center mb-5">
        <p className="text-sm text-muted-foreground">{items.length} products tracked</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-full bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-1" /> Stock Adjustment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Stock Adjustment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Item</Label>
                <Select value={form.item_id || ""} onValueChange={v => setForm({ ...form, item_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                  <SelectContent className="max-h-72">{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Movement</Label>
                  <Select value={form.movement} onValueChange={v => setForm({ ...form, movement: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="in">In</SelectItem><SelectItem value="out">Out</SelectItem><SelectItem value="adjust">Set to</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Quantity</Label><Input type="number" step="0.001" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Input value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={adjust} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <div className="p-3 border-b border-border font-display text-sm font-semibold">Stock Levels</div>
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="text-left p-2">Item</th><th className="text-right">Current</th><th className="text-right">Threshold</th></tr></thead>
            <tbody>
              {items.map(it => {
                const low = Number(it.current_stock) <= Number(it.low_stock_threshold || 0);
                return <tr key={it.id} className="border-t border-border"><td className="p-2">{it.name}</td>
                  <td className={`text-right ${low ? "text-destructive font-medium" : ""}`}>{low && <AlertTriangle className="h-3 w-3 inline mr-1" />}{fmtNum(it.current_stock, 3)} {it.unit}</td>
                  <td className="text-right text-muted-foreground">{fmtNum(it.low_stock_threshold, 3)}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <div className="p-3 border-b border-border font-display text-sm font-semibold">Recent Movements</div>
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="text-left p-2">Date</th><th className="text-left">Item</th><th className="text-left">Type</th><th className="text-right">Qty</th></tr></thead>
            <tbody>
              {moves.map(m => <tr key={m.id} className="border-t border-border"><td className="p-2">{new Date(m.created_at).toLocaleDateString()}</td><td>{(m.items as any)?.name}</td><td className="capitalize">{m.movement}</td><td className="text-right">{fmtNum(m.quantity, 3)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
