import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { fmtINR } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Reports() {
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [docs, setDocs] = useState<any[]>([]);
  const [pays, setPays] = useState<any[]>([]);
  const [exps, setExps] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Reports | PHD ERP";
    Promise.all([
      supabase.from("documents").select("*, parties(name, gstin, state)").gte("doc_date", from).lte("doc_date", to),
      supabase.from("payments").select("*").gte("payment_date", from).lte("payment_date", to),
      supabase.from("expenses").select("*").gte("expense_date", from).lte("expense_date", to),
      supabase.from("parties").select("*"),
    ]).then(([d, p, e, pa]) => { setDocs(d.data || []); setPays(p.data || []); setExps(e.data || []); setParties(pa.data || []); });
  }, [from, to]);

  const sales = docs.filter(d => d.doc_type === "invoice");
  const purchases = docs.filter(d => d.doc_type === "purchase_bill");
  const totalSales = sales.reduce((s, d) => s + Number(d.total), 0);
  const totalPurchase = purchases.reduce((s, d) => s + Number(d.total), 0);
  const totalExp = exps.reduce((s, e) => s + Number(e.amount), 0);
  const profit = totalSales - totalPurchase - totalExp;
  const outputGst = sales.reduce((s, d) => s + Number(d.cgst) + Number(d.sgst) + Number(d.igst), 0);
  const inputGst = purchases.reduce((s, d) => s + Number(d.cgst) + Number(d.sgst) + Number(d.igst), 0);

  const aging = (() => {
    const now = new Date();
    const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    sales.forEach(d => {
      const due = Number(d.total) - Number(d.paid);
      if (due <= 0) return;
      const days = Math.floor((now.getTime() - new Date(d.doc_date).getTime()) / 86400000);
      if (days <= 30) buckets["0-30"] += due;
      else if (days <= 60) buckets["31-60"] += due;
      else if (days <= 90) buckets["61-90"] += due;
      else buckets["90+"] += due;
    });
    return buckets;
  })();

  return (
    <AdminLayout title="Reports">
      <div className="flex flex-wrap gap-3 mb-5">
        <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
      </div>

      <Tabs defaultValue="pl">
        <TabsList>
          <TabsTrigger value="pl">P&L</TabsTrigger>
          <TabsTrigger value="gst">GST Summary</TabsTrigger>
          <TabsTrigger value="sales">Sales Register</TabsTrigger>
          <TabsTrigger value="purchase">Purchase Register</TabsTrigger>
          <TabsTrigger value="aging">Aging</TabsTrigger>
        </TabsList>

        <TabsContent value="pl">
          <div className="rounded-2xl border border-border bg-card p-6 max-w-md mt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Sales</span><span>{fmtINR(totalSales)}</span></div>
              <div className="flex justify-between"><span>Purchases</span><span>-{fmtINR(totalPurchase)}</span></div>
              <div className="flex justify-between"><span>Expenses</span><span>-{fmtINR(totalExp)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold text-lg"><span>Net Profit</span><span className={profit >= 0 ? "text-foreground" : "text-destructive"}>{fmtINR(profit)}</span></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gst">
          <div className="rounded-2xl border border-border bg-card p-6 max-w-md mt-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Output GST (Sales)</span><span>{fmtINR(outputGst)}</span></div>
              <div className="flex justify-between"><span>Input GST (Purchases)</span><span>-{fmtINR(inputGst)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Net GST Payable</span><span>{fmtINR(outputGst - inputGst)}</span></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sales">
          <div className="rounded-2xl border border-border bg-card overflow-x-auto mt-4">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/40 text-xs"><tr><th className="text-left p-2">Date</th><th className="text-left">Number</th><th className="text-left">Party</th><th className="text-left">GSTIN</th><th className="text-right">Taxable</th><th className="text-right">GST</th><th className="text-right">Total</th></tr></thead>
              <tbody>{sales.map(d => <tr key={d.id} className="border-t border-border"><td className="p-2">{d.doc_date}</td><td className="font-mono text-xs">{d.doc_number}</td><td>{(d.parties as any)?.name}</td><td className="font-mono text-xs">{(d.parties as any)?.gstin}</td><td className="text-right">{fmtINR(d.subtotal - d.discount)}</td><td className="text-right">{fmtINR(Number(d.cgst) + Number(d.sgst) + Number(d.igst))}</td><td className="text-right">{fmtINR(d.total)}</td></tr>)}</tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="purchase">
          <div className="rounded-2xl border border-border bg-card overflow-x-auto mt-4">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/40 text-xs"><tr><th className="text-left p-2">Date</th><th className="text-left">Number</th><th className="text-left">Vendor</th><th className="text-right">Total</th></tr></thead>
              <tbody>{purchases.map(d => <tr key={d.id} className="border-t border-border"><td className="p-2">{d.doc_date}</td><td className="font-mono text-xs">{d.doc_number}</td><td>{(d.parties as any)?.name}</td><td className="text-right">{fmtINR(d.total)}</td></tr>)}</tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="aging">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {Object.entries(aging).map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-border bg-card p-5"><div className="text-xs text-muted-foreground">{k} days</div><div className="font-display text-xl font-semibold mt-1">{fmtINR(v)}</div></div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
