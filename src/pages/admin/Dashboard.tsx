import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { fmtINR } from "@/lib/format";
import { Wallet, FileText, AlertTriangle, Inbox, Download, Upload, Settings, Wrench, PhoneCall, BarChart3, ClipboardCheck, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatYAxis = (v: number) => {
  if (v === 0) return '₹0';
  if (v >= 10000000) return `₹${(v/10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v/1000).toFixed(1)}k`;
  return `₹${v}`;
};
const formatLabel = (v: number) => v > 0 ? formatYAxis(v) : '';

export default function Dashboard() {
  const [stats, setStats] = useState({
    receivable: 0, payable: 0, monthSales: 0, monthPurchase: 0,
    lowStock: 0, newLeads: 0, pendingLogs: 0
  });
  const [recent, setRecent] = useState<any[]>([]);
  const [dueServices, setDueServices] = useState<any[]>([]);
  const [topOutstanding, setTopOutstanding] = useState<any[]>([]);
  const [pnlChartData, setPnlChartData] = useState<any[]>([]);
  const [rawDocs, setRawDocs] = useState<any[]>([]);
  const [rawExps, setRawExps] = useState<any[]>([]);
  const [rawServiceVisits, setRawServiceVisits] = useState<any[]>([]);
  const [rawItems, setRawItems] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<any[]>([]);
  const [pnlFilter, setPnlFilter] = useState("6months");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { hasRole, user } = useAuth();

  useEffect(() => {
    document.title = "Dashboard | PHD ERP";
    (async () => {
      const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);
      
      // --- Data Fetching (Consolidated) ---
      const todayStr = new Date().toISOString().slice(0, 10);
      // Fetches all necessary data in parallel for efficiency.
      const [{ data: docs }, { data: items }, { data: leads }, { data: serviceVisits }, { data: exps }, { data: machines }, { data: profs }, { data: att }] = await Promise.all([
        supabase.from("documents").select("*, parties(name, phone), document_lines(*)").order("created_at", { ascending: false }),
        supabase.from("items").select("*"),
        supabase.from("leads").select("id,status").eq("status", "new"),
        supabase.from("service_visits").select("id, visit_date, charges, is_verified").eq("status", "completed"),
        supabase.from("expenses").select("expense_date, amount"),
        (supabase as any).from("party_machines").select("id, amc_expiry_date, name, model, serial_number, parties(name, phone)"),
        supabase.from("profiles").select("user_id, display_name"),
        supabase.from("attendance").select("user_id, status, punch_in").eq("date", todayStr)
      ]);

      setRawDocs(docs || []);
      setRawExps(exps || []);
      setRawServiceVisits(serviceVisits || []);
      setRawItems(items || []);
      setProfiles(profs || []);
      setAttendanceToday(att || []);
      // --- Data Processing ---

      // 1. Calculate overall stats for cards
      const receivable = (docs || []).filter(d => d.doc_type === "invoice" && d.status !== "cancelled").reduce((s, d) => s + Number(d.total) - Number(d.paid), 0);
      const payable = (docs || []).filter(d => d.doc_type === "purchase_bill" && d.status !== "cancelled").reduce((s, d) => s + Number(d.total) - Number(d.paid), 0);
      const monthSales = (docs || []).filter(d => d.doc_type === "invoice" && d.status !== "cancelled" && new Date(d.doc_date) >= startMonth).reduce((s, d) => s + Number(d.total), 0);
      const monthPurchase = (docs || []).filter(d => d.doc_type === "purchase_bill" && d.status !== "cancelled" && new Date(d.doc_date) >= startMonth).reduce((s, d) => s + Number(d.total), 0);
      const lowStock = (items || []).filter(i => Number(i.current_stock) <= Number(i.low_stock_threshold || 0)).length;
      const pendingLogs = (serviceVisits || []).filter(v => !v.is_verified).length;

      setStats({ receivable, payable, monthSales, monthPurchase, lowStock, newLeads: leads?.length || 0, pendingLogs });

      // 2. Top Outstanding Customers
      const outstanding: Record<string, any> = {};
      (docs || []).forEach(d => {
        if (d.doc_type === "invoice" && d.status !== "cancelled") {
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
      else if (att.status === 'leave_pending') { status = 'Leave Pending'; color = 'text-orange-600 bg-orange-500/10'; }
      else if (att.status === 'leave_rejected') { status = 'Leave Rejected'; color = 'text-red-600 bg-red-500/10'; }
      else if (att.punch_in || att.status === 'present') { status = 'Present'; color = 'text-green-600 bg-green-500/10'; }
    }
    return { id: p.user_id, name: p.display_name || 'Unknown', status, color };
  });

  const cards = [
    { label: "Receivable", value: fmtINR(stats.receivable), icon: Wallet, accent: true },
    { label: "Payable", value: fmtINR(stats.payable), icon: Wallet },
    { label: "This month sales", value: fmtINR(stats.monthSales), icon: FileText },
    { label: "This month purchase", value: fmtINR(stats.monthPurchase), icon: FileText },
    { label: "Low stock items", value: stats.lowStock.toString(), icon: AlertTriangle },
    { label: "New leads", value: stats.newLeads.toString(), icon: Inbox },
    { label: "Pending Service Logs", value: stats.pendingLogs.toString(), icon: ClipboardCheck },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-border/50 bg-card/50 p-6 sm:p-8 shadow-sm backdrop-blur-xl flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Animated CNC Gears Background */}
        <div className="absolute -right-10 -top-10 text-accent/10 pointer-events-none flex items-center justify-center mix-blend-multiply dark:mix-blend-lighten">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}>
            <Settings className="h-48 w-48" strokeWidth={1} />
          </motion.div>
          <motion.div initial={{ rotate: 22.5 }} animate={{ rotate: -337.5 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="-ml-16 mt-20">
            <Settings className="h-48 w-48" strokeWidth={1} />
          </motion.div>
        </div>

        <div className="relative z-10 flex flex-col gap-2">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/80 to-accent bg-clip-text text-transparent flex items-center gap-3">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''} <span className="inline-block animate-pulse">👋</span>
          </h1>
          <p className="text-sm text-muted-foreground">Here is what's happening with your CNC/VMC operations today.</p>
        </div>

        <div className="relative z-10">
          {hasRole("admin") && (
            <div className="flex items-center gap-3">
              <Button onClick={triggerRestore} disabled={isImporting || isExporting} variant="outline" className="rounded-full border-border/50 bg-background/50 shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-muted/50">
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? "Restoring..." : "Restore"}
              </Button>
              <Button onClick={downloadBackup} disabled={isExporting || isImporting} variant="default" className="rounded-full shadow-sm transition-all duration-300 hover:shadow-md bg-foreground text-background hover:bg-foreground/90">
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Backup"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 + 0.1, duration: 0.4, ease: "easeOut" }}
            className="group relative overflow-hidden rounded-3xl border border-border/50 bg-card/50 p-6 shadow-sm backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/10 hover:border-accent/50 dark:hover:shadow-accent/5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">{c.label}</span>
                <div className="font-display text-3xl font-semibold tracking-tight text-foreground">{c.value}</div>
              </div>
              <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${c.accent ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/40' : 'bg-muted text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent'}`}>
                <c.icon className="h-5 w-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="mt-8 overflow-hidden rounded-3xl border border-border/50 bg-card/50 p-6 shadow-sm backdrop-blur-xl"
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
              <Bar dataKey="Profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="Profit" name="Profit Trend" stroke="#eab308" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl flex flex-col flex-1"
        >
          <div className="flex items-center justify-between border-b border-border/50 p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight">Recent Documents</h2>
            <Link to="/admin/sales" className="text-sm font-medium text-accent transition-colors hover:text-accent/80">
              View all &rarr;
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
            <div className="overflow-x-auto flex-1">
              <table className="w-full min-w-0 table-fixed text-sm">
                <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 text-left">Date</th>
                    <th className="px-6 py-4 text-left">Type</th>
                    <th className="px-6 py-4 text-left">Number</th>
                    <th className="px-6 py-4 text-left">Party</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {recent.map((d) => (
                    <tr key={d.id} className="transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{d.doc_date}</td>
                      <td className="whitespace-nowrap px-6 py-4 capitalize">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          d.doc_type === "invoice" ? "bg-green-500/10 text-green-600" :
                          d.doc_type === "purchase_bill" ? "bg-blue-500/10 text-blue-600" :
                          "bg-orange-500/10 text-orange-600"
                        }`}>
                          {d.doc_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <Link to={`/admin/sales/${d.id}`} className="font-medium transition-colors hover:text-accent">
                          {d.doc_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-medium">{(d.parties as any)?.name}</td>
                      <td className="px-6 py-4 text-right font-semibold">
                        {["quotation", "proforma"].includes(d.doc_type) ? (
                          <span className="rounded-full bg-muted/50 px-2 py-0.5 text-xs italic text-muted-foreground">Pipeline</span>
                        ) : (
                          fmtINR(d.total)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-border/50 p-6 bg-red-500/5">
            <h2 className="font-display text-lg font-semibold tracking-tight flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" /> Top Outstanding Customers
            </h2>
          </div>
          <div className="p-2">
            {topOutstanding.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No outstanding payments! 🎉</div>
            ) : (
              <div className="divide-y divide-border/50">
                {topOutstanding.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30">
                    <div>
                      <div className="font-medium text-sm">
                        <Link to={`/admin/parties/${customer.id}`} className="hover:text-accent transition-colors">
                          {customer.name}
                        </Link>
                      </div>
                      {customer.phone && <div className="text-xs text-muted-foreground mt-1">📞 {customer.phone}</div>}
                    </div>
                    <div className="text-right font-semibold text-destructive">
                      {fmtINR(customer.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
        </div>

        <div className="flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.5 }}
          className="overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-border/50 p-6 bg-purple-500/5">
            <h2 className="font-display text-lg font-semibold tracking-tight flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Users className="h-5 w-5" /> Today's Attendance
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
          className="overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-border/50 p-6 bg-orange-500/5">
            <h2 className="font-display text-lg font-semibold tracking-tight flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <Wrench className="h-5 w-5" /> Service Alerts
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
                        <span className={`text-xs font-semibold whitespace-nowrap px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-500/10 text-red-600' : 'bg-orange-500/10 text-orange-600'}`}>
                          {isOverdue ? 'AMC Expired' : 'AMC Expiring'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1 mb-3">{`${machine.name} ${machine.model || ""} (SN: ${machine.serial_number || "—"})`}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded-md">{new Date(machine.amc_expiry_date).toLocaleDateString('en-GB')}</span>
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
    </AdminLayout>
  );
}
