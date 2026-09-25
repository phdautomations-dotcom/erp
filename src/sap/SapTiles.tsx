import { useNavigate } from "react-router-dom";
import { Icon } from "@ui5/webcomponents-react";
import { NAV } from "@/components/admin/nav";
import { OrionGrid } from "@/components/OrionCard";
import { useAuth } from "@/hooks/useAuth";
import { SAP_NAV_ICON, sapIconForHref } from "./sapNav";

// Fiori tiles, drawn the way SAP's GenericTile looks (Horizon): white, radius 1rem, title on
// top, and either a big module icon (Launchpad) or a numeric KPI (dashboard). Styles: `.sap-lp-*`
// and `.sap-kpi*` in sap.css.

// ── Launchpad home: tiles grouped into sections, like the Fiori Launchpad ──────────────────────

const GROUPS: { title: string; items: string[] }[] = [
  { title: "Overview", items: ["/admin/dashboard"] },
  { title: "Sales & Purchasing", items: ["/admin/sales", "/admin/purchases", "/admin/payments", "/admin/parties"] },
  { title: "Inventory", items: ["/admin/items", "/admin/inventory"] },
  { title: "Finance", items: ["/admin/expenses", "/admin/cash-ledger", "/admin/reports"] },
  { title: "Service & People", items: ["/admin/services", "/admin/leads", "/admin/attendance"] },
  { title: "Administration", items: ["/admin/users", "/admin/settings"] },
];

const SUBTITLE: Record<string, string> = {
  "/admin/dashboard": "Business at a glance",
  "/admin/sales": "Invoices & quotations",
  "/admin/purchases": "Bills & orders",
  "/admin/payments": "Receipts & payouts",
  "/admin/parties": "Customers & vendors",
  "/admin/items": "Products & services",
  "/admin/inventory": "Stock & ledger",
  "/admin/expenses": "Track spending",
  "/admin/cash-ledger": "Cash in & out",
  "/admin/reports": "P&L, GST & aging",
  "/admin/services": "Visits & AMC",
  "/admin/leads": "Enquiries",
  "/admin/attendance": "Payroll & leave",
  "/admin/users": "Roles & access",
  "/admin/settings": "Company & appearance",
};

export function SapLaunchpad() {
  const navigate = useNavigate();
  const { hasRole, user } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = user?.email ? user.email.split("@")[0] : "";
  const label = Object.fromEntries(NAV.map((n) => [n.to, n]));

  return (
    <div className="sap-lp">
      <h1 className="sap-lp__title">{greeting}{name ? `, ${name}` : ""}</h1>
      <p className="sap-lp__lead">Open an app to get started.</p>
      {GROUPS.map((g) => {
        const tiles = g.items.map((to) => label[to]).filter((n) => n && (!n.adminOnly || hasRole("admin")));
        if (!tiles.length) return null;
        return (
          <section key={g.title} className="sap-lp__group">
            <h2 className="sap-lp__group-title">{g.title}</h2>
            <div className="sap-lp__tiles">
              {tiles.map((n) => (
                <button key={n.to} type="button" className="sap-lp-tile" onClick={() => navigate(n.to)}>
                  <span className="sap-lp-tile__head">
                    <span className="sap-lp-tile__title">{n.label}</span>
                    <span className="sap-lp-tile__sub">{SUBTITLE[n.to]}</span>
                  </span>
                  <Icon name={SAP_NAV_ICON[n.to]} className="sap-lp-tile__icon" />
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ── Dashboard KPI tiles: numeric content with a semantic colour, like Fiori KPI tiles ──────────

export type SapKpi = {
  label: string;
  value: string;
  to?: string;
  /** change over the recent window in %, null when unknown */
  trend?: number | null;
  /** Fiori semantic colour of the value: good = green, critical = orange, bad = red */
  tone: "neutral" | "good" | "critical" | "bad";
  hint?: string;
};

function KpiTile({ k }: { k: SapKpi }) {
  const navigate = useNavigate();
  const go = () => k.to && navigate(k.to);
  return (
    <div
      role="button"
      tabIndex={0}
      className={`sap-kpi sap-kpi--${k.tone}`}
      onClick={go}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }}
    >
      <div className="sap-kpi__head">
        <span className="sap-kpi__title">{k.label}</span>
        <Icon name={k.to ? sapIconForHref(k.to) : "product"} className="sap-kpi__icon" />
      </div>
      <div className="sap-kpi__value">{k.value}</div>
      <div className="sap-kpi__foot">
        {k.trend != null ? (
          <>
            <Icon name={k.trend >= 0 ? "trend-up" : "trend-down"} className={`sap-kpi__trend ${k.trend >= 0 ? "is-up" : "is-down"}`} />
            <span>{Math.abs(k.trend).toFixed(1)}% vs last week</span>
          </>
        ) : (
          <span>{k.hint ?? ""}</span>
        )}
      </div>
    </div>
  );
}

export function SapKpiTiles({ kpis, minis }: { kpis: SapKpi[]; minis: SapKpi[] }) {
  return (
    <>
      <OrionGrid minItem={150} maxCols={4} gap={12} aspect={(w) => (w < 190 ? 1.25 : w < 250 ? 1.55 : 1.9)}>
        {kpis.map((k) => <KpiTile key={k.label} k={k} />)}
      </OrionGrid>
      <OrionGrid minItem={150} maxCols={5} gap={12} aspect={(w) => (w < 190 ? 1.6 : w < 210 ? 1.8 : 2.2)} className="mt-3">
        {minis.map((k) => <KpiTile key={k.label} k={k} />)}
      </OrionGrid>
    </>
  );
}
