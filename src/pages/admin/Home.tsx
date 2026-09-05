import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout, NAV } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";

// Full literal class names (not built from a template string) so Tailwind's
// content scanner can actually find and generate them at build time.
const COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  violet: { bg: "bg-violet-500/10", text: "text-violet-600", ring: "group-hover:border-violet-500/50" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-600", ring: "group-hover:border-blue-500/50" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600", ring: "group-hover:border-emerald-500/50" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-600", ring: "group-hover:border-indigo-500/50" },
  sky: { bg: "bg-sky-500/10", text: "text-sky-600", ring: "group-hover:border-sky-500/50" },
  teal: { bg: "bg-teal-500/10", text: "text-teal-600", ring: "group-hover:border-teal-500/50" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-600", ring: "group-hover:border-cyan-500/50" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-600", ring: "group-hover:border-rose-500/50" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600", ring: "group-hover:border-amber-500/50" },
  fuchsia: { bg: "bg-fuchsia-500/10", text: "text-fuchsia-600", ring: "group-hover:border-fuchsia-500/50" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-600", ring: "group-hover:border-purple-500/50" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-600", ring: "group-hover:border-orange-500/50" },
  pink: { bg: "bg-pink-500/10", text: "text-pink-600", ring: "group-hover:border-pink-500/50" },
  slate: { bg: "bg-slate-500/10", text: "text-slate-600", ring: "group-hover:border-slate-500/50" },
};

// One color per module, in NAV order — makes the launcher scannable at a
// glance instead of a wall of identical gray tiles.
const TILE_COLORS: Record<string, keyof typeof COLOR_MAP> = {
  "/admin/dashboard": "violet",
  "/admin/parties": "blue",
  "/admin/items": "emerald",
  "/admin/sales": "indigo",
  "/admin/purchases": "sky",
  "/admin/payments": "teal",
  "/admin/inventory": "cyan",
  "/admin/expenses": "rose",
  "/admin/cash-ledger": "amber",
  "/admin/attendance": "fuchsia",
  "/admin/reports": "purple",
  "/admin/services": "orange",
  "/admin/leads": "pink",
  "/admin/users": "slate",
  "/admin/settings": "slate",
};

export default function Home() {
  const navigate = useNavigate();
  const { hasRole, user } = useAuth();

  useEffect(() => { document.title = "Home | ASTA One"; }, []);

  const tiles = NAV.filter(n => !n.adminOnly || hasRole("admin"));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <AdminLayout>
      <div className="h-full flex flex-col">
        <div className="mb-6 shrink-0">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {greeting}{user?.email ? `, ${user.email.split("@")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Jump into any module below.</p>
        </div>

        <div className="flex-1 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 auto-rows-fr gap-4">
          {tiles.map((tile) => {
            const color = COLOR_MAP[TILE_COLORS[tile.to] || "slate"];
            return (
              <button
                key={tile.to}
                onClick={() => navigate(tile.to)}
                className={`group shine-hover rounded-2xl border border-border/50 bg-card shadow-sm flex flex-col items-center justify-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] active:shadow-sm ${color.ring}`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color.bg} ${color.text} transition-transform group-hover:scale-105`}>
                  <tile.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-center text-foreground/85">{tile.label}</span>
              </button>
            );
          })}
        </div>

        <p className="shrink-0 pt-6 text-xs text-muted-foreground/60 text-center">
          Made by <span className="font-semibold text-foreground/70">Saffyre Intelligence Labs</span>
        </p>
      </div>
    </AdminLayout>
  );
}
