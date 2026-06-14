import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  MapPin, Phone, Wrench, CheckCircle, ArrowLeft, PenTool, LogOut, Calendar,
  FileText, WifiOff, RefreshCw, Map, Sparkles, Trash2, Clock, CalendarCheck2,
  Plus, Edit2, ShoppingCart, Receipt, BarChart3, TrendingUp, Search, X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fmtINR, fmtDate, calcLineTax, todayFY } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, type PermModule } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import logo from "@/assets/logo.png";

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_PREFIX: Record<string, string> = {
  invoice: "PHD/INV", quotation: "PHD/QTN", proforma: "PHD/PRO",
  challan: "PHD/CHL", purchase_bill: "PHD/PB", purchase_order: "PHD/PO",
};

const DOC_MODULE: Record<string, PermModule> = {
  invoice: "invoice", quotation: "quotation", proforma: "proforma",
  challan: "challan", purchase_bill: "purchase", purchase_order: "purchase",
};

const DOC_LABEL: Record<string, string> = {
  invoice: "Invoice", quotation: "Quotation", proforma: "Proforma Invoice",
  challan: "Delivery Challan", purchase_bill: "Purchase Bill", purchase_order: "Purchase Order",
};

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  paid:      "bg-green-100 text-green-700 border-green-200",
  partial:   "bg-blue-100 text-blue-700 border-blue-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const EXPENSE_CATEGORIES = ["Travel", "Office", "Tools", "Salaries", "Rent", "Utilities", "Marketing", "Misc"];
const PAYMENT_MODES      = ["cash", "upi", "bank_transfer", "cheque", "card"];
const GST_RATES          = [0, 5, 12, 18, 28];

const newLine = () => ({
  item_id: "", description: "", hsn_code: "", quantity: 1, unit: "Nos",
  rate: 0, discount_pct: 0, gst_rate: 18, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0,
});

// ─── Sub-components ───────────────────────────────────────────────────────────

const SignaturePad = ({ onSign }: { onSign: (s: string) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) { ctx.strokeStyle = "#000"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; }
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.beginPath(); ctx?.moveTo(pos.x, pos.y);
  };
  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.lineTo(pos.x, pos.y); ctx?.stroke();
  };
  const end = () => { setIsDrawing(false); onSign(canvasRef.current?.toDataURL("image/png") || ""); };
  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); onSign(""); }
  };

  return (
    <div className="space-y-2">
      <div className="border-2 border-dashed border-border rounded-xl overflow-hidden bg-white">
        <canvas ref={canvasRef} width={340} height={160} className="w-full h-[160px] cursor-crosshair touch-none"
          onPointerDown={start} onPointerMove={draw} onPointerUp={end} onPointerOut={end}
          style={{ touchAction: "none" }} />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={clear} className="w-full rounded-full">Clear Signature</Button>
    </div>
  );
};

