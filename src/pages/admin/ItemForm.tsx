import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { z } from "zod";
// @ts-ignore - bwip-js browser bundle
import bwipjs from "bwip-js/browser";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const itemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.enum(["service", "product"]),
  description: z.string().max(1000).optional().nullable(),
  hsn_code: z.string().max(20).optional().nullable(),
  barcode: z.string().max(60).optional().nullable(),
  unit: z.string().max(20).default("Nos"),
  sale_price: z.coerce.number().min(0),
  purchase_price: z.coerce.number().min(0),
  gst_rate: z.coerce.number().min(0).max(50),
  opening_stock: z.coerce.number().min(0).default(0),
  low_stock_threshold: z.coerce.number().min(0).default(0),
});

const genBarcode = () => "PHD" + Date.now().toString().slice(-9);

export default function ItemForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const isEdit = id && id !== "new";
  const [form, setForm] = useState<any>({ type: "product", unit: "Nos", gst_rate: 18, sale_price: 0, purchase_price: 0, opening_stock: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [printQty, setPrintQty] = useState(1);

  useEffect(() => {
    document.title = isEdit ? "Edit Item | PHD ERP" : "New Item | PHD ERP";
    if (isEdit) supabase.from("items").select("*").eq("id", id).single().then(({ data }) => data && setForm(data));
  }, [id, isEdit]);

  useEffect(() => {
    if (form.barcode && canvasRef.current) {
      try { bwipjs.toCanvas(canvasRef.current, { bcid: "code128", text: form.barcode, scale: 2, height: 12, includetext: true, textxalign: "center" }); } catch {}
    }
  }, [form.barcode]);

  const save = async () => {
    const parsed = itemSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setBusy(true);
    const payload: any = { ...parsed.data };
    if (!isEdit) payload.current_stock = payload.opening_stock;
    const { data: u } = await supabase.auth.getUser();
    if (isEdit) {
      const { error } = await supabase.from("items").update(payload).eq("id", id);
      setBusy(false);
      if (error) return toast.error(error.message); toast.success("Saved");
    } else {
      const { data, error } = await supabase.from("items").insert({ ...payload, created_by: u.user?.id }).select().single();
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Created"); nav(`/admin/items/${data.id}`);
    }
  };

  const u = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const printLabel = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL();
    const w = window.open(""); if (!w) return;
    
    let html = `<html><head><title>Print Barcode Labels</title>
    <style>
      /* Standard Thermal Label Size 50mm x 25mm */
      @page { size: 50mm 25mm; margin: 0; }
      body { margin: 0; padding: 0; font-family: sans-serif; background: #fff; }
      .label {
        width: 50mm; height: 25mm;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        page-break-after: always; box-sizing: border-box; padding: 2mm; overflow: hidden;
      }
      .title { font-size: 10px; font-weight: bold; margin: 0 0 2px 0; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
      .barcode-img { max-width: 100%; max-height: 14mm; display: block; }
    </style>
    </head><body>`;

    for (let i = 0; i < printQty; i++) {
      html += `
        <div class="label">
          <p class="title">${form.name}</p>
          <img class="barcode-img" src="${dataUrl}"/>
        </div>`;
    }

    html += `</body></html>`;
    w.document.write(html);
    w.document.close(); w.focus(); 
    setTimeout(() => { w.print(); }, 250);
  };

  return (
    <AdminLayout title={isEdit ? `Item · ${form.name || ""}` : "New Item"}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Name *</Label><Input value={form.name || ""} onChange={(e) => u("name", e.target.value)} /></div>
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => u("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="product">Product / Spare Part</SelectItem><SelectItem value="service">Service</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>HSN / SAC Code</Label><Input value={form.hsn_code || ""} onChange={(e) => u("hsn_code", e.target.value)} /></div>
            <div><Label>Unit</Label><Input value={form.unit || ""} onChange={(e) => u("unit", e.target.value)} placeholder="Nos, Set, Hr…" /></div>
            <div><Label>Sale Price (₹) *</Label><Input type="number" step="0.01" value={form.sale_price ?? 0} onChange={(e) => u("sale_price", e.target.value)} /></div>
            <div><Label>Purchase Price (₹)</Label><Input type="number" step="0.01" value={form.purchase_price ?? 0} onChange={(e) => u("purchase_price", e.target.value)} /></div>
            <div><Label>GST Rate (%)</Label>
              <Select value={String(form.gst_rate ?? 18)} onValueChange={(v) => u("gst_rate", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[0, 5, 12, 18, 28].map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.type === "product" && (
              <>
                <div><Label>Opening Stock</Label><Input type="number" step="0.001" value={form.opening_stock ?? 0} onChange={(e) => u("opening_stock", e.target.value)} disabled={!!isEdit} /></div>
                <div><Label>Low-Stock Threshold</Label><Input type="number" step="0.001" value={form.low_stock_threshold ?? 0} onChange={(e) => u("low_stock_threshold", e.target.value)} /></div>
              </>
            )}
          </div>
          <div><Label>Description</Label><Textarea rows={2} value={form.description || ""} onChange={(e) => u("description", e.target.value)} /></div>
          <div className="flex gap-3 pt-2">
            <Button onClick={save} disabled={busy} className="rounded-full bg-foreground text-background hover:bg-foreground/90">{busy ? "Saving…" : "Save"}</Button>
            <Link to="/admin/items"><Button variant="outline" className="rounded-full">Cancel</Button></Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display font-semibold mb-3">Barcode</h3>
          <div className="flex gap-2 mb-3">
            <Input value={form.barcode || ""} onChange={(e) => u("barcode", e.target.value)} placeholder="Auto / scan" />
            <Button variant="outline" onClick={() => u("barcode", genBarcode())}>Generate</Button>
          </div>
          {form.barcode && (
            <>
              <div className="bg-white p-4 rounded-xl border border-border flex items-center justify-center">
                <canvas ref={canvasRef} />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Input type="number" min="1" max="500" value={printQty} onChange={e => setPrintQty(Number(e.target.value) || 1)} className="w-20" placeholder="Qty" />
                <Button variant="outline" className="flex-1" onClick={printLabel}>Print {printQty} Labels</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
