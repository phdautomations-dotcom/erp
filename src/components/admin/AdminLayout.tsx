import { ReactNode, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, FileText, ShoppingCart, Wallet, Wrench,
  Boxes, Receipt, BarChart3, Inbox, Settings, UserCog, LogOut, Menu, Sparkles, ClipboardList
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
      { to: "/admin/attendance", label: "Attendance & HR", icon: ClipboardList },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/services", label: "Service Desk", icon: Wrench },
  { to: "/admin/leads", label: "Leads", icon: Inbox },
  { to: "/admin/users", label: "Users", icon: UserCog, adminOnly: true },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

// Global variable to remember scroll position across page changes
let sidebarScrollY = 0;

const SidebarContent = ({ onItem }: { onItem?: () => void }) => {
  const { hasRole, user, signOut, roles } = useAuth();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = sidebarScrollY;
    }
  }, []);

  return (
    <div className="flex h-full flex-col bg-card/40 backdrop-blur-xl border-r border-border/50">
      <div className="px-5 py-5 border-b border-border/50">
        <NavLink to="/admin" className="flex items-center gap-2">
          <img src={logo} alt="PHD" className="h-10 w-auto object-contain" />
        </NavLink>
        <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">ERP & Billing</p>
      </div>
      <nav 
        ref={navRef}
        onScroll={(e) => { sidebarScrollY = e.currentTarget.scrollTop; }}
        className="flex-1 overflow-y-auto p-3 space-y-1"
      >
        {nav.filter(n => !n.adminOnly || hasRole("admin")).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={onItem}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-300 hover:translate-x-1 group",
                isActive ? "text-accent-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 bg-accent rounded-2xl z-0"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <n.icon className="h-4 w-4 relative z-10" />
                <span className="relative z-10">{n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border/50 p-3">
        <div className="px-2 pb-2 text-xs">
          <div className="font-medium truncate">{user?.email}</div>
          <div className="text-[10px] text-muted-foreground capitalize">{roles.join(", ") || "no role"}</div>
        </div>
        <Button variant="ghost" size="sm" className="w-full h-8 justify-start text-muted-foreground hover:text-foreground" onClick={async () => { await signOut(); navigate("/auth"); }}>
          <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
        </Button>
        
        <div className="pt-2 mt-2 border-t border-border/50 flex flex-col items-center justify-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity">
          <div className="text-[8px] text-muted-foreground uppercase tracking-widest font-medium">
            Powered by
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-display font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
            <Sparkles className="h-2.5 w-2.5 text-blue-500" />
            Saffyre Intelligence Labs
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminLayout = ({ children, title }: { children: ReactNode; title?: string }) => {
  return (
    <div className="h-screen w-full bg-background relative overflow-hidden flex" style={{ zoom: 0.9 } as any}>
      {/* Animated Glowing Background */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15], rotate: [0, 90, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-accent/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1], rotate: [0, -90, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: 2 }} className="absolute top-[40%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-blue-500/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <div className="flex h-full w-full relative z-10">
        <aside className="hidden lg:block w-[260px] shrink-0 h-full z-20">
          <SidebarContent />
        </aside>
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          <header className="shrink-0 z-30 bg-background/50 backdrop-blur-xl border-b border-border/50 shadow-sm">
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
          <motion.main 
            key={title}
            initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex-1 overflow-y-auto p-4 lg:p-8"
          >
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
};
