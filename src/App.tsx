import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/admin/Dashboard";
import Parties from "./pages/admin/Parties";
import PartyForm from "./pages/admin/PartyForm";
import Items from "./pages/admin/Items";
import ItemForm from "./pages/admin/ItemForm";
import Sales from "./pages/admin/Sales";
import DocForm from "./pages/admin/DocForm";
import Payments from "./pages/admin/Payments";
import Inventory from "./pages/admin/Inventory";
import Expenses from "./pages/admin/Expenses";
import Reports from "./pages/admin/Reports";
import Attendance from "./pages/admin/Attendance";
import Leads from "./pages/admin/Leads";
import Settings from "./pages/admin/Settings";
import Users from "./pages/admin/Users";
import ServiceVisits from "./components/site/ServiceVisits";
import EngineerApp from "./pages/EngineerApp";
import Verify from "./Verify";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/verify/:id" element={<Verify />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<Dashboard />} />
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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
