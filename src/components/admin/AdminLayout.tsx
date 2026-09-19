import { ReactNode, Suspense, createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation, Link, Outlet } from "react-router-dom";
import {
  Users, Package, FileText, Wallet, Receipt, Inbox, UserCog, LogOut, Home, ArrowLeft,
  Bell, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X,
  Building2, Camera, Banknote, Sparkles, PartyPopper, Menu, PanelLeft,
} from "@/lib/icons";
import { useAuth } from "@/hooks/useAuth";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { useNavStyle, NavStyle } from "@/hooks/useNavStyle";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";
import { AIAssistant } from "@/components/AIAssistant";
import { BrandMark } from "@/components/BrandMark";
import { supabase } from "@/integrations/supabase/client";
import { fmtINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUITheme, type UITheme } from "@/lib/uiTheme";
import { Button } from "@/components/ui/button";
import { Loader, PageLoader } from "@/components/ui/loader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NAV } from "./nav";
import { IosSidebar, IosTabBar } from "./IosNav";

// The module list lives in ./nav (shared with the iOS tab bar); re-exported for existing imports.
export { NAV };

// The app ships three selectable designs (see lib/uiTheme.ts): "material" (Google
// Material 3, default), "minimal" (the earlier flat design) and "ios" (Liquid Glass).
// Everything in this file that looks different between them reads `useUITheme()`.

// ─── What's New — shown once per browser after a version ships ────────────────

const APP_VERSION = "3.0";
const WHATS_NEW_KEY = `asta_whats_new_seen_v${APP_VERSION}`;

