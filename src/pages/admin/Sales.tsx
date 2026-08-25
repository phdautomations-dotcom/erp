import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, FileText, Eye, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtINR } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/components/ConfirmDialogProvider";
import { toast } from "sonner";

const SALES_TYPES = ["invoice", "quotation", "proforma", "challan"] as const;
type DocType = typeof SALES_TYPES[number];

const PAGE_SIZE = 30;

// A shimmering placeholder row — shown while a page is loading (first load
// or an infinite-scroll fetch), so the list never sits on a bare spinner.
const SkeletonCard = () => (
  <div className="rounded-2xl border border-border/50 bg-card/50 p-4 shadow-sm relative overflow-hidden">
    <div className="flex items-start justify-between gap-2">
      <div className="space-y-2 flex-1 max-w-[60%]">
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-16 rounded bg-muted ml-auto" />
        <div className="h-3 w-12 rounded bg-muted ml-auto" />
      </div>
    </div>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
  </div>
);

const SkeletonRow = () => (
  <tr>
    <td colSpan={7} className="p-0">
      <div className="relative overflow-hidden px-6 py-4">
        <div className="flex items-center gap-6">
          <div className="h-4 w-20 rounded bg-muted shrink-0" />
          <div className="h-4 w-24 rounded bg-muted shrink-0" />
          <div className="h-4 flex-1 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted shrink-0" />
          <div className="h-4 w-16 rounded bg-muted shrink-0" />
          <div className="h-4 w-16 rounded-full bg-muted shrink-0" />
        </div>
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      </div>
    </td>
  </tr>
);

export default function Sales({ purchase = false }: { purchase?: boolean }) {
  const types = purchase ? (["purchase_bill", "purchase_order"] as const) : SALES_TYPES;
  const [search] = useSearchParams();
  const initialType = (search.get("type") as DocType) || types[0];
  const [type, setType] = useState<string>(initialType);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { hasRole } = useAuth();
  const confirm = useConfirm();
  const nav = useNavigate();

  // Reset type when switching between Sales and Purchases
  useEffect(() => {
    if (!types.includes(type as any)) {
      setType(types[0]);
    }
  }, [purchase, type, types]);

  // Documents load a page at a time (30 rows) via infinite scroll instead of
  // one big fetch — with thousands of documents, downloading everything (or
  // even a flat "first 50") up front is wasteful when a user usually only
  // looks at the first screenful. Scrolling near the bottom fetches the next
  // page. A search term runs the same paged query server-side across
  // doc_number/party/status, so older documents are still reachable.
  const fetchPage = async (pageNum: number, term: string) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    if (term) {
      const needle = `%${term}%`;
      // This Supabase project's PostgREST rejects a joined table's column
      // (e.g. parties.name) referenced inside .or() — it only accepts the
      // embedded-resource dot-path as a plain AND filter, never inside a
      // logic tree (confirmed against the live API: PGRST100 "failed to
      // parse logic tree" on every dot-path/wildcard variant tried). So we
      // resolve matching party ids first, then OR them in via party_id.in().
      const { data: matchingParties } = await supabase.from("parties").select("id").ilike("name", needle).limit(50);
      const partyIds = (matchingParties || []).map((p: any) => p.id);
      const orParts = [`doc_number.ilike.${needle}`, `status.ilike.${needle}`];
      if (partyIds.length) orParts.push(`party_id.in.(${partyIds.join(",")})`);
      return supabase.from("documents")
        .select("*, parties(name)")
        .eq("doc_type", type as any)
        .or(orParts.join(","))
        .order("doc_date", { ascending: false })
        .range(from, to);
    }
    return supabase.from("documents")
      .select("*, parties(name)")
      .eq("doc_type", type as any)
      .order("doc_date", { ascending: false })
      .range(from, to);
  };

  const loadFirstPage = async () => {
    if (!types.includes(type as any)) return; // Wait for the type to update before fetching
    setLoadingMore(true);
    const { data } = await fetchPage(0, q.trim());
    setRows(data || []);
    setPage(0);
    setHasMore((data || []).length === PAGE_SIZE);
    setLoadingMore(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const { data } = await fetchPage(nextPage, q.trim());
    setRows(prev => [...prev, ...(data || [])]);
    setPage(nextPage);
    setHasMore((data || []).length === PAGE_SIZE);
    setLoadingMore(false);
  };

  useEffect(() => { document.title = `${purchase ? "Purchases" : "Sales"} | PHD ERP`; }, [purchase]);
  // Debounce the search query so it doesn't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(loadFirstPage, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [type, purchase, q]);

  // Fetch the next page once the sentinel at the bottom of the list scrolls
  // into view. rootMargin gives it a head start before the user hits the
  // literal bottom, so the next page is usually ready before they get there.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: "300px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [page, hasMore, loadingMore, type, q]);

  const del = async (id: string) => {
    if (!(await confirm("Delete this document?"))) return;
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); loadFirstPage(); }
  };

  const filtered = rows;

  return (
    <AdminLayout title={purchase ? "Purchases" : "Sales"}>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Tabs value={type} onValueChange={setType}>
          <TabsList>{types.map(t => <TabsTrigger key={t} value={t} className="capitalize">{t.replace("_", " ")}</TabsTrigger>)}</TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by number, party, status" className="pl-9 rounded-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm" />
        </div>
        <Button className="rounded-full btn-gradient ml-auto" onClick={() => nav(`/admin/${purchase ? "purchases" : "sales"}/new?type=${type}`)}>
          <Plus className="h-4 w-4 mr-1" /> New {type.replace("_", " ")}
        </Button>
      </div>
      {/* Mobile: stacked cards — no horizontal scrolling */}
      <div className="md:hidden space-y-3">
        {filtered.map(d => (
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
        {loadingMore && <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>}
        {filtered.length === 0 && !loadingMore && (
          <div className="p-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mx-auto">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground">{q ? "No documents match your search" : "No documents found"}</p>
          </div>
        )}
        {hasMore && <div ref={sentinelRef} className="h-1" />}
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
            {filtered.map(d => (
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
              {loadingMore && <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>}
              {filtered.length === 0 && !loadingMore && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mx-auto">
                      <FileText className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{q ? "No documents match your search" : "No documents found"}</p>
                  </td>
                </tr>
              )}
          </tbody>
        </table>
        </div>
        {hasMore && <div ref={sentinelRef} className="h-1" />}
      </div>
    </AdminLayout>
  );
}
