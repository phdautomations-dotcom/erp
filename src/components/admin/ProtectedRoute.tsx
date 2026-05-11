import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const ProtectedRoute = ({ adminOnly = false }: { adminOnly?: boolean }) => {
  const { user, loading, hasRole, roles } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (roles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <h2 className="font-display text-xl">Awaiting role assignment</h2>
          <p className="text-sm text-muted-foreground mt-2">Ask an admin to grant you access.</p>
        </div>
      </div>
    );
  }
  if (adminOnly && !hasRole("admin")) return <Navigate to="/admin" replace />;
  return <Outlet />;
};
