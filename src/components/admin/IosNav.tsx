import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MoreHorizontal, ChevronRight } from "@/lib/icons";
import { useAuth } from "@/hooks/useAuth";
import { BrandMark } from "@/components/BrandMark";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";

// iOS "Liquid Glass" navigation: a floating glass sidebar on wide screens and a
// floating glass tab bar (+ "More" sheet) on phones — the two patterns iOS/iPadOS use.

const isActive = (item: (typeof NAV)[number], pathname: string) =>
  item.end ? pathname === item.to : pathname.startsWith(item.to);

function useVisibleNav() {
  const { hasRole } = useAuth();
  return NAV.filter((n) => !n.adminOnly || hasRole("admin"));
}

// ── Floating glass sidebar (iPadOS style) ──
export function IosSidebar({ collapsed, className }: { collapsed: boolean; className?: string }) {
  const { pathname } = useLocation();
  const items = useVisibleNav();

  return (
    <aside className={cn("hidden min-h-0 p-3 pr-0 lg:flex", className)}>
      <div
        className={cn(
          "ios-glass-strong flex h-full min-h-0 flex-col rounded-[30px] transition-[width] duration-300",
          collapsed ? "w-[76px]" : "w-[244px]",
        )}
      >
        <Link to="/admin/dashboard" title="ASTA One" className="ios-press flex h-[76px] shrink-0 items-center gap-3 px-3.5">
          <BrandMark className="h-11 w-11" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-display text-[18px] font-semibold leading-tight tracking-tight text-foreground">ASTA One</p>
              <p className="truncate text-[11px] text-muted-foreground">One Platform. Every Business.</p>
            </div>
          )}
        </Link>

        <nav className="scrollbar-slim flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2.5 pb-3">
          {items.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "ios-press flex h-11 items-center rounded-full text-[15px] transition-colors",
                  collapsed ? "mx-auto w-11 justify-center" : "gap-3 px-3.5",
                  active ? "bg-primary/[0.14] font-semibold text-primary" : "font-medium text-foreground/85 hover:bg-black/[0.04]",
                )}
              >
                <item.icon className={cn("h-[22px] w-[22px] shrink-0", active ? "text-primary" : "text-primary/75")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

// iOS system colours for the "More" list icons (Settings-app style solid squircles)
const MORE_COLORS: Record<string, string> = {
  "/admin/purchases": "#32ADE6",
  "/admin/items": "#34C759",
  "/admin/inventory": "#FF9500",
  "/admin/expenses": "#FF3B30",
  "/admin/cash-ledger": "#30B0C7",
  "/admin/attendance": "#AF52DE",
  "/admin/reports": "#5856D6",
  "/admin/services": "#FF6482",
  "/admin/leads": "#FF2D55",
  "/admin/users": "#8E8E93",
  "/admin/settings": "#8E8E93",
};

const TAB_PATHS = ["/admin/dashboard", "/admin/sales", "/admin/parties", "/admin/payments"];

// ── Floating glass tab bar (phones / tablets) ──
export function IosTabBar() {
  const { pathname } = useLocation();
  const items = useVisibleNav();
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs = TAB_PATHS.map((p) => items.find((n) => n.to === p)).filter(Boolean) as typeof items;
  const rest = items.filter((n) => !TAB_PATHS.includes(n.to));
  const moreActive = !tabs.some((t) => isActive(t, pathname)) && pathname.startsWith("/admin/");

  const tabCls = (active: boolean) =>
    cn(
      "ios-press flex min-w-[62px] flex-col items-center justify-center gap-0.5 rounded-full px-2.5 py-1.5 text-[10px] font-medium transition-colors",
      active ? "bg-primary/[0.14] text-primary" : "text-muted-foreground",
    );

  return (
    <>
      <nav
        className="ios-glass-strong fixed inset-x-4 bottom-4 z-40 flex h-[66px] items-center justify-around rounded-full px-2 lg:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabs.map((t) => (
          <Link key={t.to} to={t.to} className={tabCls(isActive(t, pathname))}>
            <t.icon className="h-6 w-6" />
            <span>{t.label}</span>
          </Link>
        ))}
        <button onClick={() => setMoreOpen(true)} className={tabCls(moreActive)}>
          <MoreHorizontal className="h-6 w-6" />
          <span>More</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[78vh] overflow-y-auto p-4 pb-6 sm:mx-auto sm:max-w-md">
          <SheetTitle className="px-2 pb-3 pt-1 text-center font-display text-[17px] font-semibold tracking-tight">More</SheetTitle>
          {/* iOS grouped list: one rounded group, hairline separators, coloured icon squircles */}
          <div className="overflow-hidden rounded-[22px] bg-white/70">
            {rest.map((item, i) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "ios-press flex h-[52px] items-center gap-3.5 px-4 text-[16px] font-medium text-foreground active:bg-black/[0.04]",
                  i > 0 && "border-t border-black/[0.06]",
                )}
              >
                <span
                  className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] text-white"
                  style={{ backgroundColor: MORE_COLORS[item.to] ?? "#8E8E93" }}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
