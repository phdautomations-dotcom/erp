import { ReactNode, useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, FileText, ShoppingCart, Wallet, Wrench,
  Boxes, Receipt, BarChart3, Inbox, Settings, UserCog, LogOut, Home,
  ClipboardList, Bell, Search, ChevronRight, X, Building2, Camera, Banknote,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";
import { AIAssistant } from "@/components/AIAssistant";
import { supabase } from "@/integrations/supabase/client";
import { fmtINR } from "@/lib/format";

// ─── Nav config ───────────────────────────────────────────────────────────────

export const NAV = [
  { to: "/admin/dashboard", label: "Dashboard",       icon: LayoutDashboard, end: true },
  { to: "/admin/parties",    label: "Parties",         icon: Users },
  { to: "/admin/items",      label: "Items",           icon: Package },
  { to: "/admin/sales",      label: "Sales",           icon: FileText },
  { to: "/admin/purchases",  label: "Purchases",       icon: ShoppingCart },
  { to: "/admin/payments",   label: "Payments",        icon: Wallet },
  { to: "/admin/inventory",  label: "Inventory",       icon: Boxes },
  { to: "/admin/expenses",   label: "Expenses",        icon: Receipt },
  { to: "/admin/cash-ledger", label: "Cash Ledger",     icon: Banknote },
  { to: "/admin/attendance", label: "Attendance & HR", icon: ClipboardList },
  { to: "/admin/reports",    label: "Reports",         icon: BarChart3 },
  { to: "/admin/services",   label: "Service Desk",    icon: Wrench },
  { to: "/admin/leads",      label: "Leads",           icon: Inbox },
  { to: "/admin/users",      label: "Users",           icon: UserCog, adminOnly: true },
  { to: "/admin/settings",   label: "Settings",        icon: Settings },
];

// ─── Global Search ────────────────────────────────────────────────────────────

type SearchResult = { id: string; label: string; sub: string; href: string; icon: React.ElementType };

function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const runSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const like = `%${query}%`;
    const [parties, items, docs, expenses] = await Promise.all([
      supabase.from("parties").select("id,name,phone,city").ilike("name", like).limit(4),
      supabase.from("items").select("id,name,sale_price,unit").ilike("name", like).limit(4),
      supabase.from("documents").select("id,doc_number,doc_type,total,doc_date").ilike("doc_number", like).limit(4),
      (supabase as any).from("expenses").select("id,description,amount,category").ilike("description", like).limit(3),
    ]);

    const mapped: SearchResult[] = [
      ...(parties.data || []).map((p: any) => ({
        id: p.id, label: p.name,
        sub: [p.city, p.phone].filter(Boolean).join(" · "),
        href: "/admin/parties", icon: Users,
      })),
      ...(items.data || []).map((i: any) => ({
        id: i.id, label: i.name,
        sub: `${fmtINR(i.sale_price)} / ${i.unit || "pc"}`,
        href: "/admin/items", icon: Package,
      })),
      ...(docs.data || []).map((d: any) => ({
        id: d.id, label: d.doc_number,
        sub: `${d.doc_type?.replace("_", " ")} · ${fmtINR(d.total)}`,
        href: "/admin/sales", icon: FileText,
      })),
      ...(expenses.data || []).map((e: any) => ({
        id: e.id, label: e.description || e.category,
        sub: `Expense · ${fmtINR(e.amount)}`,
        href: "/admin/expenses", icon: Receipt,
      })),
    ];
    setResults(mapped);
    setLoading(false);
  }, []);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => runSearch(q), 280);
    return () => clearTimeout(t);
  }, [q, runSearch]);

  const pick = (href: string) => {
    navigate(href);
    setOpen(false);
    setQ("");
    setResults([]);
  };

  return (
    <div ref={wrapRef} className="relative hidden md:block w-60">
      {/* Input pill */}
      <div
        className="flex items-center gap-2 px-3.5 h-9 rounded-full border transition-all"
        style={{
          background: "hsl(220 22% 94%)",
          borderColor: open ? "hsl(212 90% 45%)" : "hsl(220 18% 86%)",
          boxShadow: open ? "var(--neu-in)" : "var(--neu-sm)",
        }}
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search parties, invoices…"
          className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
        />
        {q && (
          <button onClick={() => { setQ(""); setResults([]); inputRef.current?.focus(); }}>
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      <AnimatePresence>
        {open && (q.length >= 2) && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-11 left-0 w-80 rounded-2xl overflow-hidden z-50"
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.8)",
              boxShadow: "0 16px 48px hsl(220 30% 15% / 0.14), 0 4px 12px hsl(220 30% 15% / 0.08)",
            }}
          >
            {loading ? (
              <div className="px-4 py-3 text-xs text-muted-foreground animate-pulse">Searching…</div>
            ) : results.length === 0 ? (
              <div className="px-4 py-4 text-sm text-muted-foreground text-center">No results for "{q}"</div>
            ) : (
              <ul className="py-1.5 max-h-72 overflow-y-auto">
                {results.map(r => (
                  <li key={r.id}>
                    <button
                      onClick={() => pick(r.href)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left group"
                    >
                      <div
                        className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "hsl(212 90% 45% / 0.12)" }}
                      >
                        <r.icon className="h-3.5 w-3.5" style={{ color: "hsl(212 90% 45%)" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground truncate group-hover:text-blue-600 transition-colors">{r.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{r.sub}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Notifications Panel ──────────────────────────────────────────────────────

type Notif = { id: string; title: string; sub: string; icon: React.ElementType; href: string; time: string; };

function NotificationsPanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const [overdue, recentExp, newLeads] = await Promise.all([
      supabase.from("documents")
        .select("id,doc_number,total,doc_date,parties(name)")
        .eq("doc_type", "invoice")
        .lte("doc_date", thirtyDaysAgo)
        .order("doc_date", { ascending: false })
        .limit(5),
      (supabase as any).from("expenses")
        .select("id,description,amount,category,expense_date")
        .gte("expense_date", sevenDaysAgo)
        .order("expense_date", { ascending: false })
        .limit(4),
      (supabase as any).from("leads")
        .select("id,name,phone,created_at")
        .gte("created_at", sevenDaysAgo + "T00:00:00Z")
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    const all: Notif[] = [];
    (overdue.data || []).forEach((d: any) => {
      all.push({
        id: `inv-${d.id}`,
        title: `Invoice ${d.doc_number} overdue`,
        sub: `${(d.parties as any)?.name || "Party"} · ${fmtINR(d.total)}`,
        icon: FileText,
        href: "/admin/sales",
        time: d.doc_date,
      });
    });
    (recentExp.data || []).forEach((e: any) => {
      all.push({
        id: `exp-${e.id}`,
        title: e.description || e.category || "Expense",
        sub: `Expense · ${fmtINR(e.amount)}`,
        icon: Receipt,
        href: "/admin/expenses",
        time: e.expense_date || "",
      });
    });
    (newLeads.data || []).forEach((l: any) => {
      all.push({
        id: `lead-${l.id}`,
        title: `New lead: ${l.name}`,
        sub: l.phone || "",
        icon: Inbox,
        href: "/admin/leads",
        time: (l.created_at || "").slice(0, 10),
      });
    });

    setNotifs(all);
    setLoading(false);
  }, []);

  // Load on mount for badge + reload each time panel opens
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (open) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const unread = notifs.length;

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground transition-colors shrink-0"
        style={{ boxShadow: "var(--neu-sm)", background: "hsl(220 22% 94%)" }}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 h-4 w-4 rounded-full ring-2 ring-white flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: "hsl(212 90% 45%)" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 w-80 rounded-2xl overflow-hidden z-50"
            style={{
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.85)",
              boxShadow: "0 16px 48px hsl(220 30% 15% / 0.14), 0 4px 12px hsl(220 30% 15% / 0.08)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid hsl(220 18% 90%)" }}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Notifications</h3>
                {unread > 0 && (
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ background: "hsl(212 90% 45%)" }}
                  >
                    {unread}
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={() => setNotifs([])}
                  className="text-[11px] text-muted-foreground hover:text-blue-600 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground animate-pulse">Loading…</div>
            ) : notifs.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            ) : (
              <ul className="py-1 max-h-80 overflow-y-auto divide-y divide-border/40">
                {notifs.map(n => (
                  <li key={n.id}>
                    <button
                      onClick={() => { setNotifs(prev => prev.filter(x => x.id !== n.id)); navigate(n.href); setOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left group"
                    >
                      <div
                        className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "hsl(212 90% 45% / 0.12)" }}
                      >
                        <n.icon className="h-4 w-4" style={{ color: "hsl(212 90% 45%)" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground truncate group-hover:text-blue-600 transition-colors">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{n.sub}</p>
                      </div>
                      {n.time && (
                        <span className="text-[10px] text-muted-foreground/50 shrink-0 ml-1">{n.time}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── User Avatar Menu ─────────────────────────────────────────────────────────

function UserAvatarMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { avatarUrl, pendingImage, cropOpen, uploading, uploadError, selectFile, cancelCrop, confirmCrop } = useAvatarUpload();
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const initial = (user?.email?.[0] ?? "A").toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onCropConfirm = async (blob: Blob) => {
    await confirmCrop(blob);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button onClick={() => setOpen(v => !v)} className="shrink-0 focus:outline-none">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="avatar"
            className="h-11 w-11 rounded-xl object-cover"
            style={{ boxShadow: "0 4px 12px hsl(212 90% 45% / 0.4)" }}
          />
        ) : (
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center text-base font-bold text-white"
            style={{
              background: "linear-gradient(135deg, hsl(212 90% 45%), hsl(200 90% 55%))",
              boxShadow: "0 4px 12px hsl(212 90% 45% / 0.4)",
            }}
          >
            {initial}
          </div>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 w-52 rounded-2xl overflow-hidden z-50"
            style={{
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.85)",
              boxShadow: "0 16px 48px hsl(220 30% 15% / 0.14), 0 4px 12px hsl(220 30% 15% / 0.08)",
            }}
          >
            {/* User info */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid hsl(220 18% 90%)" }}>
              <div className="shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <div
                    className="h-14 w-14 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                    style={{ background: "linear-gradient(135deg, hsl(212 90% 45%), hsl(200 90% 55%))" }}
                  >
                    {initial}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-foreground truncate">{user?.email?.split("@")[0]}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="py-1.5">
              {uploadError && (
                <p className="mx-4 mb-2 text-[11px] text-red-500 bg-red-50 rounded-lg px-3 py-2 leading-tight">
                  {uploadError.includes("Bucket not found")
                    ? "Storage bucket 'avatars' not found. Create it in Supabase → Storage."
                    : uploadError}
                </p>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left text-[13px] text-foreground hover:text-blue-600 disabled:opacity-60"
              >
                <Camera className="h-3.5 w-3.5 shrink-0" />
                {uploading ? "Uploading…" : "Upload photo"}
              </button>
              <button
                onClick={async () => { await signOut(); navigate("/auth"); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-red-50 transition-colors text-left text-[13px] text-red-500"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                Sign out
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} />
          </motion.div>
        )}
      </AnimatePresence>

      <AvatarCropDialog imageSrc={pendingImage} open={cropOpen} onCancel={cancelCrop} onConfirm={onCropConfirm} busy={uploading} />
    </div>
  );
}

// ─── Top header ───────────────────────────────────────────────────────────────

function TopHeader({ title }: { title?: string }) {
  const navigate = useNavigate();
  return (
    <header
      className="shrink-0 z-30 flex flex-col"
      style={{
        background: "rgba(255,255,255,0.80)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.9)",
        boxShadow: "0 1px 0 hsl(220 18% 86%), 0 4px 16px hsl(220 25% 15% / 0.06)",
      }}
    >
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        {/* Home — back to the tile launcher */}
        <button
          onClick={() => navigate("/admin")}
          title="Home"
          className="flex items-center justify-center h-9 w-9 rounded-xl text-muted-foreground hover:text-accent transition-colors shrink-0"
          style={{ boxShadow: "var(--neu-sm)", background: "hsl(220 22% 94%)" }}
        >
          <Home className="h-4.5 w-4.5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0 mr-2">
          <Building2 className="h-4 w-4 text-muted-foreground/60 hidden sm:block shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground hidden sm:block">PHD ERP</span>
          {title && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 hidden sm:block shrink-0" />
              <h1 className="text-sm font-bold text-foreground truncate">{title}</h1>
            </>
          )}
        </div>

        <div className="flex-1" />

        {/* Global search */}
        <GlobalSearch />

        {/* Notifications bell */}
        <NotificationsPanel />

        {/* User avatar + menu */}
        <UserAvatarMenu />
      </div>

      {/* Brand accent underline strip */}
      <div
        className="h-0.5 w-full shrink-0"
        style={{ background: "linear-gradient(90deg, hsl(212 90% 45%), hsl(243 75% 59%) 40%, transparent)" }}
      />
    </header>
  );
}

// ─── Layout root ──────────────────────────────────────────────────────────────

export const AdminLayout = ({ children, title }: { children: ReactNode; title?: string }) => {
  return (
    <>
    <div
      className="w-full flex flex-col overflow-hidden"
      style={{
        background: "hsl(220 22% 94%)",
        zoom: 0.9,
        height: "calc(100vh / 0.9)",      /* compensate zoom so it fills full viewport */
        maxHeight: "calc(100vh / 0.9)",
      } as any}
    >
      <TopHeader title={title} />

      <motion.main
        key={title}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6"
      >
        {children}
      </motion.main>
    </div>
    <AIAssistant />
    </>
  );
};
