import {
  LayoutDashboard, Users, Package, FileText, ShoppingCart, Wallet, Wrench,
  Boxes, Receipt, BarChart3, Inbox, Settings, UserCog, ClipboardList, Banknote,
} from "@/lib/icons";

// Module list shared by every navigation surface (sidebar, drawer, tab bar, tile launcher)
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
