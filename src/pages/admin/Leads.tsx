import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtINR } from "@/lib/format";
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
      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/40 text-xs"><tr><th className="text-left p-3">Date</th><th className="text-left">Name</th><th className="text-left">Company</th><th className="text-left">Contact</th><th className="text-left">Machine</th><th className="text-left">Status</th><th></th></tr></thead>
          <tbody>
            {rows.map(l => (
              <tr key={l.id} className="border-t border-border align-top">
                <td className="p-3 whitespace-nowrap">{new Date(l.created_at).toLocaleDateString()}</td>
                <td>{l.name}</td><td>{l.company}</td>
                <td><div className="text-xs">{l.phone}</div><div className="text-xs text-muted-foreground">{l.email}</div></td>
                <td>{l.machine_type}</td>
                <td>
                  <Select value={l.status} onValueChange={(v) => updateStatus(l.id, v)}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="p-3"><Button size="sm" variant="outline" onClick={() => convert(l)}>Convert</Button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No leads yet. Submissions from the website appear here.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
