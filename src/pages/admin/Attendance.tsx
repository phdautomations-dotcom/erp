import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtINR } from "@/lib/format";
import { toast } from "sonner";
import { MapPin, Clock, Calculator, CalendarClock, CalendarCheck2, CheckCircle, XCircle, Palmtree, Trash2 } from "lucide-react";

export default function Attendance() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [logs, setLogs] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [empOpen, setEmpOpen] = useState(false);
  const [empData, setEmpData] = useState<any>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [holOpen, setHolOpen] = useState(false);
  const [newHolDate, setNewHolDate] = useState("");
  const [newHolName, setNewHolName] = useState("");

  const load = async () => {
    setLoading(true);
    const [yearStr, monthStr] = month.split("-");
    const startDate = `${month}-01`;
    const lastDay = new Date(Number(yearStr), Number(monthStr), 0).getDate();
    const endDate = `${month}-${lastDay}`;

    const { data: attData } = await supabase.from("attendance")
      .select("*, profiles(display_name)")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("punch_in", { ascending: false });
    setLogs(attData || []);

    const { data: holData } = await supabase.from("company_holidays").select("*").gte("date", startDate).lte("date", endDate).order("date");
    setHolidays(holData || []);

    const { data: profData } = await supabase.from("profiles").select("*");
    const { data: expData } = await supabase.from("expenses").select("amount, employee_id").eq("category", "Salaries").gte("expense_date", startDate).lte("expense_date", endDate);

    const payrollCalc = (profData || []).map(p => {
      const empLogs = (attData || []).filter(a => a.user_id === p.user_id);
      const daysPresent = empLogs.filter(a => a.punch_in || a.status === 'present').length;
      const monthlySalary = Number(p.monthly_salary || 0);
      const perDaySalary = monthlySalary / lastDay;
      const earned = Math.round(perDaySalary * daysPresent);
      const paid = (expData || []).filter(e => e.employee_id === p.user_id).reduce((sum, e) => sum + Number(e.amount), 0);
      return { id: p.user_id, name: p.display_name || "Unnamed", monthlySalary, daysPresent, earned, paid, outstanding: earned - paid };
    }).filter(p => p.monthlySalary > 0 || p.daysPresent > 0 || p.paid > 0 || (attData || []).some(a => a.user_id === p.id));

    setPayroll(payrollCalc);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Attendance | PHD ERP";
    load();
  }, [month]);

  const updateLeave = async (id: string, status: string) => {
    const remarks = prompt("Admin Remarks (Optional):", "");
    if (remarks === null) return;
    await supabase.from("attendance").update({ status, admin_remarks: remarks }).eq("id", id);
    toast.success("Leave updated successfully");
    load();
  };

  const markAdminLeave = async (userId: string, dateStr: string) => {
    const reason = prompt(`Enter leave reason for ${dateStr}:`);
    if (!reason) return;
    await (supabase as any).from("attendance").upsert({
      user_id: userId, date: dateStr, status: 'leave_approved', leave_reason: 'Admin: ' + reason
    }, { onConflict: 'user_id, date' });
    toast.success("Leave marked");
    load();
  };

  const pendingLeaves = logs.filter(l => l.status === 'leave_pending');
  const [yearStr, monthStr] = month.split("-");
  const daysInMonth = new Date(Number(yearStr), Number(monthStr), 0).getDate();

  const addHoliday = async () => {
    if (!newHolDate || !newHolName) return toast.error("Date & Name required");
    const { error } = await supabase.from("company_holidays").insert({ date: newHolDate, name: newHolName });
    if (error) return toast.error(error.message);
    toast.success("Holiday added!");
    setNewHolDate(""); setNewHolName("");
    load();
  };

  const delHoliday = async (id: string) => {
    const { error } = await supabase.from("company_holidays").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Holiday removed!");
    load();
  };

  return (
    <AdminLayout title="Attendance & HR">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-4">
          <div>
            <Label>Select Month</Label>
            <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-48 mt-1.5 bg-card" />
          </div>
        </div>
        <Button variant="outline" className="rounded-full shadow-sm" onClick={() => setHolOpen(true)}><Palmtree className="h-4 w-4 mr-2 text-emerald-600"/> Manage Holidays</Button>
      </div>

      <Tabs defaultValue="payroll">
        <TabsList className="mb-4 bg-card border border-border/50 h-auto p-1.5 rounded-2xl">
          <TabsTrigger value="payroll" className="rounded-xl px-4 py-2"><Calculator className="h-4 w-4 mr-2"/> Payroll & Overview</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-xl px-4 py-2"><CalendarClock className="h-4 w-4 mr-2"/> Daily Logs</TabsTrigger>
          <TabsTrigger value="leaves" className="rounded-xl px-4 py-2 text-orange-600 data-[state=active]:text-orange-600"><CalendarCheck2 className="h-4 w-4 mr-2"/> Leave Requests {pendingLeaves.length > 0 && <span className="ml-1.5 bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full text-xs">{pendingLeaves.length}</span>}</TabsTrigger>
        </TabsList>

        <TabsContent value="payroll" className="mt-0">
          <div className="rounded-3xl border border-border/50 bg-card/50 overflow-x-auto shadow-sm backdrop-blur-xl">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-muted/40 text-xs text-muted-foreground border-b border-border/50"><tr><th className="text-left p-4">Employee</th><th className="text-right p-4">Monthly Salary</th><th className="text-right p-4">Days Present</th><th className="text-right p-4">Earned (This Month)</th><th className="text-right p-4">Paid via Expenses</th><th className="text-right p-4">Outstanding</th></tr></thead>
              <tbody className="divide-y divide-border/50">
                {payroll.map(p => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium text-accent hover:underline cursor-pointer" onClick={() => { setEmpData(p); setEmpOpen(true); }} title="View Calendar">{p.name}</td>
                    <td className="p-4 text-right">{fmtINR(p.monthlySalary)}</td><td className="p-4 text-right font-semibold text-blue-600">{p.daysPresent} days</td><td className="p-4 text-right">{fmtINR(p.earned)}</td><td className="p-4 text-right text-emerald-600 font-semibold">{fmtINR(p.paid)}</td><td className="p-4 text-right font-bold text-destructive">{fmtINR(p.outstanding)}</td>
                  </tr>
                ))}
                {payroll.length === 0 && !loading && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No payroll data for this month.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-0">
          <div className="rounded-3xl border border-border/50 bg-card/50 overflow-x-auto shadow-sm backdrop-blur-xl">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-muted/40 text-xs text-muted-foreground border-b border-border/50"><tr><th className="text-left p-4">Date</th><th className="text-left p-4">Employee</th><th className="text-left p-4">Punch In</th><th className="text-left p-4">Punch Out</th><th className="text-left p-4">Status</th><th className="text-right p-4">Total Hours</th></tr></thead>
              <tbody className="divide-y divide-border/50">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">{new Date(l.date).toLocaleDateString('en-GB')}</td><td className="p-4 font-medium">{l.profiles?.display_name}</td>
                    <td className="p-4">{l.punch_in ? (<div className="flex items-center gap-2"><span className="text-emerald-600 font-medium">{new Date(l.punch_in).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</span>{l.punch_in_loc && <a href={l.punch_in_loc} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700" title="View on Map"><MapPin className="h-4 w-4"/></a>}</div>) : "—"}</td>
                    <td className="p-4">{l.punch_out ? (<div className="flex items-center gap-2"><span className="text-orange-600 font-medium">{new Date(l.punch_out).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</span>{l.punch_out_loc && <a href={l.punch_out_loc} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700" title="View on Map"><MapPin className="h-4 w-4"/></a>}</div>) : <span className="text-muted-foreground text-xs italic">Working/None</span>}</td>
                    <td className="p-4 capitalize"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${l.status === 'leave_approved' ? 'bg-purple-500/10 text-purple-600' : l.status === 'leave_pending' ? 'bg-orange-500/10 text-orange-600' : 'bg-muted text-muted-foreground'}`}>{(l.status || 'unknown').replace('_', ' ')}</span></td>
                    <td className="p-4 text-right font-semibold">{l.total_hours ? `${l.total_hours} hrs` : "—"}</td>
                  </tr>
                ))}
                {logs.length === 0 && !loading && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No attendance logs found.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="leaves" className="mt-0">
          <div className="rounded-3xl border border-border/50 bg-card/50 overflow-x-auto shadow-sm backdrop-blur-xl">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-muted/40 text-xs text-muted-foreground border-b border-border/50"><tr><th className="text-left p-4">Employee</th><th className="text-left p-4">Leave Date</th><th className="text-left p-4">Reason</th><th className="text-right p-4">Action</th></tr></thead>
              <tbody className="divide-y divide-border/50">
                {pendingLeaves.map(l => (
                  <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{l.profiles?.display_name}</td>
                    <td className="p-4 font-mono text-xs">{new Date(l.date).toLocaleDateString('en-GB')}</td>
                    <td className="p-4 text-muted-foreground">{l.leave_reason}</td>
                    <td className="p-4 text-right space-x-2">
                      <Button size="sm" onClick={() => updateLeave(l.id, 'leave_approved')} className="bg-green-600 hover:bg-green-700 h-8 text-xs rounded-full"><CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => updateLeave(l.id, 'leave_rejected')} className="h-8 text-xs rounded-full"><XCircle className="h-3.5 w-3.5 mr-1" /> Reject</Button>
                    </td>
                  </tr>
                ))}
                {pendingLeaves.length === 0 && !loading && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No pending leave requests. 🎉</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={empOpen} onOpenChange={setEmpOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{empData?.name}'s Attendance Summary — {new Date(`${month}-01`).toLocaleDateString('en-GB', {month: 'long', year: 'numeric'})}</DialogTitle></DialogHeader>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-destructive/5 border border-destructive/20 rounded-2xl">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-destructive/80">Outstanding Salary</div>
              <div className="font-display text-2xl font-bold text-destructive">{fmtINR(empData?.outstanding)}</div>
            </div>
            <div className="text-sm text-right mt-2 sm:mt-0">
               <div>Earned: <span className="font-semibold">{fmtINR(empData?.earned)}</span> ({empData?.daysPresent} Days)</div>
               <div>Paid (Expenses): <span className="font-semibold text-emerald-600">{fmtINR(empData?.paid)}</span></div>
            </div>
          </div>

          {(() => {
            let p = 0, a = 0, l = 0;
            Array.from({length: daysInMonth}).forEach((_, i) => {
              const d = `${month}-${String(i+1).padStart(2, '0')}`;
              const log = logs.find(lg => lg.user_id === empData?.id && lg.date === d);
              const isHol = holidays.find(h => h.date === d);
              if (log) {
                 if (log.status?.includes('leave')) l++;
                 else if (log.punch_in || log.status === 'present') p++;
              } else if (!isHol && new Date(d) < new Date(new Date().toISOString().slice(0, 10))) {
                 a++;
              }
            });
            return (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                <div className="bg-card border border-border/50 rounded-xl p-3 text-center shadow-sm"><div className="text-xs text-muted-foreground uppercase">Total Days</div><div className="font-bold text-lg">{daysInMonth}</div></div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center shadow-sm"><div className="text-xs text-green-700 uppercase">Present</div><div className="font-bold text-lg text-green-700">{p}</div></div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center shadow-sm"><div className="text-xs text-red-700 uppercase">Absent</div><div className="font-bold text-lg text-red-700">{a}</div></div>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center shadow-sm"><div className="text-xs text-orange-700 uppercase">On Leave</div><div className="font-bold text-lg text-orange-700">{l}</div></div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center shadow-sm"><div className="text-xs text-purple-700 uppercase">Holidays</div><div className="font-bold text-lg text-purple-700">{holidays.length}</div></div>
              </div>
            );
          })()}

          <div className="mt-6 grid grid-cols-4 sm:grid-cols-7 gap-3">
             {Array.from({length: daysInMonth}).map((_, i) => {
                const d = `${month}-${String(i+1).padStart(2, '0')}`;
                const log = logs.find(l => l.user_id === empData?.id && l.date === d);
                const hol = holidays.find(h => h.date === d);
                const isPast = new Date(d) < new Date(new Date().toISOString().slice(0, 10));
                
                let statusLabel = "—";
                let badgeColor = "bg-card text-foreground border-border/50";
                let dotColor = "bg-transparent";

                if (log) {
                   if (log.status === 'leave_approved') { statusLabel = "On Leave"; badgeColor = "bg-purple-500/10 text-purple-700 border-purple-500/30"; dotColor = "bg-purple-500"; }
                   else if (log.status === 'leave_pending') { statusLabel = "Leave Pending"; badgeColor = "bg-orange-500/10 text-orange-700 border-orange-500/30"; dotColor = "bg-orange-500"; }
                   else if (log.status === 'leave_rejected') { statusLabel = "Leave Rejected"; badgeColor = "bg-red-500/10 text-red-700 border-red-500/30"; dotColor = "bg-red-500"; }
                   else if (log.punch_in || log.status === 'present') { statusLabel = "Present"; badgeColor = "bg-green-500/10 text-green-700 border-green-500/30"; dotColor = "bg-green-500"; }
                } else if (hol) {
                   statusLabel = "Holiday: " + hol.name; badgeColor = "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"; dotColor = "bg-emerald-500";
                } else if (isPast) {
                   statusLabel = "Absent"; badgeColor = "bg-red-500/10 text-red-700 border-red-500/30"; dotColor = "bg-red-500";
                }

                const canMarkLeave = !log?.punch_in && statusLabel !== "On Leave" && statusLabel !== "Leave Pending" && !hol;

                return (
                   <div 
                     key={d} 
                     onClick={() => canMarkLeave ? markAdminLeave(empData.id, d) : undefined}
                     className={`group relative aspect-square flex flex-col items-center justify-center rounded-[10px] border transition-all hover:scale-105 shadow-sm hover:shadow-md ${badgeColor} ${canMarkLeave ? 'cursor-pointer hover:border-orange-500/50' : 'cursor-default'}`}
                   >
                      <span className="font-bold text-xl">{i+1}</span>
                      <span className={`h-1.5 w-1.5 rounded-full mt-1.5 ${dotColor}`}></span>

                      <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-3 w-max max-w-[240px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col bg-foreground text-background text-xs p-3 rounded-xl shadow-xl pointer-events-none text-left">
                         <span className="font-semibold border-b border-background/20 pb-1.5 mb-1.5">{new Date(d).toDateString()}</span>
                         <span className="font-medium text-background/90">{statusLabel}</span>
                         {log?.total_hours ? <span className="mt-1 text-background/80">Logged: {log.total_hours} hrs</span> : null}
                         
                         {log?.punch_in && <span className="mt-1 text-green-400">In: {new Date(log.punch_in).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</span>}
                         {log?.punch_out && <span className="mt-0.5 text-orange-400">Out: {new Date(log.punch_out).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</span>}

                         {log?.leave_reason ? <span className="mt-1 italic text-background/70 break-words">"{log.leave_reason}"</span> : null}
                         {log?.admin_remarks ? <span className="mt-1 text-orange-400">Admin: {log.admin_remarks}</span> : null}
                         {canMarkLeave && <span className="mt-1.5 text-orange-300 font-medium">👉 Click to Mark Leave</span>}

                         <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-foreground"></div>
                      </div>
                   </div>
                );
             })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={holOpen} onOpenChange={setHolOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Manage Company Holidays</DialogTitle></DialogHeader>
          <div className="bg-muted/30 border border-border/50 rounded-xl p-4 flex gap-3 items-end">
            <div className="flex-1"><Label>Date</Label><Input type="date" value={newHolDate} onChange={e=>setNewHolDate(e.target.value)} className="mt-1" /></div>
            <div className="flex-[2]"><Label>Holiday Name</Label><Input value={newHolName} onChange={e=>setNewHolName(e.target.value)} placeholder="e.g. Diwali" className="mt-1" /></div>
            <Button onClick={addHoliday} className="bg-foreground text-background">Add</Button>
          </div>
          <div className="mt-4 border border-border/50 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs"><tr><th className="p-3">Date</th><th className="p-3">Holiday Name</th><th className="p-3"></th></tr></thead>
              <tbody className="divide-y divide-border/50">
                {holidays.map(h => (
                  <tr key={h.id}>
                    <td className="p-3 font-medium">{new Date(h.date).toLocaleDateString('en-GB')}</td>
                    <td className="p-3">{h.name}</td>
                    <td className="p-3 text-right"><Button variant="ghost" size="icon" onClick={()=>delHoliday(h.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></td>
                  </tr>
                ))}
                {holidays.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground text-xs">No holidays set for this month.</td></tr>}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}