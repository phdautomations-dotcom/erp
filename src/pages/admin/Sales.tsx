import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, FileText, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtINR } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const SALES_TYPES = ["invoice", "quotation", "proforma", "challan"] as const;
type DocType = typeof SALES_TYPES[number];

export default function Sales({ purchase = false }: { purchase?: boolean }) {
  const types = purchase ? (["purchase_bill", "purchase_order"] as const) : SALES_TYPES;
  const [search] = useSearchParams();
  const initialType = (search.get("type") as DocType) || types[0];
  const [type, setType] = useState<string>(initialType);
  const [rows, setRows] = useState<any[]>([]);
  const { hasRole } = useAuth();
  const nav = useNavigate();

  const load = async () => {
    const { data } = await supabase.from("documents")
      .select("*, parties(name)").eq("doc_type", type as any).order("doc_date", { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { document.title = `${purchase ? "Purchases" : "Sales"} | PHD ERP`; load(); }, [type]);

  const del = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <AdminLayout title={purchase ? "Purchases" : "Sales"}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <Tabs value={type} onValueChange={setType}>
          <TabsList>{types.map(t => <TabsTrigger key={t} value={t} className="capitalize">{t.replace("_", " ")}</TabsTrigger>)}</TabsList>
        </Tabs>
        <Button className="rounded-full bg-foreground text-background hover:bg-foreground/90" onClick={() => nav(`/admin/${purchase ? "purchases" : "sales"}/new?type=${type}`)}>
          <Plus className="h-4 w-4 mr-1" /> New {type.replace("_", " ")}
        </Button>
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left p-3">Date</th><th className="text-left">Number</th><th className="text-left">Party</th>
              <th className="text-right">Total</th><th className="text-right">Paid</th><th className="text-left">Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(d => (
              <tr key={d.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3">{d.doc_date}</td>
                <td className="font-mono text-xs"><Link to={`/admin/${purchase ? "purchases" : "sales"}/${d.id}`} className="hover:underline">{d.doc_number}</Link></td>
                <td>{(d.parties as any)?.name}</td>
                <td className="text-right">{fmtINR(d.total)}</td>
                <td className="text-right">{fmtINR(d.paid)}</td>
                <td><span className="inline-flex rounded-full px-2 py-0.5 text-xs bg-muted capitalize">{d.status}</span></td>
                <td className="text-right p-3">
                  <Link to={`/admin/${purchase ? "purchases" : "sales"}/${d.id}`}><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></Link>
                  {hasRole("admin") && <Button variant="ghost" size="icon" onClick={() => del(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground"><FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />No documents.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
