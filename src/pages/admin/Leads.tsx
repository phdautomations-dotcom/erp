import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate } from "@/lib/format";
import { toast } from "sonner";

const STATUSES = ["new", "contacted", "quoted", "won", "lost"] as const;

export default function Leads() {
  const [search] = useSearchParams();
  // Drill-down from the Dashboard's "New leads" tile.
  const statusFilter = search.get("status") || "";
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const filtered = rows.filter(l => !statusFilter || l.status === statusFilter);

  // No search: only the most recent 50 leads (a quick recent view, not a
  // full dump). With a search: a server-side query across name, company,
  // phone, email, and machine type.
  const load = async () => {
    const term = q.trim();
    if (term) {
      const needle = `%${term}%`;
      const { data } = await supabase.from("leads")
        .select("*")
        .or(`name.ilike.${needle},company.ilike.${needle},phone.ilike.${needle},email.ilike.${needle},machine_type.ilike.${needle}`)
        .order("created_at", { ascending: false })
        .limit(100);
      setRows(data || []);
    } else {
      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(50);
      setRows(data || []);
    }
  };
  useEffect(() => { document.title = "Leads | ASTA One"; }, []);
  // Debounce the search query so it doesn't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q]);

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
      {statusFilter && (
        <div className="flex items-center justify-between gap-3 mb-4 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-2.5">
          <span className="text-sm font-medium text-accent capitalize">Showing only "{statusFilter}" leads — from the Dashboard tile.</span>
          <Link to="/admin/leads" className="text-xs font-semibold text-accent underline underline-offset-2 shrink-0">Clear filter</Link>
        </div>
      )}
      <div className="relative max-w-sm mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, company, phone, email" className="pl-9 rounded-full border-border/50 bg-muted/40 shadow-sm" />
      </div>
      {/* Mobile: stacked cards — no horizontal scrolling */}
      <div className="md:hidden space-y-3">
        {filtered.map(l => (
          <div key={l.id} className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
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
        {filtered.length === 0 && <p className="p-8 text-center text-muted-foreground">{q ? "No leads match your search" : "No leads yet. Submissions from the website appear here."}</p>}
      </div>

      <div className="hidden md:block overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/30 text-xs font-medium text-muted-foreground"><tr><th className="px-6 py-4 text-left">Date</th><th className="px-6 py-4 text-left">Name</th><th className="px-6 py-4 text-left">Company</th><th className="px-6 py-4 text-left">Contact</th><th className="px-6 py-4 text-left">Machine</th><th className="px-6 py-4 text-left">Status</th><th className="px-6 py-4"></th></tr></thead>
            <tbody className="divide-y divide-border/50">
            {filtered.map(l => (
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
            {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{q ? "No leads match your search" : "No leads yet. Submissions from the website appear here."}</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </AdminLayout>
  );
}