function WhatsNewDialog() {
  const [open, setOpen] = useState(false);
  const theme = useUITheme();

  useEffect(() => {
    if (!localStorage.getItem(WHATS_NEW_KEY)) {
      setOpen(true);
      localStorage.setItem(WHATS_NEW_KEY, "1");
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="text-center sm:max-w-sm">
        <DialogHeader className="items-center pr-0 text-center">
          {theme === "material" ? (
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-[20px] bg-primary-container text-on-primary-container">
              <PartyPopper className="h-8 w-8" />
            </div>
          ) : theme === "ios" ? (
            <div
              className="mb-2 flex h-16 w-16 items-center justify-center rounded-[22px] text-white"
              style={{ backgroundImage: "linear-gradient(160deg, #5AC8FA, #007AFF)", boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.5), 0 8px 20px rgb(0 122 255 / 0.35)" }}
            >
              <PartyPopper className="h-8 w-8" />
            </div>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg shadow-accent/30 mb-2" style={{ backgroundImage: "var(--gradient-brand)" }}>
              <PartyPopper className="h-7 w-7" />
            </div>
          )}
          <DialogTitle className={cn("text-center", theme === "minimal" && "font-display text-xl font-bold")}>Welcome to ASTA One {APP_VERSION}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          {theme === "material"
            ? "A redesigned, faster experience — a Material look across the app, a new dashboard and clearer receivables & payables. Go explore!"
            : theme === "ios"
              ? "A redesigned, faster experience — Liquid Glass surfaces, a new dashboard and clearer receivables & payables. Go explore!"
              : "A redesigned, faster experience — new dashboard, clearer receivables & payables, and a cleaner look across the app. Go explore!"}
        </p>
        <Button onClick={() => setOpen(false)} className={cn("w-full mt-2", theme === "minimal" && "rounded-full btn-gradient")}>
          Let's go
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/70 pt-1">
          <Sparkles className="h-3 w-3 text-accent" /> Crafted by <span className="font-semibold text-foreground/70">Saffyre Intelligence Labs</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shared building blocks ───────────────────────────────────────────────────

const NAV_COLLAPSED_KEY = "asta_sidebar_collapsed";

const ICON_BTN: Record<UITheme, string> = {
  // soft 36px rounded square
  minimal:
    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-accent [&_svg]:h-[18px] [&_svg]:w-[18px]",
  // 40px circle with state layer + ripple
  material:
    "md-ripple md-state relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:h-[22px] [&_svg]:w-[22px]",
  // frosted-glass circle that shrinks when pressed
  ios: "ios-glass-btn ios-press relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground/75 transition-colors [&_svg]:h-5 [&_svg]:w-5",
};

function IconButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const theme = useUITheme();
  return <button {...props} className={cn(ICON_BTN[theme], className)} />;
}

// ─── Navigation drawer / sidebar ──────────────────────────────────────────────
// One nav-item list shared by the docked desktop drawer (collapses to an
// icon-only rail) and the modal drawer used on phones/tablets. Material: the
// active destination is a "secondary container" pill. Minimal: a glowing
// gradient pill. Both use an ultra-slim scrollbar. (iOS has its own — IosNav.tsx.)

function NavItems({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
  const location = useLocation();
  const { hasRole } = useAuth();
  const material = useUITheme() === "material";
  const items = NAV.filter(n => !n.adminOnly || hasRole("admin"));

  return (
    <nav
      className={cn(
        "scrollbar-slim flex-1 overflow-y-auto overflow-x-hidden",
        material ? "space-y-1 px-3 pb-4 pt-1" : "space-y-0.5 px-2.5 py-3",
      )}
    >
      {items.map(item => {
        const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            className={
              material
                ? cn(
                    "md-ripple md-state flex h-11 items-center rounded-full text-sm font-medium transition-colors",
                    collapsed ? "mx-auto w-11 justify-center" : "gap-3.5 px-4",
                    active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
                  )
                : cn(
                    "group relative flex h-9 items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                    collapsed ? "justify-center px-0" : "px-2.5",
                    active ? "text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
            }
            style={!material && active ? { backgroundImage: "var(--gradient-brand)", boxShadow: "0 3px 12px hsl(243 75% 59% / 0.35)" } : undefined}
          >
            {material ? (
              <item.icon className="h-[22px] w-[22px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
            ) : (
              <item.icon className={cn("h-4 w-4 shrink-0 transition-transform duration-150", !active && "group-hover:scale-110 group-hover:text-accent")} />
            )}
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

// Minimal theme: logo row at the top of the sidebar
function MinimalSidebarLogo({ onClose, collapsed }: { onClose?: () => void; collapsed?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 h-14 shrink-0 ${collapsed ? "justify-center px-2" : "px-4"}`}>
      <BrandMark />
      {!collapsed && <span className="font-display text-[15px] font-bold text-foreground truncate">ASTA One</span>}
      {onClose && (
        <button onClick={onClose} className="ml-auto flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:bg-muted shrink-0">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Docked drawer (desktop). Material: sits on the page canvas, toggled from the
// top bar. Minimal: a white sidebar with its own logo row and collapse button.
// iOS: a floating glass sidebar.
function NavDrawer({ collapsed, onToggle, className }: { collapsed: boolean; onToggle: () => void; className?: string }) {
  const theme = useUITheme();

  if (theme === "ios") return <IosSidebar collapsed={collapsed} className={className} />;

  if (theme === "material") {
    return (
      <aside
        className={cn(
          "hidden min-h-0 shrink-0 flex-col overflow-hidden transition-[width] duration-300 ease-emphasized lg:flex",
          collapsed ? "w-[72px]" : "w-[232px]",
          className,
        )}
      >
        <NavItems collapsed={collapsed} />
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex min-h-0 flex-col shrink-0 bg-card border-r border-border/70 transition-[width] duration-200 ease-out",
        collapsed ? "w-[60px]" : "w-52",
        className,
      )}
    >
      <MinimalSidebarLogo collapsed={collapsed} />
      <NavItems collapsed={collapsed} />
      <div className="p-2.5 shrink-0">
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center h-8 w-full rounded-lg text-muted-foreground bg-muted/50 hover:bg-muted hover:text-accent transition-colors",
            collapsed ? "justify-center" : "justify-center gap-1.5",
          )}
        >
          {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <><ChevronsLeft className="h-3.5 w-3.5" /><span className="text-[11px] font-medium">Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}

// Modal drawer (phones / tablets) — Material & Minimal only; iOS uses its tab bar instead
function MobileNavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const material = useUITheme() === "material";
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={cn("fixed inset-0 z-[80] lg:hidden", material ? "bg-black/[0.32]" : "bg-black/40")}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={material ? { duration: 0.25, ease: [0.2, 0, 0, 1] } : { duration: 0.2, ease: "easeOut" }}
            className={cn(
              "fixed bottom-0 left-0 top-0 z-[90] flex flex-col lg:hidden",
              material ? "w-72 rounded-r-[28px] bg-surface-container-low shadow-xl" : "w-60 bg-card shadow-2xl border-r border-border/70",
            )}
          >
            {material ? (
              <div className="flex h-16 shrink-0 items-center gap-3 pl-5 pr-3">
                <BrandMark />
                <span className="font-display text-xl leading-none text-foreground">ASTA One</span>
                <IconButton onClick={onClose} className="ml-auto" title="Close menu"><X /></IconButton>
              </div>
            ) : (
              <div className="border-b border-border/70">
                <MinimalSidebarLogo onClose={onClose} />
              </div>
            )}
            <NavItems onNavigate={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Global Search ────────────────────────────────────────────────────────────

type SearchResult = { id: string; label: string; sub: string; href: string; icon: React.ElementType };

const SEARCH: Record<UITheme, {
  pill: (open: boolean) => string; icon: string; clearBtn: string; clearIcon: string;
  overlay: string; overlayIcon: string; dropdown: string; list: string; loading: string; empty: string;
  item: string; itemIcon: string; itemIconSize: string; label: string; sub: string; chevron: string;
}> = {
  minimal: {
    pill: (open) => cn("hidden md:flex items-center gap-2 px-3.5 h-9 w-60 rounded-full border bg-muted/60 transition-colors", open ? "border-accent" : "border-border"),
    icon: "h-3.5 w-3.5 shrink-0 text-muted-foreground",
    clearBtn: "",
    clearIcon: "h-3.5 w-3.5 text-muted-foreground hover:text-foreground",
    overlay: "md:hidden fixed left-3 right-3 top-16 z-[70] flex items-center gap-2 px-3.5 h-11 rounded-full bg-card shadow-lg border border-accent",
    overlayIcon: "h-4 w-4",
    dropdown: "z-[70] overflow-hidden fixed left-3 right-3 top-28 md:absolute md:left-0 md:right-auto md:top-11 md:w-80 rounded-2xl bg-card border border-border shadow-lg",
    list: "py-1.5 max-h-72",
    loading: "px-4 py-3",
    empty: "px-4 py-4",
    item: "group flex w-full items-center gap-3 text-left px-4 py-2.5 hover:bg-accent/5 transition-colors",
    itemIcon: "h-7 w-7 rounded-lg bg-accent/10 text-accent",
    itemIconSize: "h-3.5 w-3.5",
    label: "text-[13px] group-hover:text-accent transition-colors",
    sub: "text-[11px]",
    chevron: "h-3.5 w-3.5 text-muted-foreground/40",
  },
  material: {
    pill: (open) => cn(
      "hidden items-center md:flex h-11 gap-3 rounded-full px-4 transition-all duration-200 md:w-[300px] lg:w-[380px] xl:w-[440px]",
      open ? "bg-card shadow-md ring-1 ring-outline-variant" : "bg-surface-container-high hover:bg-surface-container-highest",
    ),
    icon: "h-5 w-5 shrink-0 text-muted-foreground",
    clearBtn: "-mr-1 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.08] hover:text-foreground",
    clearIcon: "h-4 w-4 text-muted-foreground",
    overlay: "md:hidden fixed left-3 right-3 top-16 z-[70] flex items-center rounded-full bg-card shadow-lg h-12 gap-3 px-4 ring-1 ring-outline-variant",
    overlayIcon: "h-5 w-5",
    dropdown: "z-[70] overflow-hidden fixed left-3 right-3 top-[7.5rem] rounded-[20px] bg-popover shadow-lg md:absolute md:left-auto md:right-0 md:top-[3.25rem] md:w-[420px]",
    list: "max-h-80 py-2",
    loading: "px-5 py-4",
    empty: "px-5 py-6",
    item: "group flex w-full items-center gap-3 text-left md-ripple md-state px-4 py-2.5",
    itemIcon: "h-9 w-9 rounded-full bg-primary-container text-on-primary-container",
    itemIconSize: "h-[18px] w-[18px]",
    label: "text-sm",
    sub: "text-xs",
    chevron: "h-4 w-4 text-muted-foreground/50",
  },
  ios: {
    pill: (open) => cn(
      "hidden items-center md:flex h-10 gap-2.5 rounded-full px-3.5 transition-all duration-200 md:w-[260px] lg:w-[340px]",
      open ? "bg-white/90 shadow-md ring-2 ring-primary/40" : "bg-black/[0.06] hover:bg-black/[0.08]",
    ),
    icon: "h-[18px] w-[18px] shrink-0 text-muted-foreground",
    clearBtn: "flex h-5 w-5 items-center justify-center rounded-full bg-black/25 text-white",
    clearIcon: "h-3 w-3 text-white",
    overlay: "ios-glass-strong md:hidden fixed left-3 right-3 top-[4.75rem] z-[70] flex h-12 items-center gap-2.5 rounded-full px-4",
    overlayIcon: "h-[18px] w-[18px]",
    dropdown: "ios-glass-sheet z-[70] overflow-hidden fixed left-3 right-3 top-[8.25rem] rounded-[24px] md:absolute md:left-auto md:right-0 md:top-12 md:w-[420px]",
    list: "max-h-80 py-2",
    loading: "px-5 py-4",
    empty: "px-5 py-6",
    item: "group ios-press flex w-full items-center gap-3 text-left px-4 py-2.5 hover:bg-black/[0.04]",
    itemIcon: "h-9 w-9 rounded-[11px] bg-primary/[0.12] text-primary",
    itemIconSize: "h-[18px] w-[18px]",
    label: "text-[15px]",
    sub: "text-xs",
    chevron: "h-4 w-4 text-muted-foreground/50",
  },
};

function GlobalSearch() {
  const navigate = useNavigate();
  const theme = useUITheme();
  const s = SEARCH[theme];
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
    const [parties, items, docs, expenses, payments, cash, leads, profiles] = await Promise.all([
      supabase.from("parties").select("id,name,phone,city").ilike("name", like).limit(4),
      supabase.from("items").select("id,name,sale_price,unit").ilike("name", like).limit(4),
      supabase.from("documents").select("id,doc_number,doc_type,total,doc_date").ilike("doc_number", like).limit(4),
      (supabase as any).from("expenses").select("id,description,amount,category").ilike("description", like).limit(3),
      supabase.from("payments").select("id,payment_number,amount,direction").ilike("payment_number", like).limit(3),
      (supabase as any).from("cash_ledger").select("id,description,amount,type").ilike("description", like).limit(3),
      (supabase as any).from("leads").select("id,name,phone,status").ilike("name", like).limit(3),
      supabase.from("profiles").select("user_id,display_name,phone").ilike("display_name", like).limit(3),
    ]);

    const mapped: SearchResult[] = [
      ...(parties.data || []).map((p: any) => ({
        id: p.id, label: p.name,
        sub: [p.city, p.phone].filter(Boolean).join(" · "),
        href: `/admin/parties/${p.id}`, icon: Users,
      })),
      ...(items.data || []).map((i: any) => ({
        id: i.id, label: i.name,
        sub: `${fmtINR(i.sale_price)} / ${i.unit || "pc"}`,
        href: `/admin/items/${i.id}`, icon: Package,
      })),
      ...(docs.data || []).map((d: any) => ({
        id: d.id, label: d.doc_number,
        sub: `${d.doc_type?.replace("_", " ")} · ${fmtINR(d.total)}`,
        href: `/admin/${["purchase_bill", "purchase_order"].includes(d.doc_type) ? "purchases" : "sales"}/${d.id}`, icon: FileText,
      })),
      ...(expenses.data || []).map((e: any) => ({
        id: e.id, label: e.description || e.category,
        sub: `Expense · ${fmtINR(e.amount)}`,
        href: "/admin/expenses", icon: Receipt,
      })),
      ...(payments.data || []).map((p: any) => ({
        id: p.id, label: p.payment_number,
        sub: `Payment ${p.direction === "received" ? "received" : "made"} · ${fmtINR(p.amount)}`,
        href: "/admin/payments", icon: Wallet,
      })),
      ...(cash.data || []).map((c: any) => ({
        id: c.id, label: c.description || (c.type === "in" ? "Credit entry" : "Debit entry"),
        sub: `Cash ledger · ${fmtINR(c.amount)}`,
        href: "/admin/cash-ledger", icon: Banknote,
      })),
      ...(leads.data || []).map((l: any) => ({
        id: l.id, label: l.name,
        sub: [l.status, l.phone].filter(Boolean).join(" · "),
        href: "/admin/leads", icon: Inbox,
      })),
      ...(profiles.data || []).map((u: any) => ({
        id: u.user_id, label: u.display_name || "Unnamed",
        sub: [u.phone].filter(Boolean).join(" · ") || "User",
        href: "/admin/users", icon: UserCog,
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
    <div ref={wrapRef} className="relative">
      {/* Mobile: icon-only trigger — the full search bar doesn't fit at phone widths */}
      <IconButton onClick={() => setOpen(v => !v)} className="md:hidden" title="Search">
        <Search />
      </IconButton>

      {/* Desktop: inline search field (style depends on the theme) */}
      <div className={s.pill(open)}>
        <Search className={s.icon} />
        <input
          ref={inputRef}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search everything…"
          className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
        />
        {q && (
          <button onClick={() => { setQ(""); setResults([]); inputRef.current?.focus(); }} className={s.clearBtn || undefined}>
            <X className={s.clearIcon} />
          </button>
        )}
      </div>

      {/* Mobile: full-width input, only rendered while open (so autoFocus fires on each open) */}
      {open && (
        <div className={s.overlay}>
          <Search className={cn("shrink-0 text-muted-foreground", s.overlayIcon)} />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search everything…"
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
          />
          {q && (
            <button onClick={() => setQ("")} className={s.clearBtn || undefined}>
              <X className={cn(s.clearIcon, theme === "minimal" && "h-4 w-4")} />
            </button>
          )}
        </div>
      )}

      {/* Dropdown results — shared markup, positioned per breakpoint */}
      <AnimatePresence>
        {open && (q.length >= 2) && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={s.dropdown}
          >
            {loading ? (
              <div className={cn("text-xs text-muted-foreground animate-pulse", s.loading)}>Searching…</div>
            ) : results.length === 0 ? (
              <div className={cn("text-sm text-muted-foreground text-center", s.empty)}>No results for "{q}"</div>
            ) : (
              <ul className={cn("scrollbar-slim overflow-y-auto", s.list)}>
                {results.map(r => (
                  <li key={r.id}>
                    <button onClick={() => pick(r.href)} className={s.item}>
                      <div className={cn("flex shrink-0 items-center justify-center", s.itemIcon)}>
                        <r.icon className={s.itemIconSize} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate font-medium text-foreground", s.label)}>{r.label}</p>
                        <p className={cn("truncate text-muted-foreground", s.sub)}>{r.sub}</p>
                      </div>
                      <ChevronRight className={cn("shrink-0", s.chevron)} />
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

const NOTIF: Record<UITheme, {
  badge: string; panel: string; header: string; title: string; chip: string; markAll: string;
  empty: string; emptyIcon: string; list: string; item: string; itemIcon: string; itemIconSize: string;
  itemTitle: string; itemSub: string; itemTime: string;
}> = {
  minimal: {
    badge: "-top-1 -right-1 h-4 w-4 ring-2 ring-white bg-accent text-[9px] font-bold text-white",
    panel: "z-50 overflow-hidden absolute right-0 top-11 w-80 rounded-2xl bg-card border border-border shadow-lg",
    header: "px-4 py-3 border-b border-border",
    title: "text-sm font-bold",
    chip: "text-[11px] font-semibold text-white bg-accent",
    markAll: "text-[11px] text-muted-foreground hover:text-accent transition-colors",
    empty: "px-4 py-8",
    emptyIcon: "text-muted-foreground/30",
    list: "py-1 divide-y divide-border/40",
    item: "px-4 py-3 hover:bg-accent/5 transition-colors",
    itemIcon: "h-8 w-8 rounded-xl bg-accent/10 text-accent",
    itemIconSize: "h-4 w-4",
    itemTitle: "text-[13px] group-hover:text-accent transition-colors",
    itemSub: "text-[11px]",
    itemTime: "text-[10px] text-muted-foreground/50",
  },
  material: {
    badge: "right-1 top-1 h-4 min-w-4 bg-destructive px-1 text-[10px] text-destructive-foreground",
    panel: "z-50 overflow-hidden fixed right-3 top-16 w-[calc(100vw-1.5rem)] max-w-[360px] rounded-[20px] bg-popover shadow-lg sm:absolute sm:right-0 sm:top-[3.25rem] sm:w-[360px]",
    header: "px-5 py-3.5",
    title: "font-display text-base font-medium",
    chip: "bg-primary-container text-[11px] font-medium text-on-primary-container",
    markAll: "md-ripple md-state rounded-full px-3 py-1.5 text-xs font-medium text-primary",
    empty: "px-5 pb-8 pt-4",
    emptyIcon: "text-muted-foreground/40",
    list: "pb-2",
    item: "md-ripple md-state px-5 py-3",
    itemIcon: "h-10 w-10 rounded-full bg-primary-container text-on-primary-container",
    itemIconSize: "h-5 w-5",
    itemTitle: "text-sm",
    itemSub: "text-xs",
    itemTime: "text-[11px]",
  },
  ios: {
    badge: "right-0.5 top-0.5 h-[18px] min-w-[18px] bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground",
    panel: "ios-glass-sheet z-50 overflow-hidden fixed right-3 top-[4.75rem] w-[calc(100vw-1.5rem)] max-w-[380px] rounded-[26px] sm:absolute sm:right-0 sm:top-12 sm:w-[380px]",
    header: "px-5 py-4",
    title: "font-display text-[17px] font-semibold tracking-tight",
    chip: "bg-primary/[0.14] text-[11px] font-semibold text-primary",
    markAll: "ios-press rounded-full px-3 py-1.5 text-[13px] font-medium text-primary",
    empty: "px-5 pb-8 pt-4",
    emptyIcon: "text-muted-foreground/40",
    list: "pb-2",
    item: "ios-press px-5 py-3 hover:bg-black/[0.04]",
    itemIcon: "h-10 w-10 rounded-[12px] bg-primary/[0.12] text-primary",
    itemIconSize: "h-5 w-5",
    itemTitle: "text-[15px]",
    itemSub: "text-xs",
    itemTime: "text-[11px]",
  },
};

function NotificationsPanel() {
  const navigate = useNavigate();
  const theme = useUITheme();
  const n = NOTIF[theme];
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
      <IconButton onClick={() => setOpen(v => !v)} title="Notifications">
        <Bell />
        {unread > 0 && (
          <span className={cn("absolute flex items-center justify-center rounded-full font-medium leading-none", n.badge)}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </IconButton>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={n.panel}
          >
            {/* Header */}
            <div className={cn("flex items-center justify-between", n.header)}>
              <div className="flex items-center gap-2">
                <h3 className={cn("text-foreground", n.title)}>Notifications</h3>
                {unread > 0 && (
                  <span className={cn("rounded-full px-2 py-0.5", n.chip)}>{unread}</span>
                )}
              </div>
              {unread > 0 && (
                <button onClick={() => setNotifs([])} className={n.markAll}>
                  Mark all read
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center px-5 py-8"><Loader size={32} /></div>
            ) : notifs.length === 0 ? (
              <div className={cn("text-center", n.empty)}>
                <Bell className={cn("mx-auto mb-2 h-8 w-8", n.emptyIcon)} />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            ) : (
              <ul className={cn("scrollbar-slim max-h-80 overflow-y-auto", n.list)}>
                {notifs.map(x => (
                  <li key={x.id}>
                    <button
                      onClick={() => { setNotifs(prev => prev.filter(y => y.id !== x.id)); navigate(x.href); setOpen(false); }}
                      className={cn("group flex w-full items-center gap-3 text-left", n.item)}
                    >
                      <div className={cn("flex shrink-0 items-center justify-center", n.itemIcon)}>
                        <x.icon className={n.itemIconSize} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate font-medium text-foreground", n.itemTitle)}>{x.title}</p>
                        <p className={cn("truncate text-muted-foreground", n.itemSub)}>{x.sub}</p>
                      </div>
                      {x.time && (
                        <span className={cn("ml-1 shrink-0 text-muted-foreground", n.itemTime)}>{x.time}</span>
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

const AVATAR_MENU: Record<UITheme, string> = {
  minimal: "top-11 w-52 rounded-2xl bg-card border border-border shadow-lg",
  material: "top-[3.25rem] w-[280px] rounded-[28px] bg-popover shadow-lg",
  ios: "ios-glass-sheet top-12 w-[290px] rounded-[28px]",
};
const AVATAR_ACTION: Record<UITheme, { base: string; danger: string; icon: string }> = {
  minimal: {
    base: "w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-accent/5 transition-colors text-left text-[13px] text-foreground hover:text-accent disabled:opacity-60",
    danger: "w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-red-50 transition-colors text-left text-[13px] text-red-500",
    icon: "h-3.5 w-3.5",
  },
  material: {
    base: "md-ripple md-state flex h-11 w-full items-center gap-3 rounded-full px-4 text-left text-sm font-medium text-foreground disabled:opacity-60",
    danger: "md-ripple md-state flex h-11 w-full items-center gap-3 rounded-full px-4 text-left text-sm font-medium text-destructive",
    icon: "h-[18px] w-[18px] text-muted-foreground",
  },
  ios: {
    base: "ios-press flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-[15px] font-medium text-foreground hover:bg-black/[0.04] disabled:opacity-60",
    danger: "ios-press flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-[15px] font-medium text-destructive hover:bg-destructive/[0.06]",
    icon: "h-[18px] w-[18px] text-primary",
  },
};

function UserAvatarMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const theme = useUITheme();
  const act = AVATAR_ACTION[theme];
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

  const gradientAvatar = { background: "linear-gradient(135deg, hsl(258 90% 66%), hsl(243 75% 59%))" };
  const centred = theme !== "minimal"; // Material + iOS: Google/Apple-style account card

  return (
    <div ref={wrapRef} className="relative">
      {theme === "material" ? (
        <button
          onClick={() => setOpen(v => !v)}
          title={user?.email ?? "Account"}
          className="md-ripple flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-base font-medium text-on-primary-container">
              {initial}
            </div>
          )}
        </button>
      ) : theme === "ios" ? (
        <button
          onClick={() => setOpen(v => !v)}
          title={user?.email ?? "Account"}
          className="ios-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="h-10 w-10 rounded-full object-cover ring-2 ring-white/80" />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-semibold text-white ring-2 ring-white/80"
              style={{ backgroundImage: "linear-gradient(160deg, #5AC8FA, #007AFF)" }}
            >
              {initial}
            </div>
          )}
        </button>
      ) : (
        <button onClick={() => setOpen(v => !v)} className="shrink-0 focus:outline-none">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="h-11 w-11 rounded-xl object-cover" style={{ boxShadow: "0 4px 12px hsl(243 75% 59% / 0.4)" }} />
          ) : (
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center text-base font-bold text-white"
              style={{ ...gradientAvatar, boxShadow: "0 4px 12px hsl(243 75% 59% / 0.4)" }}
            >
              {initial}
            </div>
          )}
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={cn("absolute right-0 z-50 overflow-hidden", AVATAR_MENU[theme])}
          >
            {/* User info */}
            {centred ? (
              <div className="flex flex-col items-center px-5 pb-3 pt-6 text-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="h-16 w-16 rounded-full object-cover" />
                ) : theme === "ios" ? (
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full font-display text-2xl font-semibold text-white"
                    style={{ backgroundImage: "linear-gradient(160deg, #5AC8FA, #007AFF)" }}
                  >
                    {initial}
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-container font-display text-2xl text-on-primary-container">
                    {initial}
                  </div>
                )}
                <p className="mt-3 max-w-full truncate font-display text-base font-medium text-foreground">{user?.email?.split("@")[0]}</p>
                <p className="max-w-full truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <div className="shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="h-14 w-14 rounded-xl object-cover" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl flex items-center justify-center text-lg font-bold text-white" style={gradientAvatar}>
                      {initial}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground truncate">{user?.email?.split("@")[0]}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className={centred ? "space-y-1 px-3 pb-3" : "py-1.5"}>
              {uploadError && (
                <p
                  className={cn(
                    "mb-2 rounded-lg px-3 py-2 text-[11px] leading-tight",
                    theme === "minimal" ? "mx-4 text-red-500 bg-red-50" : "bg-error-container text-on-error-container",
                  )}
                >
                  {uploadError.includes("Bucket not found")
                    ? "Storage bucket 'avatars' not found. Create it in Supabase → Storage."
                    : uploadError}
                </p>
              )}
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className={act.base}>
                <Camera className={cn("shrink-0", act.icon)} />
                {uploading ? "Uploading…" : "Upload photo"}
              </button>
              <button onClick={async () => { await signOut(); navigate("/auth"); }} className={act.danger}>
                <LogOut className={cn("shrink-0", theme === "ios" ? "h-[18px] w-[18px]" : act.icon.replace("text-muted-foreground", ""))} />
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

// ─── Top bars ─────────────────────────────────────────────────────────────────

type BarProps = { title?: string; navStyle: NavStyle; onMenuClick: () => void; className?: string };

// MATERIAL — Google-Workspace-style bar: menu · brand · (back + page title) … search · bell · account.
// Sits flush on the page canvas (no border/shadow) like an M3 small top app bar.
function TopAppBar({ title, navStyle, onMenuClick, className }: BarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/admin";
  const homeTo = navStyle === "sidebar" ? "/admin/dashboard" : "/admin";
  return (
    <header className={cn("z-30 flex h-16 shrink-0 items-center gap-1 bg-background px-2 sm:px-4", className)}>
      {/* Menu — collapses the drawer on desktop, opens the modal drawer on phones */}
      {navStyle === "sidebar" && (
        <IconButton onClick={onMenuClick} title="Menu"><Menu /></IconButton>
      )}

      {/* Brand — jumps to the home destination for the current navigation style */}
      <Link
        to={homeTo}
        title="Home"
        className="md-ripple md-state mr-1 flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BrandMark className="h-8 w-8 rounded-[10px]" />
        <span className="hidden font-display text-[20px] leading-none text-foreground sm:block">ASTA One</span>
      </Link>

      {/* Back — return to wherever you came from, not just Home */}
      {!isHome && (
        <IconButton onClick={() => navigate(-1)} title="Back"><ArrowLeft /></IconButton>
      )}

      {title && (
        <div className="flex min-w-0 items-center gap-1">
          <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/50 md:block" />
          <h1 className="min-w-0 truncate font-display text-base font-medium text-foreground">{title}</h1>
        </div>
      )}

      <div className="flex-1" />

      <GlobalSearch />
      <NotificationsPanel />
      <UserAvatarMenu />
    </header>
  );
}

// MINIMAL — the earlier flat white header with back / home buttons and a breadcrumb
function TopHeader({ title, navStyle, onMenuClick, className }: BarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/admin";
  return (
    <header className={cn("shrink-0 z-30 flex flex-col bg-card border-b border-border shadow-sm", className)}>
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        {/* Hamburger — opens the mobile nav drawer; only relevant in sidebar mode */}
        {navStyle === "sidebar" && (
          <IconButton onClick={onMenuClick} title="Menu" className="lg:hidden"><Menu /></IconButton>
        )}

        {/* Back — return to wherever you came from, not just Home */}
        {!isHome && (
          <IconButton onClick={() => navigate(-1)} title="Back"><ArrowLeft /></IconButton>
        )}

        {/* Home — sidebar mode: jump to Dashboard; tile mode: back to the tile launcher */}
        <IconButton onClick={() => navigate(navStyle === "sidebar" ? "/admin/dashboard" : "/admin")} title="Home"><Home /></IconButton>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0 mr-2">
          <Building2 className="h-4 w-4 text-muted-foreground/60 hidden sm:block shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground hidden sm:block">ASTA One</span>
          {title && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 hidden sm:block shrink-0" />
              <h1 className="text-sm font-bold text-foreground truncate">{title}</h1>
            </>
          )}
        </div>

        <div className="flex-1" />

        <GlobalSearch />
        <NotificationsPanel />
        <UserAvatarMenu />
      </div>
    </header>
  );
}

// iOS — a floating glass toolbar: (sidebar toggle | brand) · back · inline title … search · bell · account.
// Page content scrolls *underneath* it, which is what makes the glass read as glass.
function IosTopBar({ title, navStyle, onMenuClick, className }: BarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/admin";
  const homeTo = navStyle === "sidebar" ? "/admin/dashboard" : "/admin";
  return (
    <header className={cn("relative z-30 mx-3 mt-3 flex h-14 items-center gap-2 rounded-[28px] px-2.5", className)}>
      {/* Glass lives on its own layer: a backdrop-filter on the header itself would trap the
          fixed-position search / notification popups inside it. */}
      <div aria-hidden className="ios-glass-strong pointer-events-none absolute inset-0 -z-10 rounded-[inherit]" />

      {navStyle === "sidebar" && (
        <IconButton onClick={onMenuClick} title="Sidebar" className="hidden lg:flex"><PanelLeft /></IconButton>
      )}

      {/* Brand: always in tile mode; on phones in sidebar mode (the sidebar carries it on desktop) */}
      <Link to={homeTo} title="Home" className={cn("ios-press flex items-center gap-2.5 pl-0.5 pr-1", navStyle === "sidebar" && "lg:hidden")}>
        <BrandMark className="h-9 w-9" />
        <span className={cn("hidden font-display text-[17px] font-semibold tracking-tight text-foreground", navStyle !== "sidebar" && "sm:block")}>ASTA One</span>
      </Link>

      {!isHome && (
        <IconButton onClick={() => navigate(-1)} title="Back"><ChevronLeft /></IconButton>
      )}

      {title && (
        <h1 className="min-w-0 truncate font-display text-[17px] font-semibold tracking-[-0.022em] text-foreground">{title}</h1>
      )}

      <div className="flex-1" />

      <GlobalSearch />
      <NotificationsPanel />
      <UserAvatarMenu />
    </header>
  );
}

// ─── Layout root ──────────────────────────────────────────────────────────────
// AdminShell is mounted ONCE by the router (as the parent element of a
// nested "/admin/*" route tree) — the nav, app bar, AIAssistant and
// What's-New popup all live here and stay mounted across navigation.
// Individual pages render only their own content into <Outlet/>, so
// switching modules no longer remounts the whole chrome (which used to
// replay every fade-in animation and feel like a hard page reload).
// AdminLayout is now just a thin per-page wrapper that pushes its title up
// to AdminShell via context — existing pages don't need to change at all.

const PageTitleContext = createContext<(title?: string) => void>(() => {});

export const AdminShell = () => {
  const navStyle = useNavStyle();
  const theme = useUITheme();
  const material = theme === "material";
  const ios = theme === "ios";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(NAV_COLLAPSED_KEY) === "1");
  const [title, setTitle] = useState<string | undefined>(undefined);
  const location = useLocation();

  useEffect(() => { localStorage.setItem(NAV_COLLAPSED_KEY, collapsed ? "1" : "0"); }, [collapsed]);

  // Close the mobile drawer whenever the nav style setting changes away from
  // "sidebar" (e.g. switched in Settings while the drawer happened to be open).
  useEffect(() => { if (navStyle !== "sidebar") setDrawerOpen(false); }, [navStyle]);

  // Material/iOS: the menu button collapses/expands the docked sidebar on desktop.
  // Material also opens its modal drawer on phones (iOS uses the tab bar there).
  const onMenuClick = () => {
    if ((material || ios) && window.matchMedia("(min-width: 1024px)").matches) setCollapsed(v => !v);
    else setDrawerOpen(true);
  };

  const page = (
    <PageTitleContext.Provider value={setTitle}>
      {/* A nested Suspense boundary here (instead of relying on the top-level
          one in App.tsx) means a not-yet-downloaded page chunk only blanks the
          content area while it loads — the nav and app bar never unmount for it. */}
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </PageTitleContext.Provider>
  );

  const shellStyle = {
    ...(theme === "minimal" ? { background: "hsl(var(--muted))" } : {}),
    zoom: 0.9,
    height: "calc(100vh / 0.9)",      /* compensate zoom so it fills full viewport */
    maxHeight: "calc(100vh / 0.9)",
  } as any;

  // One grid for every theme so <main> (and therefore the current page and any
  // unsaved form state) keeps its place in the tree when the theme is switched.
  //   Material:  ┌ app bar (full width) ┐      Minimal:  ┌ nav │ header ┐
  //              └ nav │ main ───────────┘                 └ nav │ main ──┘
  //   iOS:       ┌ glass nav │ glass toolbar (floating over main) ┐
  return (
    <>
    <div
      className={cn(
        "grid w-full grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden",
        material && "bg-background",
      )}
      style={shellStyle}
    >
      {ios ? (
        <IosTopBar className="col-start-2 row-start-1 self-start" title={title} navStyle={navStyle} onMenuClick={onMenuClick} />
      ) : material ? (
        <TopAppBar className="col-span-2 row-start-1" title={title} navStyle={navStyle} onMenuClick={onMenuClick} />
      ) : (
        <TopHeader className="col-start-2 row-start-1" title={title} navStyle={navStyle} onMenuClick={onMenuClick} />
      )}

      {navStyle === "sidebar" && (
        <NavDrawer
          className={material ? "col-start-1 row-start-2" : "col-start-1 row-span-2 row-start-1"}
          collapsed={collapsed}
          onToggle={() => setCollapsed(v => !v)}
        />
      )}
      {navStyle === "sidebar" && !ios && <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}

      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={material ? { duration: 0.2, ease: [0.2, 0, 0, 1] } : ios ? { duration: 0.3, ease: [0.32, 0.72, 0, 1] } : { duration: 0.18, ease: "easeOut" }}
        className={cn(
          "col-start-2 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden",
          ios
            // content runs under the floating toolbar (top) and tab bar (bottom, phones)
            ? cn("row-span-2 row-start-1 px-4 pt-[84px] lg:px-6 lg:pb-8", navStyle === "sidebar" ? "pb-28" : "pb-8")
            : "row-start-2",
          // With the drawer the nav items already inset content by 12px; without it (tiles mode) match the app bar's 24px
          material && cn("px-4 pb-6 pt-2", navStyle === "sidebar" ? "lg:pl-3 lg:pr-6" : "lg:px-6"),
          theme === "minimal" && "p-4 lg:p-6",
        )}
      >
        {page}
      </motion.main>
    </div>
    {/* iOS phones: floating glass tab bar (kept outside the zoomed shell so it anchors to the real viewport) */}
    {ios && navStyle === "sidebar" && <IosTabBar />}
    <AIAssistant />
    <WhatsNewDialog />
    </>
  );
};

export const AdminLayout = ({ children, title }: { children: ReactNode; title?: string }) => {
  const setShellTitle = useContext(PageTitleContext);
  useEffect(() => { setShellTitle(title); }, [title, setShellTitle]);
  return <>{children}</>;
};
