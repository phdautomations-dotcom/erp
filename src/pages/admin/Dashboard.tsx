import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { fmtINR, fmtDate } from "@/lib/format";
import { Wallet, FileText, AlertTriangle, Inbox, Download, Upload, Wrench, PhoneCall, ClipboardCheck, TrendingUp, Users, Banknote, Sparkles, Copy, MessageCircle, Package, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { draftPaymentReminder } from "@/lib/ai/remote";

const formatYAxis = (v: number) => {
  if (v === 0) return '₹0';
  if (v >= 10000000) return `₹${(v/10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v/1000).toFixed(1)}k`;
  return `₹${v}`;
};
const formatLabel = (v: number) => v > 0 ? formatYAxis(v) : '';

// Full literal class names (not built from a template string) so Tailwind's
// content scanner can actually find and generate them at build time.
const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-600" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-600" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-600" },
  red: { bg: "bg-red-500/10", text: "text-red-600" },
  sky: { bg: "bg-sky-500/10", text: "text-sky-600" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-600" },
};
const AVATAR_COLORS = ["violet", "blue", "emerald", "amber", "rose"];

// Full literal stroke colors (not built from a template string), matching
// each card's COLOR_MAP text tone, so the sparkline reads as part of the card.
const SPARK_STROKE: Record<string, string> = {
  emerald: "#10b981", amber: "#f59e0b", rose: "#f43f5e", violet: "#8b5cf6",
  blue: "#3b82f6", red: "#ef4444", sky: "#0ea5e9", indigo: "#6366f1",
};

// A tiny inline trend chart — deliberately hand-rolled SVG rather than a
// full Recharts instance, since a dozen of these on one page would be
// wasteful overhead for what's just a shape.
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2 || data.every(v => v === data[0])) {
    return <div className="h-8" />;
  }
  const w = 100, h = 32, pad = 3;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    receivable: 0, payable: 0, monthSales: 0, monthPurchase: 0,
    lowStock: 0, newLeads: 0, pendingLogs: 0, cashBalance: 0,
    partyCount: 0, itemCount: 0, pendingInvoices: 0, overdueInvoices: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);
  const [dueServices, setDueServices] = useState<any[]>([]);
  const [topOutstanding, setTopOutstanding] = useState<any[]>([]);
  const [reminderFor, setReminderFor] = useState<any>(null);
  const [reminderText, setReminderText] = useState("");
  const [reminderLoading, setReminderLoading] = useState(false);

  const openReminder = async (customer: any) => {
    setReminderFor(customer);
    setReminderText("");
    setReminderLoading(true);
    try {
      const facts = `Customer: ${customer.name}. Amount overdue: ${fmtINR(customer.amount)}. Business: PHD Automations (CNC/VMC/HMC repair services).`;
      const draft = await draftPaymentReminder(facts);
      setReminderText(draft);
    } catch (e: any) {
      setReminderText(`Could not draft a message: ${e?.message || e}`);
    } finally {
      setReminderLoading(false);
    }
  };
  const [pnlChartData, setPnlChartData] = useState<any[]>([]);
  const [rawDocs, setRawDocs] = useState<any[]>([]);
  const [rawExps, setRawExps] = useState<any[]>([]);
  const [rawServiceVisits, setRawServiceVisits] = useState<any[]>([]);
  const [rawItems, setRawItems] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<any[]>([]);
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [pnlFilter, setPnlFilter] = useState("6months");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { hasRole, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Dashboard | ASTA One";
    (async () => {
      const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);
      
      // --- Data Fetching (Consolidated) ---
      const todayStr = new Date().toISOString().slice(0, 10);
      // Fetches all necessary data in parallel for efficiency.
      const [{ data: docs }, { data: items }, { data: leadsAll }, { data: serviceVisits }, { data: exps }, { data: machines }, { data: profs }, { data: att }, { data: cashEntries }, { count: partyCount }] = await Promise.all([
        supabase.from("documents").select("*, parties(name, phone), document_lines(*)").order("created_at", { ascending: false }),
        supabase.from("items").select("*"),
        supabase.from("leads").select("id,status,created_at"),
        supabase.from("service_visits").select("id, visit_date, charges, is_verified").eq("status", "completed"),
        supabase.from("expenses").select("expense_date, amount"),
        (supabase as any).from("party_machines").select("id, amc_expiry_date, name, model, serial_number, parties(name, phone)"),
        supabase.from("profiles").select("user_id, display_name"),
        supabase.from("attendance").select("user_id, status, punch_in").eq("date", todayStr),
        supabase.from("cash_ledger" as any).select("type, amount, entry_date"),
        supabase.from("parties").select("id", { count: "exact", head: true }),
      ]);
      const leads = (leadsAll || []).filter((l: any) => l.status === "new");
      const cashBalance = ((cashEntries as any[]) || []).reduce((s, r) => s + (r.type === "in" ? Number(r.amount) : -Number(r.amount)), 0);

      setRawDocs(docs || []);
      setRawExps(exps || []);
      setRawServiceVisits(serviceVisits || []);
      setRawItems(items || []);
      setProfiles(profs || []);
      setAttendanceToday(att || []);
      // --- Data Processing ---

      // Trend sparklines — real daily series over the last 14 days, not
      // fabricated. Money-flow cards use daily invoice/purchase-bill volume
      // as their trend; Cash Wallet uses the actual running balance (exact,
      // not a proxy); New Leads uses actual daily lead creation. Count-based
      // snapshot cards (low stock, pending logs) have no real history to
      // chart, so they're left without a sparkline rather than faking one.
      const last14 = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (13 - i));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      });
      const dailyDocTotal = (type: string) => last14.map(day =>
        (docs || []).filter(d => d.doc_type === type && d.status !== "cancelled" && d.doc_date === day).reduce((s, d) => s + Number(d.total), 0)
      );
      const sortedCash = [...((cashEntries as any[]) || [])].sort((a, b) => (a.entry_date || "").localeCompare(b.entry_date || ""));
      let runningBalance = 0;
      let cashIdx = 0;
      const cashByDay = last14.map(day => {
        while (cashIdx < sortedCash.length && sortedCash[cashIdx].entry_date <= day) {
          const e = sortedCash[cashIdx];
          runningBalance += e.type === "in" ? Number(e.amount) : -Number(e.amount);
          cashIdx++;
        }
        return runningBalance;
      });
      const leadsByDay = last14.map(day => (leadsAll || []).filter((l: any) => (l.created_at || "").slice(0, 10) === day).length);

      setSparklines({
        receivable: dailyDocTotal("invoice"),
        payable: dailyDocTotal("purchase_bill"),
        monthSales: dailyDocTotal("invoice"),
        monthPurchase: dailyDocTotal("purchase_bill"),
        cashBalance: cashByDay,
        newLeads: leadsByDay,
      });

      // 1. Calculate overall stats for cards
      // Only the invoice itself carries a receivable — quotations/proformas
      // are pipeline docs, and a challan is just a delivery record; payment
      // is only ever collected against the invoice.
      const RECEIVABLE_TYPES = ["invoice"];
      const receivable = (docs || []).filter(d => RECEIVABLE_TYPES.includes(d.doc_type) && d.status !== "cancelled").reduce((s, d) => s + Number(d.total) - Number(d.paid), 0);
      const payable = (docs || []).filter(d => d.doc_type === "purchase_bill" && d.status !== "cancelled").reduce((s, d) => s + Number(d.total) - Number(d.paid), 0);
      const monthSales = (docs || []).filter(d => d.doc_type === "invoice" && d.status !== "cancelled" && new Date(d.doc_date) >= startMonth).reduce((s, d) => s + Number(d.total), 0);
      const monthPurchase = (docs || []).filter(d => d.doc_type === "purchase_bill" && d.status !== "cancelled" && new Date(d.doc_date) >= startMonth).reduce((s, d) => s + Number(d.total), 0);
      const lowStock = (items || []).filter(i => Number(i.current_stock) <= Number(i.low_stock_threshold || 0)).length;
      const pendingLogs = (serviceVisits || []).filter(v => !v.is_verified).length;
      const pendingInvoices = (docs || []).filter(d => d.doc_type === "invoice" && d.status !== "paid" && d.status !== "cancelled").length;
      const overdueInvoices = (docs || []).filter(d => d.doc_type === "invoice" && d.status !== "paid" && d.status !== "cancelled" && d.due_date && d.due_date < todayStr).length;

      setStats({
        receivable, payable, monthSales, monthPurchase, lowStock, newLeads: leads?.length || 0, pendingLogs, cashBalance,
        partyCount: partyCount || 0, itemCount: (items || []).length, pendingInvoices, overdueInvoices,
      });

      // 2. Top Outstanding Customers
      const outstanding: Record<string, any> = {};
      (docs || []).forEach(d => {
        if (RECEIVABLE_TYPES.includes(d.doc_type) && d.status !== "cancelled") {
          const due = Number(d.total) - Number(d.paid);
          if (due > 0 && d.party_id) {
            if (!outstanding[d.party_id]) outstanding[d.party_id] = { id: d.party_id, name: (d.parties as any)?.name || 'Unknown', phone: (d.parties as any)?.phone || '', amount: 0 };
            outstanding[d.party_id].amount += due;
          }
        }
      });
      setTopOutstanding(Object.values(outstanding).sort((a: any, b: any) => b.amount - a.amount).slice(0, 5));

      // 3. Recent Documents
      setRecent((docs || []).slice(0, 8));

      // 4. Service Data Setup is handled dynamically by the new useEffect

      // 5. AMC Due Alerts
      const nextMonth = new Date(); nextMonth.setDate(nextMonth.getDate() + 30);
      const dueMachines = (machines || []).filter((m: any) => m.amc_expiry_date && new Date(m.amc_expiry_date) <= nextMonth)
        .sort((a: any, b: any) => new Date(a.amc_expiry_date).getTime() - new Date(b.amc_expiry_date).getTime()).slice(0, 6);
      setDueServices(dueMachines);
    })();
  }, []);

  // Recalculate P&L chart whenever data or filter changes
  useEffect(() => {
    let chartData: any[] = [];
    
    if (pnlFilter === "30days") {
      chartData = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (29 - i));
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { name: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), dateStr, Sales: 0, Purchase: 0, Expenses: 0, Profit: 0 };
      });
      rawDocs.forEach(d => {
        const match = chartData.find(x => x.dateStr === d.doc_date);
        if (match) {
          if (d.doc_type === 'invoice' && d.status !== 'cancelled') match.Sales += Number(d.total);
          else if (d.doc_type === 'purchase_bill' && d.status !== 'cancelled') match.Purchase += Number(d.total);
        }
      });
      rawExps.forEach(e => {
        const match = chartData.find(x => x.dateStr === e.expense_date);
        if (match) match.Expenses += Number(e.amount);
      });
    } else if (pnlFilter === "6months") {
      chartData = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i));
        return { name: d.toLocaleDateString('en-GB', { month: 'short' }), month: d.getMonth(), year: d.getFullYear(), Sales: 0, Purchase: 0, Expenses: 0, Profit: 0 };
      });
      rawDocs.forEach(d => {
        if (!d.doc_date) return;
        const [yStr, mStr] = d.doc_date.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10) - 1;
        const match = chartData.find(x => x.month === m && x.year === y);
        if (match) {
          if (d.doc_type === 'invoice' && d.status !== 'cancelled') match.Sales += Number(d.total);
          else if (d.doc_type === 'purchase_bill' && d.status !== 'cancelled') match.Purchase += Number(d.total);
        }
      });
      rawExps.forEach(e => {
        if (!e.expense_date) return;
        const [yStr, mStr] = e.expense_date.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10) - 1;
        const match = chartData.find(x => x.month === m && x.year === y);
        if (match) match.Expenses += Number(e.amount);
      });
    } else if (pnlFilter === "5years") {
      chartData = Array.from({ length: 5 }, (_, i) => {
        const d = new Date(); d.setFullYear(d.getFullYear() - (4 - i));
        return { name: d.getFullYear().toString(), year: d.getFullYear(), Sales: 0, Purchase: 0, Expenses: 0, Profit: 0 };
      });
      rawDocs.forEach(d => {
        if (!d.doc_date) return;
        const y = parseInt(d.doc_date.split('-')[0], 10);
        const match = chartData.find(x => x.year === y);
        if (match) {
          if (d.doc_type === 'invoice' && d.status !== 'cancelled') match.Sales += Number(d.total);
          else if (d.doc_type === 'purchase_bill' && d.status !== 'cancelled') match.Purchase += Number(d.total);
        }
      });
      rawExps.forEach(e => {
        if (!e.expense_date) return;
        const y = parseInt(e.expense_date.split('-')[0], 10);
        const match = chartData.find(x => x.year === y);
        if (match) match.Expenses += Number(e.amount);
      });
    }

    chartData.forEach(m => { m.Profit = m.Sales - m.Purchase - m.Expenses; });
    setPnlChartData(chartData);
  }, [rawDocs, rawExps, pnlFilter]);

  const downloadBackup = async () => {
    setIsExporting(true);
    try {
      const tables = ['parties', 'items', 'documents', 'document_lines', 'service_visits', 'company_settings', 'number_series', 'leads', 'stock_ledger', 'payments', 'payment_allocations', 'expenses'];
      const allData: any = {};
      for (const t of tables) {
        const { data } = await supabase.from(t as any).select('*');
        allData[t] = data;
      }
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phd-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded successfully!");
    } catch (error: any) {
      toast.error("Backup failed: " + error.message);
    }
    setIsExporting(false);
  };

  const triggerRestore = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          await restoreData(data);
        } catch (err: any) {
          toast.error("Failed to parse backup file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const restoreData = async (allData: any) => {
    setIsImporting(true);
    // Insert in specific order to maintain foreign key relations
    const order = ['company_settings', 'number_series', 'parties', 'items', 'leads', 'documents', 'document_lines', 'service_visits', 'stock_ledger', 'payments', 'payment_allocations', 'expenses'];
    let hasError = false;
    try {
      for (const table of order) {
        if (allData[table] && allData[table].length > 0) {
          
          // Strip 'created_by' to prevent foreign key constraint errors with new auth.users table
          const cleanData = allData[table].map((row: any) => {
            const { created_by, ...rest } = row;
            return rest;
          });

          // Using upsert instead of insert to prevent primary key conflict errors
          const { error } = await supabase.from(table as any).upsert(cleanData);
          if (error) {
            console.error(`Error restoring ${table}:`, error);
            toast.error(`Error in ${table}: ${error.message}`);
            hasError = true;
          }
        }
      }
      if (!hasError) {
        toast.success("Data restored successfully!");
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err: any) {
      toast.error("Restore failed: " + err.message);
    }
    setIsImporting(false);
  };

  // Prepare Attendance List
  const attendanceList = profiles.map(p => {
    const att = attendanceToday.find(a => a.user_id === p.user_id);
    let status = 'Absent';
    let color = 'text-red-600 bg-red-500/10';
    if (att) {
      if (att.status === 'leave_approved') { status = 'On Leave'; color = 'text-purple-600 bg-purple-500/10'; }
      else if (att.status === 'leave_pending') { status = 'Leave Pending'; color = 'text-blue-600 bg-blue-500/10'; }
      else if (att.status === 'leave_rejected') { status = 'Leave Rejected'; color = 'text-red-600 bg-red-500/10'; }
      else if (att.punch_in || att.status === 'present') { status = 'Present'; color = 'text-green-600 bg-green-500/10'; }
    }
    return { id: p.user_id, name: p.display_name || 'Unknown', status, color };
  });

  // Every tile drills down into the actual records behind the number — the
  // same filtered table (by doc, item, lead or service log) that produced it.
  // Each gets its own soft accent color, rather than one gradient "hero" card
  // among plain gray ones — a flatter, more even card language.
  const cards = [
    { label: "Receivable", value: fmtINR(stats.receivable), icon: Wallet, color: "emerald", to: "/admin/sales?type=invoice&due=1", spark: sparklines.receivable },
    { label: "Payable", value: fmtINR(stats.payable), icon: Wallet, color: "amber", to: "/admin/purchases?type=purchase_bill&due=1", spark: sparklines.payable },
    { label: "Cash Wallet Balance", value: fmtINR(stats.cashBalance), icon: Banknote, color: "rose", to: "/admin/cash-ledger", spark: sparklines.cashBalance },
    { label: "This month sales", value: fmtINR(stats.monthSales), icon: FileText, color: "violet", to: "/admin/sales?type=invoice", spark: sparklines.monthSales },
    { label: "This month purchase", value: fmtINR(stats.monthPurchase), icon: FileText, color: "blue", to: "/admin/purchases?type=purchase_bill", spark: sparklines.monthPurchase },
    { label: "Low stock items", value: stats.lowStock.toString(), icon: AlertTriangle, color: "red", to: "/admin/items?low=1" },
    { label: "New leads", value: stats.newLeads.toString(), icon: Inbox, color: "sky", to: "/admin/leads?status=new", spark: sparklines.newLeads },
    { label: "Pending Service Logs", value: stats.pendingLogs.toString(), icon: ClipboardCheck, color: "indigo", to: "/admin/services?filter=unverified" },
  ];

  // A second, compact row of at-a-glance counts — mirrors the "Total
  // Parties / Total Items / Low Stock / Pending / Overdue" strip pattern.
  const miniStats = [
    { label: "Total Parties", value: stats.partyCount.toString(), caption: "Active", icon: Users, color: "emerald", to: "/admin/parties" },
    { label: "Total Items", value: stats.itemCount.toString(), caption: "In Stock", icon: Package, color: "blue", to: "/admin/items" },
    { label: "Low Stock Items", value: stats.lowStock.toString(), caption: "Reorder Soon", icon: AlertTriangle, color: "amber", to: "/admin/items?low=1" },
    { label: "Pending Invoices", value: stats.pendingInvoices.toString(), caption: "Unpaid", icon: FileText, color: "rose", to: "/admin/sales?type=invoice&due=1" },
    { label: "Overdue Invoices", value: stats.overdueInvoices.toString(), caption: "Overdue", icon: Clock, color: "red", to: "/admin/sales?type=invoice&due=1" },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! Here's what's happening with your business today.</p>
        </div>

        {hasRole("admin") && (
          <div className="flex items-center gap-3">
            <Button onClick={triggerRestore} disabled={isImporting || isExporting} variant="outline" className="rounded-full border-border/50 bg-card shadow-sm transition-colors hover:bg-muted/50">
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? "Restoring..." : "Restore"}
            </Button>
            <Button onClick={downloadBackup} disabled={isExporting || isImporting} variant="default" className="rounded-full shadow-sm transition-shadow hover:shadow-md btn-gradient">
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Backup"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 + 0.1, duration: 0.4, ease: "easeOut" }}
            className={`relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition-shadow hover:shadow-md ${c.to ? "cursor-pointer" : ""}`}
            onClick={() => c.to && navigate(c.to)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${COLOR_MAP[c.color].bg} ${COLOR_MAP[c.color].text}`}>
                <c.icon className="h-5 w-5" />
              </div>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
            <div className="font-display text-2xl font-bold tracking-tight text-foreground mt-0.5">{c.value}</div>
            {c.spark && (
              <div className="absolute right-4 bottom-4 w-20 h-9 pointer-events-none opacity-90">
                <Sparkline data={c.spark} color={SPARK_STROKE[c.color]} />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {miniStats.map((m) => (
          <div
            key={m.label}
            className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card p-4 shadow-sm cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => navigate(m.to)}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${COLOR_MAP[m.color].bg} ${COLOR_MAP[m.color].text}`}>
              <m.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{m.label}</p>
              <p className="font-display text-lg font-bold text-foreground leading-tight">{m.value}</p>
              <p className={`text-[11px] font-medium ${COLOR_MAP[m.color].text}`}>{m.caption}</p>
            </div>
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="mt-8 overflow-hidden rounded-3xl border border-border/50 bg-card p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg font-semibold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Profit & Loss Trend
          </h2>
          <Select value={pnlFilter} onValueChange={setPnlFilter}>
            <SelectTrigger className="h-8 w-36 text-xs rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="5years">Last 5 Years</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pnlChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(258 90% 66%)" />
                  <stop offset="100%" stopColor="hsl(243 75% 59%)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatYAxis} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", borderRadius: "0.75rem" }}
                formatter={(value: number) => fmtINR(value)}
              />
              <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
              <Bar dataKey="Sales" fill="#22c55e" radius={[4, 4, 0, 0]}>
                 <LabelList dataKey="Sales" position="top" formatter={formatLabel} fontSize={10} fill="hsl(var(--muted-foreground))" />
              </Bar>
              <Bar dataKey="Purchase" fill="#f97316" radius={[4, 4, 0, 0]}>
                 <LabelList dataKey="Purchase" position="top" formatter={formatLabel} fontSize={10} fill="hsl(var(--muted-foreground))" />
              </Bar>
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]}>
                 <LabelList dataKey="Expenses" position="top" formatter={formatLabel} fontSize={10} fill="hsl(var(--muted-foreground))" />
              </Bar>
              <Bar dataKey="Profit" fill="url(#profitGradient)" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="Profit" name="Profit Trend" stroke="#eab308" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="w-full min-w-0 lg:col-span-2 flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm flex flex-col flex-1"
        >
          <div className="flex items-center justify-between border-b border-border/50 p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight">Recent Documents</h2>
            <Link to="/admin/sales">
              <Button variant="outline" size="sm" className="rounded-full border-accent/30 text-accent hover:bg-accent/5 hover:text-accent">View all</Button>
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center flex-1">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                <FileText className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground">No documents yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Create your first invoice or purchase bill to see it here.</p>
            </div>
          ) : (
            <>
              {/* Mobile: stacked cards — no overlap/no horizontal scroll */}
              <div className="md:hidden divide-y divide-border/50">
                {recent.map((d) => {
                  const isPipeline = ["quotation", "proforma"].includes(d.doc_type);
                  const due = Number(d.total) - Number(d.paid || 0);
                  return (
                    <div key={d.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link to={`/admin/sales/${d.id}`} className="font-medium font-mono text-xs transition-colors hover:text-accent">
                            {d.doc_number}
                          </Link>
                          <p className="font-medium text-sm truncate mt-0.5">{(d.parties as any)?.name}</p>
                        </div>
                        <span className="font-semibold shrink-0">{fmtINR(d.total)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">{d.doc_date}{!isPipeline && ` · Due ${fmtINR(due)}`}</span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          isPipeline ? "bg-muted text-muted-foreground" :
                          d.status === "paid" ? "bg-emerald-500/10 text-emerald-600" :
                          d.status === "partial" ? "bg-amber-500/10 text-amber-600" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {isPipeline ? "Pipeline" : d.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: full table */}
              <div className="hidden md:block overflow-x-auto flex-1">
                <table className="w-full min-w-0 table-fixed text-sm">
                  <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 text-left">Date</th>
                      <th className="px-6 py-4 text-left">Number</th>
                      <th className="px-6 py-4 text-left">Party</th>
                      <th className="px-6 py-4 text-right">Total</th>
                      <th className="px-6 py-4 text-right">Paid</th>
                      <th className="px-6 py-4 text-right">Due</th>
                      <th className="px-6 py-4 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {recent.map((d) => {
                      const isPipeline = ["quotation", "proforma"].includes(d.doc_type);
                      const due = Number(d.total) - Number(d.paid || 0);
                      return (
                        <tr key={d.id} className="transition-colors hover:bg-muted/30">
                          <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{d.doc_date}</td>
                          <td className="px-6 py-4 font-mono text-xs">
                            <Link to={`/admin/sales/${d.id}`} className="font-medium transition-colors hover:text-accent">
                              {d.doc_number}
                            </Link>
                          </td>
                          <td className="px-6 py-4 font-medium truncate">{(d.parties as any)?.name}</td>
                          <td className="px-6 py-4 text-right font-semibold">{fmtINR(d.total)}</td>
                          <td className="px-6 py-4 text-right text-muted-foreground">{isPipeline ? "—" : fmtINR(d.paid)}</td>
                          <td className="px-6 py-4 text-right text-muted-foreground">{isPipeline ? "—" : fmtINR(due)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                              isPipeline ? "bg-muted text-muted-foreground" :
                              d.status === "paid" ? "bg-emerald-500/10 text-emerald-600" :
                              d.status === "partial" ? "bg-amber-500/10 text-amber-600" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {isPipeline ? "Pipeline" : d.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-border/50 p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-600"><AlertTriangle className="h-4 w-4" /></span>
              Top Parties (Receivables)
            </h2>
            <Link to="/admin/parties" className="text-sm font-medium text-accent transition-colors hover:text-accent/80">View all</Link>
          </div>
          <div className="p-2">
            {topOutstanding.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No outstanding payments! 🎉</div>
            ) : (
              <div className="divide-y divide-border/50">
                {topOutstanding.map((customer, i) => (
                  <div key={customer.id} className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-semibold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold text-sm ${COLOR_MAP[AVATAR_COLORS[i % AVATAR_COLORS.length]].bg} ${COLOR_MAP[AVATAR_COLORS[i % AVATAR_COLORS.length]].text}`}>
                        {customer.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <Link to={`/admin/parties/${customer.id}`} className="font-medium text-sm hover:text-accent transition-colors truncate block">
                          {customer.name}
                        </Link>
                        {customer.phone && <div className="text-xs text-muted-foreground">📞 {customer.phone}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-accent" title="Draft AI reminder" onClick={() => openReminder(customer)}>
                        <Sparkles className="h-3.5 w-3.5" />
                      </Button>
                      <div className="text-right font-semibold text-destructive">
                        {fmtINR(customer.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
        </div>

        <div className="w-full min-w-0 flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.5 }}
          className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-border/50 p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600"><Users className="h-4 w-4" /></span>
              Today's Attendance
            </h2>
            <div className="text-xs text-muted-foreground font-medium">
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 max-h-[300px]">
             {attendanceList.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No employees found.</div>
             ) : (
                <div className="divide-y divide-border/50">
                  {attendanceList.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30">
                      <div className="font-medium text-sm">{u.name}</div>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${u.color}`}>{u.status}</span>
                    </div>
                  ))}
                </div>
             )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-border/50 p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600"><Wrench className="h-4 w-4" /></span>
              Service Alerts
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {dueServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">All machines are healthy.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">No services due in next 30 days.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {dueServices.map((machine) => {
                  const isOverdue = new Date(machine.amc_expiry_date) < new Date();
                  return (
                    <div key={machine.id} className="p-4 transition-colors hover:bg-muted/30">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm line-clamp-1">{(machine.parties as any)?.name}</span>
                        <span className={`text-xs font-semibold whitespace-nowrap px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-500/10 text-red-600' : 'bg-blue-500/10 text-blue-600'}`}>
                          {isOverdue ? 'AMC Expired' : 'AMC Expiring'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1 mb-3">{`${machine.name} ${machine.model || ""} (SN: ${machine.serial_number || "—"})`}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded-md">{fmtDate(machine.amc_expiry_date)}</span>
                        {(machine.parties as any)?.phone && (
                          <a href={`tel:${(machine.parties as any)?.phone}`} className="inline-flex items-center justify-center rounded-full h-7 w-7 bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors">
                            <PhoneCall className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Made with <span className="text-rose-500">♥</span> by Saffyre Intelligence Labs
      </p>

      <Dialog open={!!reminderFor} onOpenChange={(v) => !v && setReminderFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> Reminder for {reminderFor?.name}</DialogTitle></DialogHeader>
          {reminderLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Drafting…</p>
          ) : (
            <>
              <textarea
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-border/50 bg-background/50 p-3 text-sm resize-none"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => { navigator.clipboard.writeText(reminderText); toast.success("Copied"); }}>
                  <Copy className="h-4 w-4 mr-1.5" /> Copy
                </Button>
                {reminderFor?.phone && (
                  <a href={`https://wa.me/${String(reminderFor.phone).replace(/\D/g, "")}?text=${encodeURIComponent(reminderText)}`} target="_blank" rel="noreferrer" className="flex-1">
                    <Button className="w-full rounded-full bg-green-600 hover:bg-green-700 text-white">
                      <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
