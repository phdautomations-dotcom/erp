import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type PermModule = "invoice" | "quotation" | "proforma" | "challan" | "purchase" | "expenses" | "reports";
export type PermAction = "can_view" | "can_create" | "can_edit" | "can_delete" | "can_view_all";

export interface UserPerm {
  user_id: string;
  module: PermModule;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_view_all: boolean;
}

export const PERM_MODULES: { key: PermModule; label: string }[] = [
  { key: "invoice",   label: "Invoice" },
  { key: "quotation", label: "Quotation" },
  { key: "proforma",  label: "Proforma" },
  { key: "challan",   label: "Challan" },
  { key: "purchase",  label: "Purchase" },
  { key: "expenses",  label: "Expenses" },
  { key: "reports",   label: "Reports" },
];

export function usePermissions() {
  const { user, roles } = useAuth();
  const isAdmin = (roles as string[]).includes("admin");
  const [perms, setPerms] = useState<UserPerm[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    if (isAdmin) {
      setPerms(PERM_MODULES.map(m => ({
        user_id: user.id, module: m.key,
        can_view: true, can_create: true, can_edit: true, can_delete: true, can_view_all: true,
      })));
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any).from("user_permissions").select("*").eq("user_id", user.id);
    setPerms((data || []) as UserPerm[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id, isAdmin]);

  const hasPerm = (module: PermModule, action: PermAction): boolean => {
    if (isAdmin) return true;
    const p = perms.find(x => x.module === module);
    return p ? !!p[action] : false;
  };

  // Can this engineer see all company data for this module, or only their own?
  const canViewAll = (module: PermModule): boolean => {
    if (isAdmin) return true;
    const p = perms.find(x => x.module === module);
    return !!(p && p.can_view_all);
  };

  const salesPerm = isAdmin || (["invoice", "quotation", "proforma", "challan"] as PermModule[]).some(m => {
    const p = perms.find(x => x.module === m);
    return !!(p && (p.can_view || p.can_create));
  });

  const purchasePerm = (() => {
    if (isAdmin) return true;
    const p = perms.find(x => x.module === "purchase");
    return !!(p && (p.can_view || p.can_create));
  })();

  const expensesPerm = (() => {
    if (isAdmin) return true;
    const p = perms.find(x => x.module === "expenses");
    return !!(p && (p.can_view || p.can_create));
  })();

  const reportsPerm = (() => {
    if (isAdmin) return true;
    const p = perms.find(x => x.module === "reports");
    return !!(p && p.can_view);
  })();

  return { perms, loading, hasPerm, canViewAll, salesPerm, purchasePerm, expensesPerm, reportsPerm, reload: load };
}
