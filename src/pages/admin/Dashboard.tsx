import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { fmtINR } from "@/lib/format";
import { Wallet, FileText, AlertTriangle, Inbox } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    receivable: 0, payable: 0, monthSales: 0, monthPurchase: 0,
    lowStock: 0, newLeads: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Dashboard | PHD ERP";
    (async () => {
      const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);
      const { data: docs } = await supabase.from("documents")
        .select("doc_type, total, paid, doc_date").order("doc_date", { ascending: false });
      const { data: items } = await supabase.from("items").select("current_stock, low_stock_threshold");
      const { data: leads } = await supabase.from("leads").select("id,status").eq("status", "new");

      const receivable = (docs || []).filter(d => d.doc_type === "invoice").reduce((s, d) => s + Number(d.total) - Number(d.paid), 0);
      const payable = (docs || []).filter(d => d.doc_type === "purchase_bill").reduce((s, d) => s + Number(d.total) - Number(d.paid), 0);
      const monthSales = (docs || []).filter(d => d.doc_type === "invoice" && new Date(d.doc_date) >= startMonth).reduce((s, d) => s + Number(d.total), 0);
      const monthPurchase = (docs || []).filter(d => d.doc_type === "purchase_bill" && new Date(d.doc_date) >= startMonth).reduce((s, d) => s + Number(d.total), 0);
      const lowStock = (items || []).filter(i => Number(i.current_stock) <= Number(i.low_stock_threshold || 0)).length;

      setStats({ receivable, payable, monthSales, monthPurchase, lowStock, newLeads: leads?.length || 0 });

      const { data: rec } = await supabase.from("documents")
        .select("id, doc_type, doc_number, doc_date, total, party_id, parties(name)")
        .order("created_at", { ascending: false }).limit(8);
      setRecent(rec || []);
    })();
  }, []);

  const cards = [
    { label: "Receivable", value: fmtINR(stats.receivable), icon: Wallet, accent: true },
    { label: "Payable", value: fmtINR(stats.payable), icon: Wallet },
    { label: "This month sales", value: fmtINR(stats.monthSales), icon: FileText },
    { label: "This month purchase", value: fmtINR(stats.monthPurchase), icon: FileText },
    { label: "Low stock items", value: stats.lowStock.toString(), icon: AlertTriangle },
    { label: "New leads", value: stats.newLeads.toString(), icon: Inbox },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-soft hover-lift"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.accent ? "text-accent" : "text-muted-foreground"}`} />
            </div>
            <div className="mt-3 font-display text-2xl font-semibold">{c.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold">Recent documents</h2>
          <Link to="/admin/sales" className="text-xs text-accent hover:underline">View all →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents yet. Create your first invoice.</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[640px]">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr><th className="text-left py-2">Date</th><th className="text-left">Type</th><th className="text-left">Number</th><th className="text-left">Party</th><th className="text-right">Total</th></tr>
            </thead>
            <tbody>
              {recent.map((d) => (
                <tr key={d.id} className="border-b border-border/60 hover:bg-muted/40">
                  <td className="py-2">{d.doc_date}</td>
                  <td className="capitalize">{d.doc_type.replace("_", " ")}</td>
                  <td><Link to={`/admin/sales/${d.id}`} className="hover:underline">{d.doc_number}</Link></td>
                  <td>{(d.parties as any)?.name}</td>
                  <td className="text-right">{fmtINR(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </AdminLayout>
  );
}
