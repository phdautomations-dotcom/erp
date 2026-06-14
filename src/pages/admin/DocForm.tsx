import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { Plus, Trash2, Download, ArrowRight, ScanLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fmtINR, calcLineTax, todayFY } from "@/lib/format";
import { generateDocPDF } from "@/lib/pdf";
import { toast } from "sonner";

interface Line {
  item_id?: string; description: string; hsn_code?: string; quantity: number;
  unit?: string; rate: number; discount_pct: number; gst_rate: number;
  taxable: number; cgst: number; sgst: number; igst: number; total: number;
}

const newLine = (): Line => ({ description: "", hsn_code: "", quantity: 1, unit: "Nos", rate: 0, discount_pct: 0, gst_rate: 18, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });

type DocType = "invoice" | "quotation" | "proforma" | "challan" | "purchase_order" | "purchase_bill";

export default function DocForm({ purchase = false }: { purchase?: boolean }) {
  const { id } = useParams();
  const [search] = useSearchParams();
  const nav = useNavigate();
  const isEdit = id && id !== "new";
  const initialType = (search.get("type") as string) || (purchase ? "purchase_bill" : "invoice");
  const [docType, setDocType] = useState<DocType>(initialType as DocType);

  const [parties, setParties] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [doc, setDoc] = useState<any>({
    doc_date: new Date().toISOString().slice(0, 10),
    is_igst: false, discount: 0, round_off: 0, status: "draft", notes: "", terms: "",
  });
  const [scanVal, setScanVal] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = isEdit ? "Edit Document | PHD ERP" : "New Document | PHD ERP";
    Promise.all([
      supabase.from("parties").select("*").order("name"),
      supabase.from("items").select("*").order("name"),
      supabase.from("company_settings").select("*").limit(1).single(),
    ]).then(([p, i, s]) => {
      setParties(p.data || []); setItems(i.data || []); setSettings(s.data || {});
    });
    if (isEdit) {
      Promise.all([
        supabase.from("documents").select("*").eq("id", id).single(),
        supabase.from("document_lines").select("*").eq("document_id", id).order("position"),
      ]).then(([{ data: d }, { data: ls }]) => {
        if (d) {
          setDoc(d);
          setDocType(d.doc_type as DocType);
        }
        if (ls && ls.length) setLines(ls as any);
      });
    }
  }, [id, isEdit]);

  // Auto IGST when party state differs from company state
  useEffect(() => {
    if (!doc.party_id) return;
    const p = parties.find(x => x.id === doc.party_id);
    if (p && settings.state_code) {
      const igst = p.state_code && p.state_code !== settings.state_code;
      setDoc((d: any) => ({ ...d, is_igst: igst }));
    }
  }, [doc.party_id, parties, settings.state_code]);

  // Recalc lines when isIgst toggles
  useEffect(() => {
    setLines(ls => ls.map(l => ({ ...l, ...calcLineTax(+l.quantity || 0, +l.rate || 0, +l.discount_pct || 0, +l.gst_rate || 0, !!doc.is_igst) })));
  }, [doc.is_igst]);

  useEffect(() => {
    if (!isEdit) {
      const fetchNextNum = async () => {
        const fy = todayFY(new Date(doc.doc_date || new Date()));
        let pfx = "";
        if (docType === "invoice") pfx = `PHD/INV/${fy}/`;
        else if (docType === "quotation") pfx = `PHD/QTN/${fy}/`;
        else if (docType === "proforma") pfx = `PHD/PRO/${fy}/`;
        else if (docType === "challan") pfx = `PHD/CHL/${fy}/`;
        else if (docType === "purchase_bill") pfx = `PHD/PB/${fy}/`;
        else if (docType === "purchase_order") pfx = `PHD/PO/${fy}/`;

        const { data: ns } = await supabase.from("number_series").select("prefix, next_number").eq("doc_type", docType as "invoice").eq("fy", fy).maybeSingle();
        let nextNum = ns?.next_number || 1;
        if (ns?.prefix) pfx = ns.prefix;

        // Auto-heal if actual documents have higher numbers (e.g. user manually bypassed the sequence)
        const { data: docs } = await supabase.from("documents").select("doc_number").ilike("doc_number", `${pfx}%`).order("created_at", { ascending: false }).limit(1000);

        if (docs && docs.length > 0) {
          let maxParsed = 0;
          for (const d of docs) {
            if (!d.doc_number) continue;
            const parts = d.doc_number.split("/");
            const parsed = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(parsed) && parsed > maxParsed) maxParsed = parsed;
          }
          if (maxParsed >= nextNum) nextNum = maxParsed + 1;
        }

        if (ns && ns.next_number !== nextNum) {
          await supabase.from("number_series").update({ next_number: nextNum }).eq("doc_type", docType as "invoice").eq("fy", fy);
        } else if (!ns) {
          await supabase.from("number_series").insert({ doc_type: docType as "invoice", fy, prefix: pfx, next_number: nextNum });
        }

        const nextNumStr = `${pfx}${String(nextNum).padStart(4, "0")}`;

        setDoc((d: any) => {
          return { ...d, doc_number: nextNumStr };
        });
      };

      fetchNextNum();
    }
  }, [isEdit, docType, doc.doc_date]);

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines(ls => {
      const next = ls.map((l, idx) => idx === i ? { ...l, ...patch } : l);
      const l = next[i];
      const taxes = calcLineTax(+l.quantity || 0, +l.rate || 0, +l.discount_pct || 0, +l.gst_rate || 0, !!doc.is_igst);
      next[i] = { ...l, ...taxes };
      return next;
    });
  };

  const pickItem = (i: number, itemId: string) => {
    const it = items.find(x => x.id === itemId);
    if (!it) return;
    updateLine(i, { item_id: itemId, description: it.name, hsn_code: it.hsn_code, unit: it.unit, rate: Number(it.sale_price), gst_rate: Number(it.gst_rate) });
  };

  // POS Barcode Scanner Logic
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = scanVal.trim();
      if (!code) return;
      const it = items.find(x => x.barcode === code || x.id === code);
      if (!it) {
        toast.error("No item found in inventory for barcode: " + code);
        setScanVal("");
        return;
      }
      setLines(ls => {
        const next = [...ls];
        const existingIdx = next.findIndex(l => l.item_id === it.id);
        if (existingIdx >= 0) {
          const newQty = Number(next[existingIdx].quantity || 0) + 1;
          const taxes = calcLineTax(newQty, next[existingIdx].rate, next[existingIdx].discount_pct, next[existingIdx].gst_rate, !!doc.is_igst);
          next[existingIdx] = { ...next[existingIdx], quantity: newQty, ...taxes };
          toast.success(`Increased qty for ${it.name} (${newQty})`);
        } else {
          let targetIdx = next.findIndex(l => !l.item_id && !l.description);
          if (targetIdx === -1) { next.push(newLine()); targetIdx = next.length - 1; }
          const patch = { item_id: it.id, description: it.name, hsn_code: it.hsn_code, unit: it.unit, rate: Number(it.sale_price), gst_rate: Number(it.gst_rate), quantity: 1 };
          const merged = { ...next[targetIdx], ...patch };
          const taxes = calcLineTax(+merged.quantity, +merged.rate, +merged.discount_pct, +merged.gst_rate, !!doc.is_igst);
          next[targetIdx] = { ...merged, ...taxes };
          toast.success(`Added ${it.name} to bill`);
        }
        return next;
      });
      setScanVal("");
    }
  };

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + ((+l.quantity || 0) * (+l.rate || 0)), 0);
    const lineDisc = lines.reduce((s, l) => s + ((+l.quantity || 0) * (+l.rate || 0) * (+l.discount_pct || 0) / 100), 0);
    const taxable = lines.reduce((s, l) => s + l.taxable, 0);
    const cgst = lines.reduce((s, l) => s + l.cgst, 0);
    const sgst = lines.reduce((s, l) => s + l.sgst, 0);
    const igst = lines.reduce((s, l) => s + l.igst, 0);
    const overallDisc = +doc.discount || 0;
    const grossTotal = taxable + cgst + sgst + igst - overallDisc;
    const rounded = Math.round(grossTotal);
    const round_off = +(rounded - grossTotal).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), lineDisc: +lineDisc.toFixed(2), taxable: +taxable.toFixed(2), cgst: +cgst.toFixed(2), sgst: +sgst.toFixed(2), igst: +igst.toFixed(2), round_off, total: rounded };
  }, [lines, doc.discount]);

  const save = async (): Promise<string | null> => {
    if (!doc.party_id) { toast.error("Pick a party"); return null; }
    if (!lines.length || lines.some(l => !l.description)) { toast.error("Add at least one line with description"); return null; }

    setBusy(true);

    const docNumber = doc.doc_number;
    if (!docNumber) { setBusy(false); toast.error("Enter a document number"); return null; }

    const { data: u } = await supabase.auth.getUser();
    const payload: any = {
      doc_type: docType, doc_number: docNumber, doc_date: doc.doc_date, due_date: doc.due_date || null,
      party_id: doc.party_id, status: doc.status || "draft", is_igst: !!doc.is_igst,
      subtotal: totals.subtotal, discount: +(doc.discount || 0) + totals.lineDisc,
      cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst, round_off: totals.round_off,
      total: totals.total, notes: doc.notes || null, terms: doc.terms || null,
      po_number: doc.po_number || null, po_date: doc.po_date || null,
      linked_doc_id: doc.linked_doc_id || null,
    };

    let docId = id as string;
    if (isEdit) {
      const { error } = await supabase.from("documents").update(payload).eq("id", id);
      if (error) { setBusy(false); toast.error(error.message); return null; }
      await supabase.from("document_lines").delete().eq("document_id", id);
    } else {
      const { data, error } = await supabase.from("documents").insert({ ...payload, created_by: u.user?.id }).select().single();
      if (error) { setBusy(false); toast.error(error.message); return null; }
      docId = data.id;
    }
    const ins = lines.map((l, i) => ({
      document_id: docId, item_id: l.item_id || null, description: l.description, hsn_code: l.hsn_code || null,
      quantity: l.quantity, unit: l.unit, rate: l.rate, discount_pct: l.discount_pct, gst_rate: l.gst_rate,
      taxable: l.taxable, cgst: l.cgst, sgst: l.sgst, igst: l.igst, total: l.total, position: i,
    }));
    const { error: le } = await supabase.from("document_lines").insert(ins);
    if (le) { setBusy(false); toast.error(le.message); return null; }

    setBusy(false);
    setDoc((d: any) => ({ ...d, doc_number: docNumber, id: docId }));
    toast.success("Saved");
    if (!isEdit) nav(`/admin/${purchase ? "purchases" : "sales"}/${docId}`, { replace: true });
    return docId;
  };

  const downloadPDF = async () => {
    const party = parties.find(p => p.id === doc.party_id);
    if (!party) return toast.error("Pick a party first");
    if (!doc.doc_number) return toast.error("Save the document first");
    await generateDocPDF(
      { ...doc, ...totals, doc_type: docType, is_igst: !!doc.is_igst } as any,
      lines as any, party, settings,
    );
  };

  const types = purchase ? ["purchase_bill", "purchase_order"] : ["invoice", "quotation", "proforma", "challan"];

  return (
    <AdminLayout title={`${docType.replace("_", " ").toUpperCase()} ${doc.doc_number ? `· ${doc.doc_number}` : ""}`}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 grid sm:grid-cols-4 gap-4">
            <div><Label>Document type</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as DocType)} disabled={!!isEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{types.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={doc.doc_date} onChange={e => setDoc({ ...doc, doc_date: e.target.value })} /></div>
            <div><Label>Document Number *</Label><Input type="text" value={doc.doc_number || ""} onChange={e => setDoc({ ...doc, doc_number: e.target.value })} placeholder="e.g., PHD/INV/2026-27/0178" /></div>
            <div><Label>Due date</Label><Input type="date" value={doc.due_date || ""} onChange={e => setDoc({ ...doc, due_date: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Party *</Label>
              <Select value={doc.party_id || ""} onValueChange={v => setDoc({ ...doc, party_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select party" /></SelectTrigger>
                <SelectContent className="max-h-72">{parties.map(p => <SelectItem key={p.id} value={p.id}>{p.name} {p.gstin ? `· ${p.gstin}` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>PO Number</Label><Input type="text" value={doc.po_number || ""} onChange={e => setDoc({ ...doc, po_number: e.target.value })} placeholder="Optional" /></div>
            <div><Label>PO Date</Label><Input type="date" value={doc.po_date || ""} onChange={e => setDoc({ ...doc, po_date: e.target.value })} /></div>
            <div className="sm:col-span-4 flex items-end gap-2">
              <div className="flex items-center gap-2"><Switch checked={!!doc.is_igst} onCheckedChange={(v) => setDoc({ ...doc, is_igst: v })} /><Label>IGST (interstate)</Label></div>
            </div>
          </div>

      {/* Smart POS Barcode Scanner */}
      <div className="flex items-center gap-3 bg-accent/5 border border-accent/20 p-4 rounded-2xl shadow-sm">
        <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
          <ScanLine className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <Label className="text-accent font-semibold mb-1 block">POS Barcode Scanner</Label>
          <Input autoFocus value={scanVal} onChange={e => setScanVal(e.target.value)} onKeyDown={handleBarcodeScan} placeholder="Aim scanner here and pull the trigger..." className="border-accent/30 focus-visible:ring-accent/50 bg-background text-lg font-mono placeholder:text-muted-foreground/50 h-12" />
        </div>
      </div>

          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left p-2">Item / Description</th><th className="text-left">HSN</th>
                  <th className="text-right">Qty</th><th className="text-right">Rate</th>
                  <th className="text-right">Disc%</th><th className="text-right">GST%</th>
                  <th className="text-right">Total</th><th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-t border-border align-top">
                    <td className="p-2 min-w-[260px]">
                      <Select value={l.item_id || ""} onValueChange={v => pickItem(i, v)}>
                        <SelectTrigger className="mb-1 h-8"><SelectValue placeholder="Pick item" /></SelectTrigger>
                        <SelectContent className="max-h-64">{items.map(it => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input value={l.description} onChange={e => updateLine(i, { description: e.target.value })} placeholder="Description" className="h-8" />
                    </td>
                    <td><Input value={l.hsn_code || ""} onChange={e => updateLine(i, { hsn_code: e.target.value })} className="h-8 w-20" /></td>
                    <td><Input type="number" step="0.001" value={l.quantity} onFocus={e => e.target.select()} onChange={e => updateLine(i, { quantity: e.target.value === "" ? 0 : +e.target.value })} className="h-8 w-20 text-right" /></td>
                    <td><Input type="number" step="0.01" value={l.rate} onFocus={e => e.target.select()} onChange={e => updateLine(i, { rate: e.target.value === "" ? 0 : +e.target.value })} className="h-8 w-24 text-right" /></td>
                    <td><Input type="number" step="0.01" value={l.discount_pct} onFocus={e => e.target.select()} onChange={e => updateLine(i, { discount_pct: e.target.value === "" ? 0 : +e.target.value })} className="h-8 w-16 text-right" /></td>
                    <td><Input type="number" step="0.01" value={l.gst_rate} onFocus={e => e.target.select()} onChange={e => updateLine(i, { gst_rate: e.target.value === "" ? 0 : +e.target.value })} className="h-8 w-16 text-right" /></td>
                    <td className="text-right pr-2 font-medium">{fmtINR(l.total)}</td>
                    <td><Button variant="ghost" size="icon" onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setLines(ls => [...ls, newLine()])}><Plus className="h-4 w-4 mr-1" /> Add Line</Button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Notes</Label><Textarea rows={3} value={doc.notes || ""} onChange={e => setDoc({ ...doc, notes: e.target.value })} /></div>
            <div><Label>Terms</Label><Textarea rows={3} value={doc.terms || ""} onChange={e => setDoc({ ...doc, terms: e.target.value })} placeholder={settings.terms} /></div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 sticky top-20">
            <h3 className="font-display font-semibold mb-3">Totals</h3>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{fmtINR(totals.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Line discount</dt><dd>-{fmtINR(totals.lineDisc)}</dd></div>
              <div className="flex justify-between items-center gap-2"><dt className="text-muted-foreground">Extra discount</dt>
                <Input type="number" step="0.01" value={doc.discount || 0} onChange={e => setDoc({ ...doc, discount: +e.target.value })} className="h-7 w-24 text-right" />
              </div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Taxable</dt><dd>{fmtINR(totals.taxable)}</dd></div>
              {doc.is_igst ? (
                <div className="flex justify-between"><dt className="text-muted-foreground">IGST</dt><dd>{fmtINR(totals.igst)}</dd></div>
              ) : (
                <>
                  <div className="flex justify-between"><dt className="text-muted-foreground">CGST</dt><dd>{fmtINR(totals.cgst)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">SGST</dt><dd>{fmtINR(totals.sgst)}</dd></div>
                </>
              )}
              <div className="flex justify-between"><dt className="text-muted-foreground">Round off</dt><dd>{fmtINR(totals.round_off)}</dd></div>
              <div className="flex justify-between pt-2 border-t border-border font-display text-lg font-semibold"><dt>Total</dt><dd>{fmtINR(totals.total)}</dd></div>
            </dl>
            <div className="mt-4 space-y-2">
              <Button onClick={save} disabled={busy} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">{busy ? "Saving…" : "Save"}</Button>
              <Button onClick={downloadPDF} variant="outline" className="w-full rounded-full"><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
            </div>
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
}
