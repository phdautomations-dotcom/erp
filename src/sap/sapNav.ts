// SAP icon (SAP-icons-v5 name) for every module, and for global-search results by route.
// Every name here is registered by the generated ./sapIcons.ts (scripts/gen-sap-icons.mjs).
export const SAP_NAV_ICON: Record<string, string> = {
  "/admin/dashboard": "bbyd-dashboard",
  "/admin/parties": "group",
  "/admin/items": "product",
  "/admin/sales": "sales-order",
  "/admin/purchases": "cart",
  "/admin/payments": "wallet",
  "/admin/inventory": "inventory",
  "/admin/expenses": "expense-report",
  "/admin/cash-ledger": "money-bills",
  "/admin/attendance": "employee",
  "/admin/reports": "bar-chart",
  "/admin/services": "wrench",
  "/admin/leads": "lead",
  "/admin/users": "user-settings",
  "/admin/settings": "action-settings",
};

export const sapIconForHref = (href: string): string => {
  const hit = Object.keys(SAP_NAV_ICON).find((p) => href.startsWith(p));
  return hit ? SAP_NAV_ICON[hit] : "search";
};