function DocLineRow({ line, items, onChange, onRemove }: {
  line: any; items: any[]; onChange: (f: string, v: any) => void; onRemove: () => void;
}) {
  return (
    <div className="bg-secondary/20 rounded-2xl p-3 space-y-2 border border-border/30">
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={line.item_id || ""} onValueChange={(v) => {
            const item = items.find(i => i.id === v);
            if (item) {
              onChange("item_id", item.id);
              onChange("description", item.name);
              onChange("hsn_code", item.hsn_code || "");
              onChange("rate", +(item.sale_price || 0));
              onChange("gst_rate", +(item.gst_rate || 18));
              onChange("unit", item.unit || "Nos");
            }
          }}>
            <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue placeholder="Pick from catalog (optional)" /></SelectTrigger>
            <SelectContent className="max-h-60">
              {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full text-destructive hover:bg-destructive/10" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Input value={line.description} onChange={e => onChange("description", e.target.value)}
        placeholder="Description *" className="rounded-xl text-xs h-9 bg-background/50" />
      <div className="grid grid-cols-4 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Qty</Label>
          <Input type="number" min="0" value={line.quantity} onChange={e => onChange("quantity", e.target.value)}
            className="rounded-xl text-xs h-8 mt-0.5" />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Rate (₹)</Label>
          <Input type="number" min="0" value={line.rate} onChange={e => onChange("rate", e.target.value)}
            className="rounded-xl text-xs h-8 mt-0.5" />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">GST %</Label>
          <Select value={String(line.gst_rate)} onValueChange={v => onChange("gst_rate", v)}>
            <SelectTrigger className="h-8 rounded-xl text-xs mt-0.5"><SelectValue /></SelectTrigger>
            <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Total</Label>
          <div className="h-8 rounded-xl bg-secondary/60 flex items-center px-2 text-xs font-semibold mt-0.5">{fmtINR(line.total || 0)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function DocCardSkeleton() {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
          <Skeleton className="h-3 w-36 rounded-full" />
          <Skeleton className="h-3 w-20 rounded-full" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      </div>
      <div className="bg-muted/30 rounded-xl p-2.5 space-y-2">
        <div className="flex justify-between"><Skeleton className="h-3 w-32 rounded-full" /><Skeleton className="h-3 w-16 rounded-full" /></div>
        <div className="flex justify-between"><Skeleton className="h-3 w-24 rounded-full" /><Skeleton className="h-3 w-16 rounded-full" /></div>
      </div>
      <div className="flex justify-between items-center pt-1 border-t border-border/30">
        <Skeleton className="h-3 w-12 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

function BizLoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[1, 2, 3, 4, 5, 6].map(i => <DocCardSkeleton key={i} />)}
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ search, onSearch, month, onMonth, from, onFrom, to, onTo, onClear }: {
  search: string; onSearch: (v: string) => void;
  month: string; onMonth: (v: string) => void;
  from: string; onFrom: (v: string) => void;
  to: string; onTo: (v: string) => void;
  onClear: () => void;
}) {
  const hasFilter = !!(search || month || from || to);
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-3 mb-4 flex flex-wrap gap-2 items-center shadow-sm">
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search by party, number…"
          className="pl-9 h-9 rounded-xl text-sm bg-background/50" />
      </div>
      <input type="month" value={month}
        onChange={e => { onMonth(e.target.value); onFrom(""); onTo(""); }}
        className="h-9 rounded-xl border border-input bg-background/50 px-3 text-sm text-foreground"
        title="Filter by month" />
      <span className="text-xs text-muted-foreground hidden sm:inline">or</span>
      <Input type="date" value={from} onChange={e => { onFrom(e.target.value); onMonth(""); }}
        className="h-9 rounded-xl text-sm w-36 bg-background/50" placeholder="From" title="From date" />
      <Input type="date" value={to} onChange={e => { onTo(e.target.value); onMonth(""); }}
        className="h-9 rounded-xl text-sm w-36 bg-background/50" placeholder="To" title="To date" />
      {hasFilter && (
        <Button variant="ghost" size="icon" onClick={onClear} className="h-9 w-9 rounded-full shrink-0" title="Clear filters">
          <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EngineerApp() {
  // ── Service visits state (existing) ──
  const [visits, setVisits] = useState<any[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>({});
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectKey, setSelectKey] = useState(0);

  const totalBase  = selectedServices.reduce((s, sv) => s + Number(sv.sale_price || 0), 0);
  const totalGST   = selectedServices.reduce((s, sv) => s + (Number(sv.sale_price || 0) * Number(sv.gst_rate || 0) / 100), 0);
  const grandTotal = Math.round(totalBase + totalGST);

  // ── Offline / attendance state (existing) ──
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [attendance, setAttendance] = useState<any>(null);
  const [leaveForm, setLeaveForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [attHistory, setAttHistory] = useState<any[]>([]);
  const [histMonth, setHistMonth] = useState(new Date().toISOString().slice(0, 7));
  const [holidays, setHolidays] = useState<any[]>([]);

  // ── Business data (new) ──
  const [parties, setParties] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [myDocs, setMyDocs] = useState<any[]>([]);
  const [myExpenses, setMyExpenses] = useState<any[]>([]);
  const [bizLoading, setBizLoading] = useState(true);

  // ── Document sheet state (new) ──
  const [docSheet, setDocSheet] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [activeDocType, setActiveDocType] = useState("invoice");
  const [docForm, setDocForm] = useState<any>({
    party_id: "", doc_date: new Date().toISOString().slice(0, 10), notes: "", status: "draft",
  });
  const [docLines, setDocLines] = useState<any[]>([newLine()]);
  const [docBusy, setDocBusy] = useState(false);

  // ── Expense sheet state (new) ──
  const [expSheet, setExpSheet] = useState(false);
  const [editingExp, setEditingExp] = useState<any>(null);
  const [expForm, setExpForm] = useState<any>({
    expense_date: new Date().toISOString().slice(0, 10), category: "Office",
    mode: "cash", amount: "", description: "", paid_to: "",
  });
  const [expBusy, setExpBusy] = useState(false);

  // ── Sales / purchase sub-type selectors ──
  const [salesType, setSalesType] = useState("invoice");
  const [purchaseType, setPurchaseType] = useState("purchase_bill");

  // ── Reports state ──
  const [rptFrom, setRptFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [rptTo, setRptTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [rptDocs, setRptDocs] = useState<any[]>([]);
  const [rptExps, setRptExps] = useState<any[]>([]);
  const [rptLoading, setRptLoading] = useState(false);

  // ── Sales filters ──
  const [salesSearch, setSalesSearch] = useState("");
  const [salesMonth, setSalesMonth] = useState("");
  const [salesFrom, setSalesFrom] = useState("");
  const [salesTo, setSalesTo] = useState("");

  // ── Purchase filters ──
  const [purchSearch, setPurchSearch] = useState("");
  const [purchMonth, setPurchMonth] = useState("");
  const [purchFrom, setPurchFrom] = useState("");
  const [purchTo, setPurchTo] = useState("");

  // ── Expense filters ──
  const [expSearch, setExpSearch] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expFrom, setExpFrom] = useState("");
  const [expTo, setExpTo] = useState("");

  const { user, signOut, hasRole, roles } = useAuth();
  const { hasPerm, canViewAll, salesPerm, purchasePerm, expensesPerm, reportsPerm } = usePermissions();
  const nav = useNavigate();

  // ── Computed: doc line totals ──
  const docTotals = docLines.reduce(
    (acc, l) => ({
      subtotal: acc.subtotal + (+l.taxable || 0),
      cgst:     acc.cgst     + (+l.cgst    || 0),
      sgst:     acc.sgst     + (+l.sgst    || 0),
      total:    acc.total    + (+l.total   || 0),
    }),
    { subtotal: 0, cgst: 0, sgst: 0, total: 0 }
  );

  // ─────────────────────────── Load functions ────────────────────────────────

  const loadPendingVisits = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (!navigator.onLine) throw new Error("Offline");
      const { data, error } = await supabase
        .from("service_visits")
        .select("*, parties(name, phone, billing_address, map_url)")
        .in("status", ["scheduled", "in_progress"])
        .eq("engineer_user_id", user.id)
        .order("visit_date", { ascending: true });
      if (error) throw error;
      setVisits(data || []);
      localStorage.setItem(`engineer_visits_${user.id}`, JSON.stringify(data || []));
    } catch {
      const cached = localStorage.getItem(`engineer_visits_${user.id}`);
      if (cached) setVisits(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      if (!navigator.onLine) throw new Error("Offline");
      const { data } = await supabase.from("items").select("*").eq("type", "service").order("name");
      setServicesList(data || []);
      localStorage.setItem("engineer_services", JSON.stringify(data || []));
    } catch {
      const cached = localStorage.getItem("engineer_services");
      if (cached) setServicesList(JSON.parse(cached));
    }
  };

  const loadAttendance = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from("attendance").select("*").eq("user_id", user?.id).eq("date", today).maybeSingle();
    setAttendance(data);
  };

  const loadHistory = async () => {
    if (!user) return;
    const [y, m] = histMonth.split("-").map(Number);
    const start = `${histMonth}-01`, end = `${histMonth}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    const { data } = await supabase.from("attendance").select("*").eq("user_id", user.id).gte("date", start).lte("date", end).order("date", { ascending: false });
    setAttHistory(data || []);
    const { data: hols } = await (supabase as any).from("company_holidays").select("*").gte("date", start).lte("date", end);
    setHolidays(hols || []);
  };

  const loadBusinessData = async () => {
    if (!user) return;
    setBizLoading(true);
    // Sales docs: show all if any sales module has can_view_all, else filter by created_by
    const salesViewAll = canViewAll("invoice") || canViewAll("quotation") || canViewAll("proforma") || canViewAll("challan");
    const purchViewAll = canViewAll("purchase");
    const expViewAll   = canViewAll("expenses");

    const salesQuery = salesViewAll
      ? supabase.from("documents").select("*, parties(name), document_lines(*)").in("doc_type", ["invoice","quotation","proforma","challan"]).order("created_at", { ascending: false })
      : supabase.from("documents").select("*, parties(name), document_lines(*)").in("doc_type", ["invoice","quotation","proforma","challan"]).eq("created_by", user.id).order("created_at", { ascending: false });

    const purchQuery = purchViewAll
      ? supabase.from("documents").select("*, parties(name), document_lines(*)").in("doc_type", ["purchase_bill","purchase_order"]).order("created_at", { ascending: false })
      : supabase.from("documents").select("*, parties(name), document_lines(*)").in("doc_type", ["purchase_bill","purchase_order"]).eq("created_by", user.id).order("created_at", { ascending: false });

    const expQuery = expViewAll
      ? (supabase as any).from("expenses").select("*").order("expense_date", { ascending: false })
      : (supabase as any).from("expenses").select("*").eq("created_by", user.id).order("expense_date", { ascending: false });

    const [p, i, salesDocs, purchDocs, e] = await Promise.all([
      supabase.from("parties").select("id,name,state_code").order("name"),
      supabase.from("items").select("*").order("name"),
      salesQuery,
      purchQuery,
      expQuery,
    ]);
    setParties(p.data || []);
    setAllItems(i.data || []);
    setMyDocs([...(salesDocs.data || []), ...(purchDocs.data || [])]);
    setMyExpenses(e.data || []);
    setBizLoading(false);
  };

  const loadReports = async () => {
    if (!user) return;
    setRptLoading(true);
    const viewAll = canViewAll("reports");
    let docsQ = supabase.from("documents").select("*, parties(name, gstin, state, state_code), document_lines(*)").gte("doc_date", rptFrom).lte("doc_date", rptTo);
    let expsQ = (supabase as any).from("expenses").select("*").gte("expense_date", rptFrom).lte("expense_date", rptTo);
    if (!viewAll) {
      docsQ = docsQ.eq("created_by", user.id) as any;
      expsQ = expsQ.eq("created_by", user.id);
    }
    const [d, e] = await Promise.all([docsQ, expsQ]);
    setRptDocs(d.data || []);
    setRptExps(e.data || []);
    setRptLoading(false);
  };

  // ─────────────────────────── Sync offline ─────────────────────────────────

  const syncOfflineData = async () => {
    const queue = JSON.parse(localStorage.getItem("engineer_offline_queue") || "[]");
    if (!queue.length) return;
    setSyncing(true);
    toast.info(`Syncing ${queue.length} offline visit(s)...`);
    const failed: any[] = [];
    for (const item of queue) {
      const { error } = await supabase.from("service_visits").update(item.payload).eq("id", item.visitId);
      if (error) failed.push(item);
    }
    if (!failed.length) {
      localStorage.removeItem("engineer_offline_queue");
      toast.success("Offline data synced! 🎉");
    } else {
      localStorage.setItem("engineer_offline_queue", JSON.stringify(failed));
      toast.error(`${failed.length} item(s) failed to sync.`);
    }
    setSyncing(false);
    if (user) loadPendingVisits();
  };

  // ─────────────────────────── Effects ──────────────────────────────────────

  useEffect(() => {
    const onOnline  = () => { setIsOffline(false); syncOfflineData(); };
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    if (navigator.onLine) syncOfflineData();
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [user]);

  useEffect(() => {
    if (user && roles.length > 0 && !(roles as string[]).includes("admin") && !(roles as string[]).includes("engineer")) {
      toast.error("Unauthorized! Only Engineers and Admins can access this.");
      nav("/admin", { replace: true }); return;
    }
    document.title = "Engineer Workspace | PHD ERP";
    loadPendingVisits();
    loadServices();
    if (user) { loadAttendance(); loadHistory(); loadBusinessData(); }
  }, [user, roles, nav]);

  useEffect(() => { loadHistory(); }, [histMonth]);
  useEffect(() => { if (reportsPerm) loadReports(); }, [rptFrom, rptTo, reportsPerm]);

  // ─────────────────────────── Activity log ─────────────────────────────────

  const logActivity = async (action: string, entityType: string, entityId: string, entityLabel: string) => {
    if (!user) return;
    try {
      await (supabase as any).from("activity_logs").insert({
        user_id: user.id, action, entity_type: entityType, entity_id: entityId, entity_label: entityLabel,
      });
    } catch { /* silent – don't block main flow */ }
  };

  // ─────────────────────────── Handlers: visits ─────────────────────────────

  const openVisit = (visit: any) => {
    setSelectedVisit(visit);
    setSelectedServices([]);
    setForm({ work_description: visit.work_description || "", parts_used: visit.parts_used || "", signature_url: visit.signature_url || "" });
  };

  const completeVisit = async () => {
    if (!form.signature_url) return toast.error("Customer signature is required to complete the visit.");
    if (!form.work_description) return toast.error("Work description is required.");
    const svcDetails = selectedServices.map(s => `- ${s.name} (Base: ${fmtINR(s.sale_price)}, GST: ${s.gst_rate}%)`).join("\n");
    const updatedWorkDesc = form.work_description + (svcDetails ? `\n\nServices Billed:\n${svcDetails}` : "");
    const payload: any = { work_description: updatedWorkDesc, parts_used: form.parts_used, charges: grandTotal, signature_url: form.signature_url, status: "completed", is_verified: false };
    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem("engineer_offline_queue") || "[]");
      queue.push({ visitId: selectedVisit.id, payload });
      localStorage.setItem("engineer_offline_queue", JSON.stringify(queue));
      const newVisits = visits.filter(v => v.id !== selectedVisit.id);
      setVisits(newVisits);
      localStorage.setItem(`engineer_visits_${user?.id}`, JSON.stringify(newVisits));
      toast.success("Saved offline. Will sync when network is back! 📡");
      setSelectedVisit(null); return;
    }
    setBusy(true);
    const { error } = await supabase.from("service_visits").update(payload).eq("id", selectedVisit.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Service log submitted for verification! 🎉");
    setSelectedVisit(null); loadPendingVisits();
  };

  const handlePunch = async (type: "in" | "out") => {
    if (!navigator.geolocation) return toast.error("GPS not supported by browser");
    toast.info(`Fetching GPS for Punch ${type.toUpperCase()}...`);
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const loc = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
      const now  = new Date().toISOString();
      const today = now.slice(0, 10);
      if (type === "in") {
        const { data, error } = await (supabase as any).from("attendance").upsert({ user_id: user?.id, date: today, punch_in: now, punch_in_loc: loc, status: "present" }, { onConflict: "user_id, date" }).select().single();
        setBusy(false);
        if (error) return toast.error(error.message);
        toast.success("Punched In! 🟢"); setAttendance(data);
      } else {
        let hrs = 0;
        if (attendance?.punch_in) hrs = (new Date(now).getTime() - new Date(attendance.punch_in).getTime()) / 3_600_000;
        const { data, error } = await (supabase as any).from("attendance").update({ punch_out: now, punch_out_loc: loc, total_hours: +hrs.toFixed(2) }).eq("id", attendance.id).select().single();
        setBusy(false);
        if (error) return toast.error(error.message);
        toast.success("Punched Out! 🔴"); setAttendance(data);
      }
    }, (err) => { setBusy(false); toast.error("Could not get location: " + err.message); }, { enableHighAccuracy: true, maximumAge: 0 });
  };

  const applyLeave = async () => {
    if (!leaveForm.startDate || !leaveForm.reason) return toast.error("Start Date & Reason required");
    setBusy(true);
    const start = new Date(leaveForm.startDate);
    const end   = leaveForm.endDate ? new Date(leaveForm.endDate) : start;
    const payload: any[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      payload.push({ user_id: user?.id, date: d.toISOString().slice(0, 10), status: "leave_pending", leave_reason: leaveForm.reason });
    }
    const { error } = await (supabase as any).from("attendance").upsert(payload, { onConflict: "user_id, date" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Leave applied for ${payload.length} day(s)!`);
    setLeaveForm({ startDate: "", endDate: "", reason: "" }); loadHistory();
  };

  const handleLogout = async () => { await signOut(); nav("/auth"); };

  // ─────────────────────────── Handlers: documents ──────────────────────────

  const recalcLine = (line: any) => ({ ...line, ...calcLineTax(+line.quantity || 0, +line.rate || 0, +line.discount_pct || 0, +line.gst_rate || 0, false) });

  const updateDocLine = (idx: number, field: string, value: any) => {
    setDocLines(prev => { const next = [...prev]; next[idx] = recalcLine({ ...next[idx], [field]: value }); return next; });
  };

  const openNewDoc = (type: string) => {
    setEditingDoc(null); setActiveDocType(type);
    setDocForm({ party_id: "", doc_date: new Date().toISOString().slice(0, 10), notes: "", status: "draft" });
    setDocLines([newLine()]); setDocSheet(true);
  };

  const openEditDoc = async (doc: any) => {
    if (!hasPerm(DOC_MODULE[doc.doc_type], "can_view")) return toast.error("No permission to view this document.");
    setEditingDoc(doc); setActiveDocType(doc.doc_type);
    setDocForm({ party_id: doc.party_id || "", doc_date: doc.doc_date, notes: doc.notes || "", status: doc.status });
    const { data: lines } = await supabase.from("document_lines").select("*").eq("document_id", doc.id).order("position");
    setDocLines(lines?.length ? lines : [newLine()]);
    setDocSheet(true);
  };

  const saveDoc = async () => {
    if (!docForm.party_id) return toast.error("Party is required");
    const validLines = docLines.filter(l => (l.description || "").trim() && (+l.quantity > 0 || +l.rate > 0));
    if (!validLines.length) return toast.error("Add at least one line item with description");
    setDocBusy(true);
    try {
      const payload: any = {
        doc_type: activeDocType, party_id: docForm.party_id, doc_date: docForm.doc_date,
        notes: docForm.notes || "", status: docForm.status || "draft", is_igst: false,
        subtotal: +docTotals.subtotal.toFixed(2), discount: 0,
        cgst: +docTotals.cgst.toFixed(2), sgst: +docTotals.sgst.toFixed(2), igst: 0,
        round_off: 0, total: Math.round(docTotals.total), paid: editingDoc?.paid || 0,
        created_by: user?.id,
      };
      let docId: string, docNumber: string;
      if (editingDoc) {
        const { error } = await supabase.from("documents").update(payload).eq("id", editingDoc.id);
        if (error) throw error;
        docId = editingDoc.id; docNumber = editingDoc.doc_number;
        await supabase.from("document_lines").delete().eq("document_id", docId);
      } else {
        const fy = todayFY();
        const prefix = DOC_PREFIX[activeDocType] || "PHD/DOC";
        const { count } = await supabase.from("documents").select("*", { count: "exact", head: true }).eq("doc_type", activeDocType);
        docNumber = `${prefix}/${fy}/${String((count || 0) + 1).padStart(4, "0")}`;
        const { data: saved, error } = await supabase.from("documents").insert({ ...payload, doc_number: docNumber }).select().single();
        if (error) throw error;
        docId = saved.id;
      }
      const linePayloads = validLines.map((l, i) => ({
        document_id: docId, position: i, item_id: l.item_id || null,
        description: l.description, hsn_code: l.hsn_code || "",
        quantity: +l.quantity, unit: l.unit || "Nos",
        rate: +l.rate, discount_pct: +l.discount_pct || 0, gst_rate: +l.gst_rate,
        taxable: +l.taxable, cgst: +l.cgst, sgst: +l.sgst, igst: 0, total: +l.total,
      }));
      await supabase.from("document_lines").insert(linePayloads);
      await logActivity(editingDoc ? "updated" : "created", activeDocType, docId, docNumber);
      toast.success(editingDoc ? "Document updated!" : "Document created!");
      setDocSheet(false); loadBusinessData();
    } catch (err: any) { toast.error(err.message || "Failed to save document"); }
    setDocBusy(false);
  };

  const deleteDoc = async (doc: any) => {
    if (!confirm(`Delete ${doc.doc_number}? This cannot be undone.`)) return;
    await supabase.from("document_lines").delete().eq("document_id", doc.id);
    await supabase.from("documents").delete().eq("id", doc.id);
    await logActivity("deleted", doc.doc_type, doc.id, doc.doc_number);
    toast.success("Document deleted"); loadBusinessData();
  };

  // ─────────────────────────── Handlers: expenses ───────────────────────────

  const openNewExp = () => {
    setEditingExp(null);
    setExpForm({ expense_date: new Date().toISOString().slice(0, 10), category: "Office", mode: "cash", amount: "", description: "", paid_to: "" });
    setExpSheet(true);
  };

  const openEditExp = (exp: any) => {
    setEditingExp(exp);
    setExpForm({ expense_date: exp.expense_date, category: exp.category, mode: exp.mode, amount: exp.amount, description: exp.description || "", paid_to: exp.paid_to || "" });
    setExpSheet(true);
  };

  const saveExpense = async () => {
    if (!expForm.amount || +expForm.amount <= 0) return toast.error("Valid amount required");
    setExpBusy(true);
    try {
      const payload = { ...expForm, amount: +expForm.amount, created_by: user?.id };
      let expId: string;
      if (editingExp) {
        const { error } = await (supabase as any).from("expenses").update(payload).eq("id", editingExp.id);
        if (error) throw error;
        expId = editingExp.id;
      } else {
        const { data, error } = await (supabase as any).from("expenses").insert(payload).select().single();
        if (error) throw error;
        expId = data.id;
      }
      await logActivity(editingExp ? "updated" : "created", "expenses", expId, `₹${expForm.amount} – ${expForm.category}`);
      toast.success(editingExp ? "Expense updated!" : "Expense saved!");
      setExpSheet(false); loadBusinessData();
    } catch (err: any) { toast.error(err.message || "Failed to save expense"); }
    setExpBusy(false);
  };

  const deleteExpense = async (exp: any) => {
    if (!confirm("Delete this expense?")) return;
    await (supabase as any).from("expenses").delete().eq("id", exp.id);
    await logActivity("deleted", "expenses", exp.id, `₹${exp.amount} – ${exp.category}`);
    toast.success("Expense deleted"); loadBusinessData();
  };

  // ─────────────────────────── Render helpers ───────────────────────────────

  const monthToRange = (month: string) => {
    if (!month) return { from: "", to: "" };
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
  };

  const renderDocList = (types: string[], search = "", dateFrom = "", dateTo = "") => {
    if (bizLoading) return <BizLoadingGrid />;
    let filtered = myDocs.filter(d => types.includes(d.doc_type));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(d =>
        (d.doc_number || "").toLowerCase().includes(q) ||
        (d.parties?.name || "").toLowerCase().includes(q) ||
        (d.notes || "").toLowerCase().includes(q)
      );
    }
    if (dateFrom) filtered = filtered.filter(d => d.doc_date >= dateFrom);
    if (dateTo)   filtered = filtered.filter(d => d.doc_date <= dateTo);

    if (!filtered.length) return (
      <div className="text-center py-14 text-muted-foreground text-sm bg-card rounded-3xl border border-border/50">
        {(search || dateFrom || dateTo) ? "No documents match your filters." : "No documents yet."}
      </div>
    );
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((doc, i) => {
          const lines: any[] = doc.document_lines || [];
          return (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col gap-2 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm truncate">{doc.doc_number}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border shrink-0 ${STATUS_COLORS[doc.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {doc.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.parties?.name}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(doc.doc_date)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {hasPerm(DOC_MODULE[doc.doc_type], "can_edit") && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openEditDoc(doc)} title="Edit">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {hasPerm(DOC_MODULE[doc.doc_type], "can_delete") && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10" onClick={() => deleteDoc(doc)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              {lines.length > 0 && (
                <div className="bg-muted/30 rounded-xl p-2.5 space-y-1 border border-border/30">
                  {lines.slice(0, 3).map((l: any, li: number) => (
                    <div key={li} className="flex justify-between items-center text-xs">
                      <span className="truncate flex-1 text-muted-foreground">{l.description || "—"}</span>
                      <span className="shrink-0 ml-2 font-medium">{l.quantity} × {fmtINR(l.rate)}</span>
                    </div>
                  ))}
                  {lines.length > 3 && (
                    <p className="text-[10px] text-muted-foreground text-right">+{lines.length - 3} more items</p>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between mt-auto pt-1 border-t border-border/30">
                <span className="text-xs text-muted-foreground">{lines.length} item{lines.length !== 1 ? "s" : ""}</span>
                <span className="text-sm font-bold">{fmtINR(doc.total)}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // ─────────────────────────── Selected visit view ──────────────────────────

  if (selectedVisit) {
    return (
      <div className="min-h-screen bg-muted/30 pb-20 font-sans">
        {(isOffline || syncing) && (
          <div className={`px-2 py-2 text-center text-xs font-medium flex items-center justify-center gap-2 ${isOffline ? "bg-orange-500 text-white" : "bg-blue-500 text-white"}`}>
            {isOffline ? <><WifiOff className="h-3 w-3" /> You are offline. Changes will be saved locally.</> : <><RefreshCw className="h-3 w-3 animate-spin" /> Syncing offline data...</>}
          </div>
        )}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 p-4 md:px-8 flex items-center gap-3 shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setSelectedVisit(null)} className="rounded-full h-10 w-10 shrink-0 bg-muted/50 hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-semibold text-lg md:text-xl truncate">{selectedVisit.parties?.name}</h1>
            <p className="text-xs text-muted-foreground truncate">Service Log Entry</p>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="p-4 md:p-8 max-w-6xl mx-auto mt-2 grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-card border border-border/50 rounded-3xl p-5 md:p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-4 border-b border-border/50 pb-5">
                <div className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                  <Wrench className="h-6 w-6 md:h-7 md:w-7" />
                </div>
                <div>
                  <h2 className="font-semibold text-base md:text-lg leading-tight">{selectedVisit.machine_details || "General Service"}</h2>
                  <div className="text-xs md:text-sm text-muted-foreground mt-1 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(selectedVisit.visit_date).toLocaleDateString("en-GB")}</div>
                </div>
              </div>
              <div className="space-y-3 md:space-y-4">
                {selectedVisit.parties?.phone && (
                  <a href={`tel:${selectedVisit.parties.phone}`} className="flex items-center text-sm md:text-base text-foreground bg-secondary/50 p-3.5 rounded-2xl hover:bg-secondary transition-colors">
                    <Phone className="h-5 w-5 mr-3 text-accent shrink-0" /> {selectedVisit.parties.phone}
                  </a>
                )}
                {selectedVisit.parties?.billing_address && (
                  <div className="flex items-start text-sm md:text-base text-foreground bg-secondary/50 p-3.5 rounded-2xl">
                    <MapPin className="h-5 w-5 mr-3 mt-0.5 shrink-0 text-accent" />
                    <span className="leading-snug">{selectedVisit.parties.billing_address}</span>
                  </div>
                )}
                {selectedVisit.parties?.map_url && (
                  <a href={selectedVisit.parties.map_url} target="_blank" rel="noreferrer" className="flex items-center text-sm md:text-base text-foreground bg-blue-500/10 p-3.5 rounded-2xl hover:bg-blue-500/20 transition-colors">
                    <Map className="h-5 w-5 mr-3 text-blue-600 shrink-0" />
                    <span className="text-blue-700 font-medium">Open in Google Maps</span>
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-card border border-border/50 rounded-3xl p-5 md:p-8 shadow-sm space-y-5 md:space-y-6">
              <h3 className="font-semibold text-base md:text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-muted-foreground" /> Work Details</h3>
              <div>
                <Label className="text-xs md:text-sm text-muted-foreground ml-1">Work Done Description *</Label>
                <Textarea rows={4} value={form.work_description} onChange={e => setForm({ ...form, work_description: e.target.value })} className="mt-1.5 rounded-2xl bg-secondary/30 border-transparent focus:border-accent text-base p-4" placeholder="Describe the service performed..." />
              </div>
              <div>
                <Label className="text-xs md:text-sm text-muted-foreground ml-1">Parts Replaced / Used</Label>
                <Textarea rows={2} value={form.parts_used} onChange={e => setForm({ ...form, parts_used: e.target.value })} className="mt-1.5 rounded-2xl bg-secondary/30 border-transparent focus:border-accent text-base p-4" placeholder="Leave blank if no parts used" />
              </div>
              <div>
                <Label className="text-xs md:text-sm text-muted-foreground ml-1">Service Charges</Label>
                <div className="mt-1.5 space-y-3">
                  <Select key={selectKey} onValueChange={(val) => { const svc = servicesList.find(s => s.id === val); if (svc) { setSelectedServices([...selectedServices, svc]); setSelectKey(k => k + 1); } }}>
                    <SelectTrigger className="rounded-2xl bg-secondary/30 border-transparent focus:border-accent h-12"><SelectValue placeholder="Add a service..." /></SelectTrigger>
                    <SelectContent>{servicesList.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {fmtINR(s.sale_price)}</SelectItem>)}</SelectContent>
                  </Select>
                  {selectedServices.length > 0 && (
                    <div className="bg-secondary/20 rounded-2xl p-4 md:p-5 space-y-3 md:space-y-4 border border-border/50">
                      {selectedServices.map((s, i) => (
                        <div key={i} className="flex justify-between items-center text-sm md:text-base">
                          <span className="truncate flex-1 font-medium">{s.name}</span>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span>{fmtINR(s.sale_price)}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-full hover:bg-destructive/10" onClick={() => { const n = [...selectedServices]; n.splice(i, 1); setSelectedServices(n); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-border/50 pt-3 md:pt-4 mt-2 space-y-2">
                        <div className="flex justify-between text-xs md:text-sm text-muted-foreground"><span>Base Amount:</span><span>{fmtINR(totalBase)}</span></div>
                        <div className="flex justify-between text-xs md:text-sm text-muted-foreground"><span>GST Amount:</span><span>{fmtINR(totalGST)}</span></div>
                        <div className="flex justify-between text-sm md:text-base font-bold text-foreground pt-2 border-t border-border/50"><span>Total Charges:</span><span className="text-accent">{fmtINR(grandTotal)}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-card border border-border/50 rounded-3xl p-5 md:p-8 shadow-sm space-y-4">
              <Label className="text-sm md:text-base font-semibold flex items-center gap-2"><PenTool className="h-5 w-5 text-muted-foreground" /> Customer Signature *</Label>
              <div className="flex justify-center bg-secondary/10 rounded-2xl p-2 border border-border/30">
                <SignaturePad onSign={(s) => setForm({ ...form, signature_url: s })} />
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={completeVisit} disabled={busy} className="w-full rounded-2xl h-14 md:h-16 text-base md:text-lg font-semibold shadow-lg shadow-primary/20 transition-all">
                {busy ? "Submitting..." : <><CheckCircle className="h-5 w-5 md:h-6 md:w-6 mr-2" /> Submit for Verification</>}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────── Main view ────────────────────────────────────

  return (
    <div className="min-h-screen bg-muted/30 font-sans pb-10">
      {(isOffline || syncing) && (
        <div className={`px-2 py-2 text-center text-xs font-medium flex items-center justify-center gap-2 ${isOffline ? "bg-orange-500 text-white" : "bg-blue-500 text-white"}`}>
          {isOffline ? <><WifiOff className="h-3 w-3" /> You are offline. Changes will be saved locally.</> : <><RefreshCw className="h-3 w-3 animate-spin" /> Syncing offline data...</>}
        </div>
      )}

      {/* Header */}
      <div className="bg-foreground text-background px-6 md:px-12 pt-10 md:pt-16 pb-6 md:pb-12 rounded-b-[2.5rem] md:rounded-b-[4rem] shadow-xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-48 md:w-96 h-48 md:h-96 bg-accent/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-background/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto">
          <img src={logo} alt="PHD Automations" className="h-8 md:h-12 w-auto mb-6 md:mb-10 brightness-0 invert opacity-90 hover:opacity-100 transition-opacity" />
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-background/60 text-sm md:text-base font-medium mb-1">Welcome back,</p>
              <h1 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl truncate max-w-[200px] sm:max-w-md lg:max-w-2xl">{user?.email?.split("@")[0]}</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full h-12 w-12 md:h-14 md:w-14 bg-background/10 hover:bg-background/20 text-background shrink-0 transition-colors">
              <LogOut className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="w-full max-w-6xl mx-auto px-4 md:px-8 mt-6 md:mt-10">
        <div className="overflow-x-auto pb-1 mb-6 md:mb-10">
          <TabsList className="flex bg-card border border-border/50 shadow-sm rounded-full p-1.5 h-12 w-max min-w-full gap-1">
            <TabsTrigger value="dashboard"  className="rounded-full text-xs md:text-sm px-4 h-full whitespace-nowrap data-[state=active]:bg-foreground data-[state=active]:text-background transition-all">Dashboard</TabsTrigger>
            {salesPerm    && <TabsTrigger value="sales"     className="rounded-full text-xs md:text-sm px-4 h-full whitespace-nowrap data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />Sales</TabsTrigger>}
            {purchasePerm && <TabsTrigger value="purchases" className="rounded-full text-xs md:text-sm px-4 h-full whitespace-nowrap data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center gap-1.5"><ShoppingCart className="h-3.5 w-3.5" />Purchases</TabsTrigger>}
            {expensesPerm && <TabsTrigger value="expenses"  className="rounded-full text-xs md:text-sm px-4 h-full whitespace-nowrap data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5" />Expenses</TabsTrigger>}
            {reportsPerm  && <TabsTrigger value="reports"   className="rounded-full text-xs md:text-sm px-4 h-full whitespace-nowrap data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Reports</TabsTrigger>}
            <TabsTrigger value="calendar"  className="rounded-full text-xs md:text-sm px-4 h-full whitespace-nowrap data-[state=active]:bg-foreground data-[state=active]:text-background transition-all">My Calendar</TabsTrigger>
            <TabsTrigger value="leave"     className="rounded-full text-xs md:text-sm px-4 h-full whitespace-nowrap data-[state=active]:bg-foreground data-[state=active]:text-background transition-all">Apply Leave</TabsTrigger>
          </TabsList>
        </div>

        {/* ── Dashboard ── */}
        <TabsContent value="dashboard" className="mt-0">
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-4 bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm text-center hover:shadow-md transition-shadow">
              <h2 className="font-semibold text-xl md:text-2xl mb-1 flex items-center justify-center gap-2"><Clock className="h-6 w-6 text-accent" /> Today</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8">{new Date().toDateString()}</p>
              {!attendance ? (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={() => handlePunch("in")} disabled={busy} className="w-full rounded-2xl h-14 md:h-16 bg-green-600 hover:bg-green-700 text-white font-bold md:text-lg shadow-lg shadow-green-600/20 transition-all">
                    {busy ? "Fetching GPS..." : "PUNCH IN (Start Day)"}
                  </Button>
                </motion.div>
              ) : !attendance.punch_out ? (
                <div className="space-y-4">
                  <div className="text-sm md:text-base bg-green-500/10 text-green-600 py-3 md:py-4 rounded-2xl border border-green-500/20 font-medium">
                    🟢 Punched in: {new Date(attendance.punch_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button onClick={() => handlePunch("out")} disabled={busy} className="w-full rounded-2xl h-14 md:h-16 bg-red-600 hover:bg-red-700 text-white font-bold md:text-lg shadow-lg shadow-red-600/20 transition-all">
                      {busy ? "Fetching GPS..." : "PUNCH OUT (End Day)"}
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-sm md:text-base bg-secondary/50 text-foreground py-4 rounded-2xl border border-border/50 font-medium">
                  ✅ Shift Completed<br className="hidden md:block" />({attendance.total_hours} Hours)
                </motion.div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-8 space-y-4 md:space-y-6">
              <div className="flex items-center justify-between bg-card border border-border/50 rounded-3xl p-5 md:p-6 shadow-sm">
                <h2 className="font-semibold text-foreground text-lg md:text-xl">Pending Visits</h2>
                <span className="bg-accent/10 text-accent px-4 py-1.5 rounded-full text-xs md:text-sm font-bold">{visits.length} Assigned</span>
              </div>
              {loading ? (
                <div className="grid sm:grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-card/50 rounded-3xl border border-border/50 animate-pulse" />)}</div>
              ) : visits.length === 0 ? (
                <div className="bg-card border border-border/50 rounded-3xl p-12 md:p-20 text-center shadow-sm">
                  <div className="h-20 w-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-5"><CheckCircle className="h-10 w-10" /></div>
                  <h3 className="font-bold text-xl md:text-2xl mb-2">All Caught Up!</h3>
                  <p className="text-muted-foreground text-sm md:text-base">You have no pending visits right now.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
                  {visits.map((v, i) => (
                    <motion.div key={v.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                      onClick={() => openVisit(v)} className="bg-card border border-border/50 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] cursor-pointer group hover:border-accent/40 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10 flex justify-between items-start mb-4">
                        <span className="font-bold text-lg md:text-xl leading-tight group-hover:text-accent transition-colors">{v.parties?.name}</span>
                        <div className="flex items-center gap-2">
                          {v.parties?.map_url && <a href={v.parties.map_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 flex items-center justify-center transition-colors"><Map className="h-4 w-4" /></a>}
                          {v.parties?.phone && <a href={`tel:${v.parties.phone}`} onClick={e => e.stopPropagation()} className="h-8 w-8 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20 flex items-center justify-center transition-colors"><Phone className="h-4 w-4" /></a>}
                          <span className={`text-[10px] md:text-xs uppercase tracking-wider font-bold px-2.5 md:px-3 py-1 md:py-1.5 rounded-full ${v.status === "in_progress" ? "bg-orange-500/10 text-orange-600" : "bg-blue-500/10 text-blue-600"}`}>{v.status.replace("_", " ")}</span>
                        </div>
                      </div>
                      <div className="relative z-10 space-y-2 mt-4">
                        <div className="flex items-center text-sm md:text-base text-muted-foreground"><Wrench className="h-4 w-4 md:h-5 md:w-5 mr-3 text-foreground/40 shrink-0" /><span className="line-clamp-1">{v.machine_details || "General Service"}</span></div>
                        <div className="flex items-center text-sm md:text-base text-muted-foreground"><Calendar className="h-4 w-4 md:h-5 md:w-5 mr-3 text-foreground/40 shrink-0" />{new Date(v.visit_date).toLocaleDateString("en-GB")}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </TabsContent>

        {/* ── Sales ── */}
        {salesPerm && (
          <TabsContent value="sales" className="mt-0">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              {/* Inner type tabs */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {(["invoice", "quotation", "proforma", "challan"] as const).map(t => (
                  <button key={t} onClick={() => setSalesType(t)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${salesType === t ? "bg-foreground text-background border-foreground" : "bg-card border-border/50 text-muted-foreground hover:border-foreground/30"}`}>
                    {DOC_LABEL[t]}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">{DOC_LABEL[salesType]}s</h3>
                {hasPerm(salesType as PermModule, "can_create") && (
                  <Button onClick={() => openNewDoc(salesType)} className="rounded-full bg-foreground text-background hover:bg-foreground/90 h-9 text-sm">
                    <Plus className="h-4 w-4 mr-1" /> New {DOC_LABEL[salesType]}
                  </Button>
                )}
              </div>
              <FilterBar
                search={salesSearch} onSearch={setSalesSearch}
                month={salesMonth} onMonth={setSalesMonth}
                from={salesFrom} onFrom={setSalesFrom}
                to={salesTo} onTo={setSalesTo}
                onClear={() => { setSalesSearch(""); setSalesMonth(""); setSalesFrom(""); setSalesTo(""); }}
              />
              {(() => {
                const range = salesMonth ? monthToRange(salesMonth) : { from: salesFrom, to: salesTo };
                return renderDocList([salesType], salesSearch, range.from, range.to);
              })()}
            </motion.div>
          </TabsContent>
        )}

        {/* ── Purchases ── */}
        {purchasePerm && (
          <TabsContent value="purchases" className="mt-0">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex gap-2 mb-4">
                {(["purchase_bill", "purchase_order"] as const).map(t => (
                  <button key={t} onClick={() => setPurchaseType(t)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${purchaseType === t ? "bg-foreground text-background border-foreground" : "bg-card border-border/50 text-muted-foreground hover:border-foreground/30"}`}>
                    {DOC_LABEL[t]}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">{DOC_LABEL[purchaseType]}s</h3>
                {hasPerm("purchase", "can_create") && (
                  <Button onClick={() => openNewDoc(purchaseType)} className="rounded-full bg-foreground text-background hover:bg-foreground/90 h-9 text-sm">
                    <Plus className="h-4 w-4 mr-1" /> New {DOC_LABEL[purchaseType]}
                  </Button>
                )}
              </div>
              <FilterBar
                search={purchSearch} onSearch={setPurchSearch}
                month={purchMonth} onMonth={setPurchMonth}
                from={purchFrom} onFrom={setPurchFrom}
                to={purchTo} onTo={setPurchTo}
                onClear={() => { setPurchSearch(""); setPurchMonth(""); setPurchFrom(""); setPurchTo(""); }}
              />
              {(() => {
                const range = purchMonth ? monthToRange(purchMonth) : { from: purchFrom, to: purchTo };
                return renderDocList([purchaseType], purchSearch, range.from, range.to);
              })()}
            </motion.div>
          </TabsContent>
        )}

        {/* ── Expenses ── */}
        {expensesPerm && (
          <TabsContent value="expenses" className="mt-0">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">My Expenses</h3>
                {hasPerm("expenses", "can_create") && (
                  <Button onClick={openNewExp} className="rounded-full bg-foreground text-background hover:bg-foreground/90 h-9 text-sm">
                    <Plus className="h-4 w-4 mr-1" /> New Expense
                  </Button>
                )}
              </div>
              <FilterBar
                search={expSearch} onSearch={setExpSearch}
                month={expMonth} onMonth={setExpMonth}
                from={expFrom} onFrom={setExpFrom}
                to={expTo} onTo={setExpTo}
                onClear={() => { setExpSearch(""); setExpMonth(""); setExpFrom(""); setExpTo(""); }}
              />
              {(() => {
                if (bizLoading) return <BizLoadingGrid />;
                const range = expMonth ? monthToRange(expMonth) : { from: expFrom, to: expTo };
                let filtered = myExpenses;
                if (expSearch.trim()) {
                  const q = expSearch.trim().toLowerCase();
                  filtered = filtered.filter(e =>
                    (e.category || "").toLowerCase().includes(q) ||
                    (e.description || "").toLowerCase().includes(q) ||
                    (e.paid_to || "").toLowerCase().includes(q)
                  );
                }
                if (range.from) filtered = filtered.filter(e => e.expense_date >= range.from);
                if (range.to)   filtered = filtered.filter(e => e.expense_date <= range.to);

                if (!filtered.length) return (
                  <div className="text-center py-14 text-muted-foreground text-sm bg-card rounded-3xl border border-border/50">
                    {(expSearch || expMonth || expFrom || expTo) ? "No expenses match your filters." : "No expenses recorded yet."}
                  </div>
                );
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map((exp, i) => (
                      <motion.div key={exp.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col gap-2 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium border border-purple-200 truncate">{exp.category}</span>
                              <span className="text-xs text-muted-foreground">{exp.mode}</span>
                            </div>
                            <p className="text-sm font-bold mt-1.5">{fmtINR(exp.amount)}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {hasPerm("expenses", "can_edit") && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openEditExp(exp)} title="Edit">
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {hasPerm("expenses", "can_delete") && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10" onClick={() => deleteExpense(exp)} title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {exp.description && <p className="text-xs text-muted-foreground truncate">{exp.description}</p>}
                        {exp.paid_to && <p className="text-xs text-muted-foreground truncate">To: {exp.paid_to}</p>}
                        <p className="text-xs text-muted-foreground mt-auto pt-1 border-t border-border/30">{fmtDate(exp.expense_date)}</p>
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </motion.div>
          </TabsContent>
        )}

        {/* ── Reports ── */}
        {reportsPerm && (
          <TabsContent value="reports" className="mt-0">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              {/* Date range filter */}
              <div className="bg-card border border-border/50 rounded-2xl p-4 flex flex-wrap gap-4 items-end shadow-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input type="date" value={rptFrom} onChange={e => setRptFrom(e.target.value)} className="mt-1 h-9 rounded-xl w-40" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input type="date" value={rptTo} onChange={e => setRptTo(e.target.value)} className="mt-1 h-9 rounded-xl w-40" />
                </div>
                {rptLoading && <span className="text-xs text-muted-foreground animate-pulse pb-1">Loading…</span>}
              </div>

              {/* Computed values */}
              {(() => {
                const sales      = rptDocs.filter(d => d.doc_type === "invoice");
                const purchases  = rptDocs.filter(d => d.doc_type === "purchase_bill");
                const totalSales = sales.reduce((s, d) => s + Number(d.total), 0);
                const totalPurch = purchases.reduce((s, d) => s + Number(d.total), 0);
                const totalExp   = rptExps.reduce((s, e) => s + Number(e.amount), 0);
                const profit     = totalSales - totalPurch - totalExp;
                const outputGst  = sales.reduce((s, d) => s + Number(d.cgst) + Number(d.sgst) + Number(d.igst), 0);
                const inputGst   = purchases.reduce((s, d) => s + Number(d.cgst) + Number(d.sgst) + Number(d.igst), 0);

                const aging = (() => {
                  const now = new Date();
                  const b = { "0–30 days": 0, "31–60 days": 0, "61–90 days": 0, "90+ days": 0 };
                  sales.forEach(d => {
                    const due = Number(d.total) - Number(d.paid || 0);
                    if (due <= 0) return;
                    const days = Math.floor((now.getTime() - new Date(d.doc_date).getTime()) / 86400000);
                    if (days <= 30) b["0–30 days"] += due;
                    else if (days <= 60) b["31–60 days"] += due;
                    else if (days <= 90) b["61–90 days"] += due;
                    else b["90+ days"] += due;
                  });
                  return b;
                })();

                const expByCategory = EXPENSE_CATEGORIES.map(cat => ({
                  cat,
                  total: rptExps.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount || 0), 0),
                })).filter(x => x.total > 0);
                const maxExpCat = Math.max(...expByCategory.map(x => x.total), 1);

                return (
                  <Tabs defaultValue="pl">
                    {/* Inner report tabs */}
                    <div className="overflow-x-auto pb-1">
                      <TabsList className="flex h-10 bg-muted/40 rounded-xl p-1 w-max gap-1">
                        {[
                          { v: "pl",       l: "P & L" },
                          { v: "gst",      l: "GST Summary" },
                          { v: "sales",    l: "Sales Register" },
                          { v: "purchase", l: "Purchase Register" },
                          { v: "expenses", l: "Expenses" },
                          { v: "aging",    l: "Aging" },
                        ].map(t => (
                          <TabsTrigger key={t.v} value={t.v} className="rounded-lg px-3 text-xs whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm">{t.l}</TabsTrigger>
                        ))}
                      </TabsList>
                    </div>

                    {/* P&L */}
                    <TabsContent value="pl" className="mt-4">
                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        {[
                          { label: "Total Sales",     value: totalSales,  color: "text-green-600", bg: "bg-green-500/10 border-green-500/20" },
                          { label: "Total Purchases", value: totalPurch,  color: "text-blue-600",  bg: "bg-blue-500/10 border-blue-500/20" },
                          { label: "Total Expenses",  value: totalExp,    color: "text-orange-600",bg: "bg-orange-500/10 border-orange-500/20" },
                          { label: "Net Profit",      value: profit,      color: profit >= 0 ? "text-emerald-600" : "text-red-600", bg: profit >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20" },
                        ].map(kpi => (
                          <div key={kpi.label} className={`rounded-2xl border p-5 shadow-sm ${kpi.bg}`}>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{kpi.label}</p>
                            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{fmtINR(kpi.value)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-3 max-w-md">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Revenue (Sales)</span><span className="font-medium text-green-600">{fmtINR(totalSales)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Less: Purchases</span><span className="font-medium text-red-500">− {fmtINR(totalPurch)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Less: Expenses</span><span className="font-medium text-red-500">− {fmtINR(totalExp)}</span></div>
                        <div className="flex justify-between font-bold text-base border-t border-border/50 pt-3">
                          <span>Net Profit / Loss</span>
                          <span className={profit >= 0 ? "text-emerald-600" : "text-red-600"}>{fmtINR(profit)}</span>
                        </div>
                      </div>
                    </TabsContent>

                    {/* GST Summary */}
                    <TabsContent value="gst" className="mt-4">
                      <div className="grid sm:grid-cols-3 gap-4 mb-4">
                        {[
                          { label: "Output GST (Sales)",     value: outputGst,            color: "text-blue-600",    bg: "bg-blue-500/10 border-blue-500/20" },
                          { label: "Input GST (Purchases)",  value: inputGst,             color: "text-purple-600",  bg: "bg-purple-500/10 border-purple-500/20" },
                          { label: "Net GST Payable",        value: outputGst - inputGst, color: (outputGst - inputGst) >= 0 ? "text-red-600" : "text-green-600", bg: (outputGst - inputGst) >= 0 ? "bg-red-500/10 border-red-500/20" : "bg-green-500/10 border-green-500/20" },
                        ].map(kpi => (
                          <div key={kpi.label} className={`rounded-2xl border p-5 shadow-sm ${kpi.bg}`}>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{kpi.label}</p>
                            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{fmtINR(kpi.value)}</p>
                          </div>
                        ))}
                      </div>
                      {/* GST breakdown by rate */}
                      {sales.length > 0 && (
                        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">GST by Rate (Sales)</p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[400px]">
                              <thead><tr className="border-b border-border/50 text-xs text-muted-foreground"><th className="pb-2 text-left">Rate</th><th className="pb-2 text-right">Taxable</th><th className="pb-2 text-right">CGST</th><th className="pb-2 text-right">SGST</th><th className="pb-2 text-right">IGST</th></tr></thead>
                              <tbody>
                                {[0, 5, 12, 18, 28].map(rate => {
                                  const lines = sales.flatMap(d => (d.document_lines || []).filter((l: any) => Number(l.gst_rate) === rate));
                                  if (!lines.length) return null;
                                  return (
                                    <tr key={rate} className="border-b border-border/30 hover:bg-muted/20">
                                      <td className="py-2 font-medium">{rate}%</td>
                                      <td className="py-2 text-right">{fmtINR(lines.reduce((s: number, l: any) => s + Number(l.taxable), 0))}</td>
                                      <td className="py-2 text-right">{fmtINR(lines.reduce((s: number, l: any) => s + Number(l.cgst), 0))}</td>
                                      <td className="py-2 text-right">{fmtINR(lines.reduce((s: number, l: any) => s + Number(l.sgst), 0))}</td>
                                      <td className="py-2 text-right">{fmtINR(lines.reduce((s: number, l: any) => s + Number(l.igst), 0))}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    {/* Sales Register */}
                    <TabsContent value="sales" className="mt-4">
                      {sales.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm bg-card rounded-2xl border border-border/50">No sales in this period.</div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
                              <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Invoices</p>
                              <p className="text-xl font-bold mt-1">{sales.length}</p>
                            </div>
                            <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
                              <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Total Sales</p>
                              <p className="text-xl font-bold mt-1">{fmtINR(totalSales)}</p>
                            </div>
                            <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
                              <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Output GST</p>
                              <p className="text-xl font-bold mt-1">{fmtINR(outputGst)}</p>
                            </div>
                          </div>
                          <div className="bg-card border border-border/50 rounded-2xl overflow-x-auto shadow-sm">
                            <table className="w-full text-sm min-w-[600px]">
                              <thead className="bg-muted/30 text-xs text-muted-foreground">
                                <tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Number</th><th className="p-3 text-left">Party</th><th className="p-3 text-left">GSTIN</th><th className="p-3 text-right">Taxable</th><th className="p-3 text-right">GST</th><th className="p-3 text-right">Total</th></tr>
                              </thead>
                              <tbody className="divide-y divide-border/30">
                                {sales.map(d => (
                                  <tr key={d.id} className="hover:bg-muted/20">
                                    <td className="p-3 text-xs">{fmtDate(d.doc_date)}</td>
                                    <td className="p-3 text-xs font-mono">{d.doc_number}</td>
                                    <td className="p-3 text-xs">{(d.parties as any)?.name || "—"}</td>
                                    <td className="p-3 text-xs font-mono text-muted-foreground">{(d.parties as any)?.gstin || "—"}</td>
                                    <td className="p-3 text-xs text-right">{fmtINR(Number(d.subtotal) - Number(d.discount || 0))}</td>
                                    <td className="p-3 text-xs text-right">{fmtINR(Number(d.cgst) + Number(d.sgst) + Number(d.igst))}</td>
                                    <td className="p-3 text-xs text-right font-semibold">{fmtINR(d.total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-muted/20 text-xs font-bold border-t border-border/50">
                                <tr>
                                  <td colSpan={4} className="p-3">Totals ({sales.length} invoices)</td>
                                  <td className="p-3 text-right">{fmtINR(sales.reduce((s, d) => s + Number(d.subtotal) - Number(d.discount || 0), 0))}</td>
                                  <td className="p-3 text-right">{fmtINR(outputGst)}</td>
                                  <td className="p-3 text-right">{fmtINR(totalSales)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </>
                      )}
                    </TabsContent>

                    {/* Purchase Register */}
                    <TabsContent value="purchase" className="mt-4">
                      {purchases.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm bg-card rounded-2xl border border-border/50">No purchases in this period.</div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
                              <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Bills</p>
                              <p className="text-xl font-bold mt-1">{purchases.length}</p>
                            </div>
                            <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
                              <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Total Purchase</p>
                              <p className="text-xl font-bold mt-1">{fmtINR(totalPurch)}</p>
                            </div>
                            <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
                              <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Input GST</p>
                              <p className="text-xl font-bold mt-1">{fmtINR(inputGst)}</p>
                            </div>
                          </div>
                          <div className="bg-card border border-border/50 rounded-2xl overflow-x-auto shadow-sm">
                            <table className="w-full text-sm min-w-[500px]">
                              <thead className="bg-muted/30 text-xs text-muted-foreground">
                                <tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Number</th><th className="p-3 text-left">Vendor</th><th className="p-3 text-right">Taxable</th><th className="p-3 text-right">GST</th><th className="p-3 text-right">Total</th></tr>
                              </thead>
                              <tbody className="divide-y divide-border/30">
                                {purchases.map(d => (
                                  <tr key={d.id} className="hover:bg-muted/20">
                                    <td className="p-3 text-xs">{fmtDate(d.doc_date)}</td>
                                    <td className="p-3 text-xs font-mono">{d.doc_number}</td>
                                    <td className="p-3 text-xs">{(d.parties as any)?.name || "—"}</td>
                                    <td className="p-3 text-xs text-right">{fmtINR(Number(d.subtotal) - Number(d.discount || 0))}</td>
                                    <td className="p-3 text-xs text-right">{fmtINR(Number(d.cgst) + Number(d.sgst) + Number(d.igst))}</td>
                                    <td className="p-3 text-xs text-right font-semibold">{fmtINR(d.total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-muted/20 text-xs font-bold border-t border-border/50">
                                <tr>
                                  <td colSpan={3} className="p-3">Totals ({purchases.length} bills)</td>
                                  <td className="p-3 text-right">{fmtINR(purchases.reduce((s, d) => s + Number(d.subtotal) - Number(d.discount || 0), 0))}</td>
                                  <td className="p-3 text-right">{fmtINR(inputGst)}</td>
                                  <td className="p-3 text-right">{fmtINR(totalPurch)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </>
                      )}
                    </TabsContent>

                    {/* Expenses breakdown */}
                    <TabsContent value="expenses" className="mt-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
                          <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide mb-4">By Category</p>
                          {expByCategory.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No expenses in this period.</p>
                          ) : (
                            <div className="space-y-3">
                              {expByCategory.map(({ cat, total }) => (
                                <div key={cat} className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground w-20 shrink-0">{cat}</span>
                                  <div className="flex-1 bg-secondary/40 rounded-full h-2 overflow-hidden">
                                    <div className="h-full bg-accent rounded-full" style={{ width: `${(total / maxExpCat) * 100}%` }} />
                                  </div>
                                  <span className="text-xs font-semibold w-24 text-right shrink-0">{fmtINR(total)}</span>
                                </div>
                              ))}
                              <div className="border-t border-border/50 pt-2 flex justify-between text-sm font-bold">
                                <span>Total</span><span>{fmtINR(totalExp)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                          <div className="p-3 bg-muted/30 text-xs text-muted-foreground font-medium grid grid-cols-3">
                            <span>Date</span><span>Category</span><span className="text-right">Amount</span>
                          </div>
                          <div className="divide-y divide-border/30 max-h-80 overflow-y-auto">
                            {rptExps.length === 0 ? (
                              <p className="p-4 text-sm text-muted-foreground text-center">No expenses.</p>
                            ) : rptExps.map(e => (
                              <div key={e.id} className="grid grid-cols-3 p-3 text-xs hover:bg-muted/20">
                                <span className="text-muted-foreground">{fmtDate(e.expense_date)}</span>
                                <span>{e.category}</span>
                                <span className="text-right font-semibold">{fmtINR(e.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Aging */}
                    <TabsContent value="aging" className="mt-4">
                      <p className="text-xs text-muted-foreground mb-4">Unpaid / partial receivables from invoices, grouped by age from invoice date.</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Object.entries(aging).map(([bucket, amount]) => (
                          <div key={bucket} className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
                            <p className="text-xs text-muted-foreground font-medium">{bucket}</p>
                            <p className={`text-xl font-bold mt-1 ${amount > 0 ? "text-red-500" : "text-muted-foreground"}`}>{fmtINR(amount)}</p>
                          </div>
                        ))}
                      </div>
                      {sales.filter(d => (Number(d.total) - Number(d.paid || 0)) > 0).length > 0 && (
                        <div className="mt-4 bg-card border border-border/50 rounded-2xl overflow-x-auto shadow-sm">
                          <table className="w-full text-sm min-w-[480px]">
                            <thead className="bg-muted/30 text-xs text-muted-foreground">
                              <tr><th className="p-3 text-left">Invoice</th><th className="p-3 text-left">Party</th><th className="p-3 text-left">Date</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Paid</th><th className="p-3 text-right">Due</th></tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {sales.filter(d => (Number(d.total) - Number(d.paid || 0)) > 0).map(d => (
                                <tr key={d.id} className="hover:bg-muted/20">
                                  <td className="p-3 text-xs font-mono">{d.doc_number}</td>
                                  <td className="p-3 text-xs">{(d.parties as any)?.name || "—"}</td>
                                  <td className="p-3 text-xs">{fmtDate(d.doc_date)}</td>
                                  <td className="p-3 text-xs text-right">{fmtINR(d.total)}</td>
                                  <td className="p-3 text-xs text-right text-green-600">{fmtINR(d.paid || 0)}</td>
                                  <td className="p-3 text-xs text-right font-bold text-red-500">{fmtINR(Number(d.total) - Number(d.paid || 0))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                );
              })()}
            </motion.div>
          </TabsContent>
        )}

        {/* ── Calendar ── */}
        <TabsContent value="calendar" className="mt-0">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/50 rounded-3xl p-5 md:p-8 shadow-sm max-w-xl mx-auto mb-6">
            <Label className="text-muted-foreground text-sm md:text-base">Select Month</Label>
            <Input type="month" value={histMonth} onChange={e => setHistMonth(e.target.value)} className="mt-2 rounded-2xl h-14 md:h-16 text-lg font-medium bg-secondary/30" />
          </motion.div>
          {(() => {
            const daysInMonth = new Date(Number(histMonth.split("-")[0]), Number(histMonth.split("-")[1]), 0).getDate();
            let p = 0, a = 0, l = 0;
            Array.from({ length: daysInMonth }).forEach((_, i) => {
              const d = `${histMonth}-${String(i + 1).padStart(2, "0")}`;
              const log = attHistory.find(lg => lg.date === d);
              const isHol = holidays.find(h => h.date === d);
              if (log) { if (log.status?.includes("leave")) l++; else if (log.punch_in || log.status === "present") p++; }
              else if (!isHol && new Date(d) < new Date(new Date().toISOString().slice(0, 10))) a++;
            });
            return (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-w-xl mx-auto mb-6">
                <div className="bg-card border border-border/50 rounded-2xl p-4 text-center shadow-sm"><div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Total Days</div><div className="font-bold text-2xl mt-1">{daysInMonth}</div></div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-center shadow-sm"><div className="text-xs text-green-700 uppercase font-semibold tracking-wider">Present</div><div className="font-bold text-2xl text-green-700 mt-1">{p}</div></div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center shadow-sm"><div className="text-xs text-red-700 uppercase font-semibold tracking-wider">Absent</div><div className="font-bold text-2xl text-red-700 mt-1">{a}</div></div>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 text-center shadow-sm"><div className="text-xs text-orange-700 uppercase font-semibold tracking-wider">Leave</div><div className="font-bold text-2xl text-orange-700 mt-1">{l}</div></div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 text-center shadow-sm"><div className="text-xs text-purple-700 uppercase font-semibold tracking-wider">Holidays</div><div className="font-bold text-2xl text-purple-700 mt-1">{holidays.length}</div></div>
              </motion.div>
            );
          })()}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border/50 rounded-3xl p-4 md:p-6 shadow-sm grid grid-cols-4 sm:grid-cols-7 gap-3 md:gap-4">
            {Array.from({ length: new Date(Number(histMonth.split("-")[0]), Number(histMonth.split("-")[1]), 0).getDate() }).map((_, i) => {
              const d = `${histMonth}-${String(i + 1).padStart(2, "0")}`;
              const log = attHistory.find(l => l.date === d);
              const hol = holidays.find(h => h.date === d);
              let statusLabel = "—", badgeColor = "bg-card text-foreground border-border/50", dotColor = "bg-transparent";
              if (log) {
                if (log.status === "leave_approved") { statusLabel = "On Leave"; badgeColor = "bg-purple-500/10 text-purple-700 border-purple-500/30"; dotColor = "bg-purple-500"; }
                else if (log.status === "leave_pending") { statusLabel = "Leave Pending"; badgeColor = "bg-orange-500/10 text-orange-700 border-orange-500/30"; dotColor = "bg-orange-500"; }
                else if (log.status === "leave_rejected") { statusLabel = "Leave Rejected"; badgeColor = "bg-red-500/10 text-red-700 border-red-500/30"; dotColor = "bg-red-500"; }
                else if (log.punch_in || log.status === "present") { statusLabel = "Present"; badgeColor = "bg-green-500/10 text-green-700 border-green-500/30"; dotColor = "bg-green-500"; }
              } else if (hol) {
                statusLabel = "Holiday: " + hol.name; badgeColor = "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"; dotColor = "bg-emerald-500";
              } else if (new Date(d) < new Date(new Date().toISOString().slice(0, 10))) {
                statusLabel = "Absent"; badgeColor = "bg-red-500/10 text-red-700 border-red-500/30"; dotColor = "bg-red-500";
              }
              return (
                <div key={d} className={`group relative aspect-square flex flex-col items-center justify-center rounded-[10px] border transition-all hover:scale-105 cursor-pointer shadow-sm hover:shadow-md ${badgeColor}`}>
                  <span className="font-bold text-xl md:text-2xl">{i + 1}</span>
                  <span className={`h-1.5 w-1.5 rounded-full mt-1.5 md:mt-2 ${dotColor}`} />
                  <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-3 w-max max-w-[220px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col bg-foreground text-background text-xs p-3 rounded-xl shadow-xl pointer-events-none">
                    <span className="font-semibold border-b border-background/20 pb-1.5 mb-1.5">{new Date(d).toDateString()}</span>
                    <span className="font-medium text-background/90">{statusLabel}</span>
                    {log?.total_hours && <span className="mt-1 text-background/80">Logged: {log.total_hours} hrs</span>}
                    {log?.admin_remarks && <span className="mt-1 text-orange-400">Admin: {log.admin_remarks}</span>}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-foreground" />
                  </div>
                </div>
              );
            })}
          </motion.div>
        </TabsContent>

        {/* ── Leave ── */}
        <TabsContent value="leave" className="mt-0">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border/50 rounded-3xl p-6 md:p-10 shadow-sm space-y-6 max-w-xl mx-auto">
            <h3 className="font-semibold text-xl md:text-2xl flex items-center gap-2"><CalendarCheck2 className="h-6 w-6 text-accent" /> Apply for Leave</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground text-sm">Start Date *</Label><Input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} className="mt-2 rounded-2xl h-14 bg-secondary/30 focus:border-accent" /></div>
              <div><Label className="text-muted-foreground text-sm">End Date <span className="font-normal text-xs">(Optional)</span></Label><Input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} className="mt-2 rounded-2xl h-14 bg-secondary/30 focus:border-accent" /></div>
            </div>
            <div><Label className="text-muted-foreground text-sm">Reason *</Label><Textarea rows={4} value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} className="mt-2 rounded-2xl bg-secondary/30 focus:border-accent resize-none text-base p-4" placeholder="Why do you need leave?" /></div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={applyLeave} disabled={busy} className="w-full rounded-2xl h-14 md:h-16 bg-foreground text-background shadow-lg text-base md:text-lg transition-transform font-semibold hover:shadow-xl hover:bg-foreground/90">Submit Request</Button>
            </motion.div>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="flex flex-col items-center justify-center gap-1.5 py-12 md:py-16 opacity-60">
        <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest font-medium">Powered by</div>
        <div className="flex items-center gap-1.5 text-xs md:text-sm font-display font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
          <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-500" /> Saffyre Intelligence Labs
        </div>
      </div>

      {/* ─── Document Sheet ──────────────────────────────────────────────────── */}
      <Sheet open={docSheet} onOpenChange={setDocSheet}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/50 bg-background sticky top-0 z-10">
            <SheetTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-accent" />
              {editingDoc ? `Edit ${DOC_LABEL[activeDocType]}` : `New ${DOC_LABEL[activeDocType]}`}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {/* Party */}
            <div>
              <Label className="text-xs text-muted-foreground">Party *</Label>
              <Select value={docForm.party_id} onValueChange={v => setDocForm({ ...docForm, party_id: v })}>
                <SelectTrigger className="mt-1.5 rounded-xl h-10"><SelectValue placeholder="Select customer / vendor" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {parties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Date & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input type="date" value={docForm.doc_date} onChange={e => setDocForm({ ...docForm, doc_date: e.target.value })} className="mt-1.5 rounded-xl h-10" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={docForm.status} onValueChange={v => setDocForm({ ...docForm, status: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["draft", "paid", "partial", "cancelled"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">Line Items *</Label>
                <Button type="button" variant="outline" size="sm" className="h-7 rounded-full text-xs" onClick={() => setDocLines(prev => [...prev, newLine()])}>
                  <Plus className="h-3 w-3 mr-1" /> Add Line
                </Button>
              </div>
              <div className="space-y-3">
                {docLines.map((line, idx) => (
                  <DocLineRow key={idx} line={line} items={allItems}
                    onChange={(f, v) => updateDocLine(idx, f, v)}
                    onRemove={() => setDocLines(prev => prev.filter((_, i) => i !== idx))}
                  />
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-secondary/20 rounded-2xl p-4 space-y-2 border border-border/30">
              <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal (Taxable)</span><span>{fmtINR(docTotals.subtotal)}</span></div>
              <div className="flex justify-between text-sm text-muted-foreground"><span>CGST</span><span>{fmtINR(docTotals.cgst)}</span></div>
              <div className="flex justify-between text-sm text-muted-foreground"><span>SGST</span><span>{fmtINR(docTotals.sgst)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-border/50 pt-2 mt-1"><span>Grand Total</span><span className="text-accent">{fmtINR(Math.round(docTotals.total))}</span></div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs text-muted-foreground">Notes / Remarks</Label>
              <Textarea rows={3} value={docForm.notes} onChange={e => setDocForm({ ...docForm, notes: e.target.value })} className="mt-1.5 rounded-xl resize-none text-sm" placeholder="Optional notes..." />
            </div>
          </div>

          <div className="px-5 py-4 border-t border-border/50 bg-background">
            <Button onClick={saveDoc} disabled={docBusy} className="w-full rounded-xl h-12 bg-foreground text-background font-semibold">
              {docBusy ? "Saving…" : editingDoc ? "Update Document" : "Create Document"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Expense Sheet ───────────────────────────────────────────────────── */}
      <Sheet open={expSheet} onOpenChange={setExpSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/50 bg-background sticky top-0 z-10">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5 text-accent" />
              {editingExp ? "Edit Expense" : "New Expense"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input type="date" value={expForm.expense_date} onChange={e => setExpForm({ ...expForm, expense_date: e.target.value })} className="mt-1.5 rounded-xl h-10" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Amount (₹) *</Label>
                <Input type="number" min="0" step="0.01" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} className="mt-1.5 rounded-xl h-10" placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={expForm.category} onValueChange={v => setExpForm({ ...expForm, category: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Payment Mode</Label>
                <Select value={expForm.mode} onValueChange={v => setExpForm({ ...expForm, mode: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Paid To</Label>
              <Input value={expForm.paid_to} onChange={e => setExpForm({ ...expForm, paid_to: e.target.value })} className="mt-1.5 rounded-xl h-10" placeholder="Vendor / person name (optional)" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea rows={3} value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} className="mt-1.5 rounded-xl resize-none text-sm" placeholder="What was this expense for?" />
            </div>
          </div>

          <div className="px-5 py-4 border-t border-border/50 bg-background">
            <Button onClick={saveExpense} disabled={expBusy} className="w-full rounded-xl h-12 bg-foreground text-background font-semibold">
              {expBusy ? "Saving…" : editingExp ? "Update Expense" : "Save Expense"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
