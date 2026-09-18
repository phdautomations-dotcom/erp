import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import { ConfirmDialogProvider } from "@/components/ConfirmDialogProvider";

// Every route is its own chunk, downloaded only when a user actually visits
// it — otherwise a single visit to the login page would pull in every admin
// page (and heavy libs like jspdf/recharts) up front.
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const AdminShell = lazy(() => import("./components/admin/AdminLayout").then(m => ({ default: m.AdminShell })));
const Home = lazy(() => import("./pages/admin/Home"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Parties = lazy(() => import("./pages/admin/Parties"));
const PartyForm = lazy(() => import("./pages/admin/PartyForm"));
const Items = lazy(() => import("./pages/admin/Items"));
const ItemForm = lazy(() => import("./pages/admin/ItemForm"));
const Sales = lazy(() => import("./pages/admin/Sales"));
const DocForm = lazy(() => import("./pages/admin/DocForm"));
const Payments = lazy(() => import("./pages/admin/Payments"));
const Inventory = lazy(() => import("./pages/admin/Inventory"));
const Expenses = lazy(() => import("./pages/admin/Expenses"));
const CashLedger = lazy(() => import("./pages/admin/CashLedger"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const Attendance = lazy(() => import("./pages/admin/Attendance"));
const Leads = lazy(() => import("./pages/admin/Leads"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const Users = lazy(() => import("./pages/admin/Users"));
const ServiceVisits = lazy(() => import("./components/site/ServiceVisits"));
const EngineerApp = lazy(() => import("./pages/EngineerApp"));
const Verify = lazy(() => import("./Verify"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <ConfirmDialogProvider>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/admin" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/verify/:id" element={<Verify />} />
              <Route element={<ProtectedRoute />}>
                {/* AdminShell (sidebar/header/AIAssistant) mounts once here and
                    stays mounted across every /admin/* navigation — pages only
                    swap inside its <Outlet/>, so switching modules is an
                    instant in-place update instead of a full chrome remount. */}
                <Route path="/admin" element={<AdminShell />}>
                  <Route index element={<Home />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="parties" element={<Parties />} />
                  <Route path="parties/:id" element={<PartyForm />} />
                  <Route path="items" element={<Items />} />
                  <Route path="items/:id" element={<ItemForm />} />
                  <Route path="sales" element={<Sales />} />
                  <Route path="sales/:id" element={<DocForm />} />
                  <Route path="purchases" element={<Sales purchase />} />
                  <Route path="purchases/:id" element={<DocForm purchase />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="cash-ledger" element={<CashLedger />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="leads" element={<Leads />} />
                  <Route path="services" element={<ServiceVisits />} />
                  <Route path="settings" element={<Settings />} />
                  <Route element={<ProtectedRoute adminOnly />}>
                    <Route path="users" element={<Users />} />
                  </Route>
                </Route>
                <Route path="/engineer" element={<EngineerApp />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
      </ConfirmDialogProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
