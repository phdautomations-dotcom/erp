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
                <Route path="/admin" element={<Home />} />
                <Route path="/admin/dashboard" element={<Dashboard />} />
                <Route path="/admin/parties" element={<Parties />} />
                <Route path="/admin/parties/:id" element={<PartyForm />} />
                <Route path="/admin/items" element={<Items />} />
                <Route path="/admin/items/:id" element={<ItemForm />} />
                <Route path="/admin/sales" element={<Sales />} />
                <Route path="/admin/sales/:id" element={<DocForm />} />
                <Route path="/admin/purchases" element={<Sales purchase />} />
                <Route path="/admin/purchases/:id" element={<DocForm purchase />} />
                <Route path="/admin/payments" element={<Payments />} />
                <Route path="/admin/inventory" element={<Inventory />} />
                <Route path="/admin/expenses" element={<Expenses />} />
                <Route path="/admin/cash-ledger" element={<CashLedger />} />
                <Route path="/admin/reports" element={<Reports />} />
                <Route path="/admin/attendance" element={<Attendance />} />
                <Route path="/admin/leads" element={<Leads />} />
                <Route path="/admin/services" element={<ServiceVisits />} />
                <Route path="/engineer" element={<EngineerApp />} />
                <Route path="/admin/settings" element={<Settings />} />
              </Route>
              <Route element={<ProtectedRoute adminOnly />}>
                <Route path="/admin/users" element={<Users />} />
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
