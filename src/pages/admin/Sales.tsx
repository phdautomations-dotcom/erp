import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, FileText, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtINR } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/components/ConfirmDialogProvider";
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
  const confirm = useConfirm();
  const nav = useNavigate();

  // Reset type when switching between Sales and Purchases
  useEffect(() => {
    if (!types.includes(type as any)) {
      setType(types[0]);
    }
  }, [purchase, type, types]);

  const load = async () => {
    if (!types.includes(type as any)) return; // Wait for the type to update before fetching
    const { data } = await supabase.from("documents")
      .select("*, parties(name)").eq("doc_type", type as any).order("doc_date", { ascending: false });
    setRows(data || []);
  };
  useEffect(() => { document.title = `${purchase ? "Purchases" : "Sales"} | PHD ERP`; load(); }, [type, purchase]);

  const del = async (id: string) => {
    if (!(await confirm("Delete this document?"))) return;
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <AdminLayout title={purchase ? "Purchases" : "Sales"}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <Tabs value={type} onValueChange={setType}>
          <TabsList>{types.map(t => <TabsTrigger key={t} value={t} className="capitalize">{t.replace("_", " ")}</TabsTrigger>)}</TabsList>
        </Tabs>
        <Button className="rounded-full btn-gradient" onClick={() => nav(`/admin/${purchase ? "purchases" : "sales"}/new?type=${type}`)}>
          <Plus className="h-4 w-4 mr-1" /> New {type.replace("_", " ")}
        </Button>
      </div>
      {/* Mobile: stacked cards — no horizontal scrolling */}
      <div className="md:hidden space-y-3">
        {rows.map(d => (
          <div key={d.id} className="rounded-2xl border border-border/50 bg-card/50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{(d.parties as any)?.name}</p>
                <Link to={`/admin/${purchase ? "purchases" : "sales"}/${d.id}`} className="font-mono text-xs text-accent">{d.doc_number}</Link>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">{fmtINR(d.total)}</p>
                <p className="text-xs text-muted-foreground">Paid: {fmtINR(d.paid)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{d.doc_date}</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium capitalize ${
                  d.status === 'paid' ? 'bg-green-500/10 text-green-600' :
                  d.status === 'partial' ? 'bg-orange-500/10 text-orange-600' :
                  'bg-muted text-muted-foreground'
                }`}>{d.status}</span>
              </div>
              <div className="flex items-center">
                <Link to={`/admin/${purchase ? "purchases" : "sales"}/${d.id}`}><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></Link>
                {hasRole("admin") && <Button variant="ghost" size="icon" onClick={() => del(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="p-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mx-auto">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">No documents found</p>
          </div>
        )}
      </div>

      <div className="hidden md:block overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
            <tr>
                <th className="px-6 py-4 text-left">Date</th><th className="px-6 py-4 text-left">Number</th><th className="px-6 py-4 text-left">Party</th>
                <th className="px-6 py-4 text-right">Total</th><th className="px-6 py-4 text-right">Paid</th><th className="px-6 py-4 text-left">Status</th><th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-border/50">
            {rows.map(d => (
                <tr key={d.id} className="transition-colors hover:bg-muted/30">
                  <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{d.doc_date}</td>
                  <td className="px-6 py-4 font-mono text-xs"><Link to={`/admin/${purchase ? "purchases" : "sales"}/${d.id}`} className="font-medium transition-colors hover:text-accent">{d.doc_number}</Link></td>
                  <td className="px-6 py-4 font-medium">{(d.parties as any)?.name}</td>
                  <td className="px-6 py-4 text-right font-semibold">{fmtINR(d.total)}</td>
                  <td className="px-6 py-4 text-right text-muted-foreground">{fmtINR(d.paid)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      d.status === 'paid' ? 'bg-green-500/10 text-green-600' :
                      d.status === 'partial' ? 'bg-orange-500/10 text-orange-600' :
                      'bg-muted text-muted-foreground'
                    }`}>{d.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                  <Link to={`/admin/${purchase ? "purchases" : "sales"}/${d.id}`}><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></Link>
                  {hasRole("admin") && <Button variant="ghost" size="icon" onClick={() => del(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </td>
              </tr>
            ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mx-auto">
                      <FileText className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No documents found</p>
                  </td>
                </tr>
              )}
          </tbody>
        </table>
        </div>
      </div>
    </AdminLayout>
  );
}
