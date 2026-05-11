import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, FileText, ShoppingCart, Wallet,
  Boxes, Receipt, BarChart3, Inbox, Settings, UserCog, LogOut, Menu,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/parties", label: "Parties", icon: Users },
  { to: "/admin/items", label: "Items", icon: Package },
  { to: "/admin/sales", label: "Sales", icon: FileText },
  { to: "/admin/purchases", label: "Purchases", icon: ShoppingCart },
  { to: "/admin/payments", label: "Payments", icon: Wallet },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/expenses", label: "Expenses", icon: Receipt },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/leads", label: "Leads", icon: Inbox },
  { to: "/admin/users", label: "Users", icon: UserCog, adminOnly: true },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const SidebarContent = ({ onItem }: { onItem?: () => void }) => {
  const { hasRole, user, signOut, roles } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col bg-card">
      <div className="px-5 py-5 border-b border-border">
        <NavLink to="/admin" className="flex items-center gap-2">
          <img src={logo} alt="PHD" className="h-10 w-auto object-contain" />
        </NavLink>
        <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">ERP & Billing</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {nav.filter(n => !n.adminOnly || hasRole("admin")).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={onItem}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                isActive ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )
            }
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <div className="px-2 py-2 text-xs">
          <div className="font-medium truncate">{user?.email}</div>
          <div className="text-muted-foreground capitalize">{roles.join(", ") || "no role"}</div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={async () => { await signOut(); navigate("/auth"); }}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>
    </div>
  );
};

export const AdminLayout = ({ children, title }: { children: ReactNode; title?: string }) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block border-r border-border h-screen sticky top-0">
          <SidebarContent />
        </aside>
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border">
            <div className="flex h-14 items-center gap-3 px-4 lg:px-8">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden"><Menu className="h-5 w-5" /></Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[260px]"><SidebarContent /></SheetContent>
              </Sheet>
              <h1 className="font-display text-base font-semibold">{title}</h1>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
};
