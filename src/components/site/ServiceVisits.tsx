import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmtINR } from "@/lib/format";
import { Wrench, Clock, CheckCircle, AlertTriangle, Printer } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addPdfBranding, type Settings } from "@/lib/pdf";

export default function ServiceVisits() {
  const [visits, setVisits] = useState<any[]>([]);
  const [dueAmc, setDueAmc] = useState<any[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const { hasRole } = useAuth();

  const loadVisits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_visits")
      .select("*, parties(name, phone)")
      .order("visit_date", { ascending: false });
    
    if (error) {
      toast.error(error.message);
    } else {
      setVisits(data || []);
    }

    // Load AMC Alerts from party_machines
    const nextMonth = new Date(); nextMonth.setDate(nextMonth.getDate() + 30);
    const { data: machines } = await (supabase as any).from("party_machines")
      .select("id, party_id, amc_expiry_date, name, model, serial_number, parties(name, phone)")
      .not("amc_expiry_date", "is", null)
      .lte("amc_expiry_date", nextMonth.toISOString().slice(0, 10))
      .order("amc_expiry_date", { ascending: true });
    setDueAmc(machines || []);

    const { data: s } = await supabase.from("company_settings").select("*").limit(1).single();
    setSettings(s || null);

    setLoading(false);
  };

  const verifyVisit = async (id: string) => {
    const { error } = await supabase.from("service_visits").update({ is_verified: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Service log verified & locked!");
    loadVisits();
  };

  useEffect(() => {
    document.title = "Service Desk | PHD ERP";
    loadVisits();
  }, []);

  // Filter logic
  const getFilteredData = () => {
    if (filter === "amc_due") {
      return dueAmc.map(m => {
        const isOverdue = new Date(m.amc_expiry_date) < new Date();
        return {
          id: m.id,
          party_id: m.party_id,
          visit_date: m.amc_expiry_date,
          visit_type: "AMC Alert",
          parties: m.parties,
          machine_details: `${m.name} ${m.model || ""} (SN: ${m.serial_number || "—"})`,
          work_description: isOverdue ? "AMC has expired!" : "AMC is expiring soon.",
          engineer_name: "—",
          status: isOverdue ? "overdue" : "expiring",
          charges: 0,
          is_amc_alert: true
        };
      });
    }
    if (filter === "unverified") return visits.filter((v) => v.status === "completed" && !v.is_verified);
    if (filter === "all") return visits;
    return visits.filter((v) => v.status === filter);
  };

  const displayData = getFilteredData();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600"><Clock className="h-3 w-3" /> Scheduled</span>;
      case "in_progress":
        return <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-600"><Wrench className="h-3 w-3" /> In Progress</span>;
      case "completed":
        return <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600"><CheckCircle className="h-3 w-3" /> Completed</span>;
      case "cancelled":
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600"><AlertTriangle className="h-3 w-3" /> Cancelled</span>;
      case "expiring":
        return <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-600"><AlertTriangle className="h-3 w-3" /> Expiring Soon</span>;
      case "overdue":
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600"><AlertTriangle className="h-3 w-3" /> Expired</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{status}</span>;
    }
  };

  const printReport = async (v: any) => {
    if (!settings) return toast.error("Settings not loaded yet.");
    const pdf = new jsPDF("p", "mm", "a4");
    let y = await addPdfBranding(pdf, "SERVICE REPORT", settings);

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Customer Details", 14, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(v.parties?.name || 'Unknown', 14, y + 6);
    pdf.text(`Ph: ${v.parties?.phone || '—'}`, 14, y + 11);

    pdf.setFont("helvetica", "bold");
    pdf.text("Service Info", 120, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Date: ${new Date(v.visit_date).toLocaleDateString('en-GB')}`, 120, y + 6);
    pdf.text(`Engineer: ${v.engineer_name || 'Unassigned'}`, 120, y + 11);
    pdf.text(`Visit Type: ${v.visit_type}`, 120, y + 16);
    pdf.text(`Status: ${v.status.replace('_', ' ')}`, 120, y + 21);

    y += 28;

    autoTable(pdf, {
      startY: y,
      theme: 'grid',
      head: [['Machine Details']],
      body: [[v.machine_details || '—']],
      headStyles: { fillColor: [240, 240, 240], textColor: 15, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
    });
    y = (pdf as any).lastAutoTable.finalY + 6;

    autoTable(pdf, {
      startY: y,
      theme: 'grid',
      head: [['Work Description']],
      body: [[v.work_description || '—']],
      headStyles: { fillColor: [240, 240, 240], textColor: 15, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
    });
    y = (pdf as any).lastAutoTable.finalY + 6;

    if (v.parts_used) {
      autoTable(pdf, {
        startY: y,
        theme: 'grid',
        head: [['Parts Used / Replaced']],
        body: [[v.parts_used]],
        headStyles: { fillColor: [240, 240, 240], textColor: 15, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
      });
      y = (pdf as any).lastAutoTable.finalY + 6;
    }

    autoTable(pdf, {
      startY: y,
      theme: 'grid',
      head: [['Service Charges', 'Next Scheduled Visit']],
      body: [[
        fmtINR(v.charges || 0),
        v.next_visit_date ? new Date(v.next_visit_date).toLocaleDateString('en-GB') : 'Not Scheduled'
      ]],
      headStyles: { fillColor: [240, 240, 240], textColor: 15, fontStyle: 'bold' },
      styles: { fontSize: 11, cellPadding: 4, valign: 'middle' },
    });
    y = (pdf as any).lastAutoTable.finalY + 40;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text("Customer Signature", 40, y, { align: "center" });
    pdf.text("Engineer Signature", pdf.internal.pageSize.getWidth() - 40, y, { align: "center" });

    pdf.save(`Service_Report_${v.parties?.name?.replace(/\s/g, "_") || "Unknown"}_${v.visit_date}.pdf`);
  };

  return (
    <AdminLayout title="Service Desk & AMC">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm text-muted-foreground">Manage all your machine breakdowns, installations and AMCs.</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl">
        <div className="p-4 border-b border-border/50">
          <Tabs value={filter} onValueChange={setFilter} className="w-full">
            <TabsList className="bg-background/50 backdrop-blur">
              <TabsTrigger value="all">All Visits</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="unverified" className="text-yellow-600 data-[state=active]:text-yellow-600">Pending Verification</TabsTrigger>
              <TabsTrigger value="amc_due" className="text-orange-600 data-[state=active]:text-orange-600">AMC Due (30 Days)</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Customer</th>
                <th className="px-6 py-4 text-left">Machine & Issue</th>
                <th className="px-6 py-4 text-left">Engineer</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-right">Charges</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading tickets...</td></tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mx-auto">
                      <Wrench className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No service visits found</p>
                  </td>
                </tr>
              ) : (
                displayData.map((v) => (
                  <tr key={v.id} className="transition-colors hover:bg-muted/30 align-top">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="font-medium">{new Date(v.visit_date).toLocaleDateString('en-GB')}</div>
                      <div className="text-xs text-muted-foreground capitalize mt-1">{v.visit_type}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      <Link to={`/admin/parties/${v.party_id}`} className="hover:text-accent transition-colors underline-offset-4 hover:underline">
                        {v.parties?.name || "Unknown"}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold">{v.machine_details || "—"}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{v.work_description}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{v.engineer_name || "Unassigned"}</td>
                        <td className="px-6 py-4">
                      {getStatusBadge(v.status)}
                      {v.status === 'completed' && !v.is_verified && !v.is_amc_alert && <div className="mt-1"><span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold bg-yellow-500/10 text-yellow-600">Unverified</span></div>}
                      {v.is_verified && <div className="mt-1"><span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold bg-green-500/10 text-green-600">Verified</span></div>}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold">{fmtINR(v.charges)}</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      {hasRole("admin") && v.status === "completed" && !v.is_verified && !v.is_amc_alert && (
                        <Button variant="default" size="sm" onClick={() => verifyVisit(v.id)} className="rounded-full shadow-sm hover:shadow-md transition-all h-8 text-xs bg-foreground text-background">Verify</Button>
                      )}
                      {!v.is_amc_alert && (
                        <Button variant="ghost" size="icon" className="rounded-full shadow-sm hover:shadow-md transition-all" onClick={() => printReport(v)} title="Print Service Report">
                          <Printer className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      )}
                      <Link to={`/admin/parties/${v.party_id}`}>
                        <Button variant="ghost" size="sm" className="rounded-full shadow-sm hover:shadow-md transition-all">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}