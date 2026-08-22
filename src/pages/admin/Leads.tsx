import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate } from "@/lib/format";
import { toast } from "sonner";

const STATUSES = ["new", "contacted", "quoted", "won", "lost"] as const;

export default function Leads() {
  const [rows, setRows] = useState<any[]>([]);
  const nav = useNavigate();
  const load = async () => { const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false }); setRows(data || []); };
  useEffect(() => { document.title = "Leads | PHD ERP"; load(); }, []);

  const updateStatus = async (id: string, status: any) => {
    await supabase.from("leads").update({ status }).eq("id", id); load();
  };

  const convert = async (l: any) => {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("parties").insert({
      name: l.company || l.name, type: "customer", phone: l.phone, email: l.email, contact_person: l.name, notes: l.message, created_by: u.user?.id,
    }).select().single();
    if (error) return toast.error(error.message);
    await supabase.from("leads").update({ status: "quoted" }).eq("id", l.id);
    toast.success("Converted to party");
    nav(`/admin/sales/new?type=quotation`);
  };

  return (
    <AdminLayout title="Leads">
      {/* Mobile: stacked cards — no horizontal scrolling */}
      <div className="md:hidden space-y-3">
        {rows.map(l => (
          <div key={l.id} className="rounded-2xl border border-border/50 bg-card/50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{l.name}</p>
                <p className="text-xs text-muted-foreground truncate">{l.company}</p>
              </div>
              <p className="text-xs text-muted-foreground shrink-0">{fmtDate(l.created_at)}</p>
            </div>
            <div className="mt-2 text-xs">
              <p className="font-medium">{l.phone}</p>
              <p className="text-muted-foreground">{l.email}</p>
              {l.machine_type && <p className="text-muted-foreground mt-0.5">Machine: {l.machine_type}</p>}
            </div>
            <div className="flex items-center justify-between mt-3 gap-2">
              <Select value={l.status} onValueChange={(v) => updateStatus(l.id, v)}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => convert(l)} className="rounded-full shadow-sm hover:shadow-md transition-all duration-300">Convert</Button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="p-8 text-center text-muted-foreground">No leads yet. Submissions from the website appear here.</p>}
      </div>

      <div className="hidden md:block overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/30 text-xs font-medium text-muted-foreground"><tr><th className="px-6 py-4 text-left">Date</th><th className="px-6 py-4 text-left">Name</th><th className="px-6 py-4 text-left">Company</th><th className="px-6 py-4 text-left">Contact</th><th className="px-6 py-4 text-left">Machine</th><th className="px-6 py-4 text-left">Status</th><th className="px-6 py-4"></th></tr></thead>
            <tbody className="divide-y divide-border/50">
            {rows.map(l => (
                <tr key={l.id} className="transition-colors hover:bg-muted/30 align-top">
                  <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{fmtDate(l.created_at)}</td>
                  <td className="px-6 py-4 font-medium">{l.name}</td><td className="px-6 py-4">{l.company}</td>
                  <td className="px-6 py-4"><div className="text-xs font-medium">{l.phone}</div><div className="text-xs text-muted-foreground">{l.email}</div></td>
                  <td className="px-6 py-4 text-muted-foreground">{l.machine_type}</td>
                  <td className="px-6 py-4">
                  <Select value={l.status} onValueChange={(v) => updateStatus(l.id, v)}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                  <td className="px-6 py-4 text-right"><Button size="sm" variant="outline" onClick={() => convert(l)} className="rounded-full shadow-sm hover:shadow-md transition-all duration-300">Convert</Button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No leads yet. Submissions from the website appear here.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </AdminLayout>
  );
}
