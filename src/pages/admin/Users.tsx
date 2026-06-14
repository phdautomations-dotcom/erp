import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, KeyRound, PenTool, Shield, History } from "lucide-react";
import { toast } from "sonner";
import { PERM_MODULES, type UserPerm, type PermModule } from "@/hooks/usePermissions";

const ROLES = ["admin", "accountant", "engineer", "staff", "viewer"] as const;

const PERM_ACTIONS: { key: keyof Omit<UserPerm, "user_id" | "module">; label: string; hint?: string }[] = [
  { key: "can_view",     label: "View",      hint: "See own records only" },
  { key: "can_view_all", label: "View All",  hint: "See entire company data" },
  { key: "can_create",   label: "Create" },
  { key: "can_edit",     label: "Edit" },
  { key: "can_delete",   label: "Delete" },
];

type LocalPerms = Record<PermModule, { can_view: boolean; can_view_all: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>;

const emptyPerms = (): LocalPerms =>
  Object.fromEntries(
    PERM_MODULES.map(m => [m.key, { can_view: false, can_view_all: false, can_create: false, can_edit: false, can_delete: false }])
  ) as LocalPerms;

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-700",
  updated: "bg-blue-100 text-blue-700",
  deleted: "bg-red-100 text-red-700",
};

export default function Users() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>({ email: "", password: "", display_name: "", phone: "", role: "engineer" });

  const [pwOpen, setPwOpen] = useState(false);
  const [pwUser, setPwUser] = useState<any>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const [profOpen, setProfOpen] = useState(false);
  const [profUser, setProfUser] = useState<any>(null);
  const [profForm, setProfForm] = useState<any>({});

  // Permissions
  const [permOpen, setPermOpen] = useState(false);
  const [permUser, setPermUser] = useState<any>(null);
  const [localPerms, setLocalPerms] = useState<LocalPerms>(emptyPerms());
  const [permBusy, setPermBusy] = useState(false);

  // Activity logs
  const [actOpen, setActOpen] = useState(false);
  const [actUser, setActUser] = useState<any>(null);
  const [actLogs, setActLogs] = useState<any[]>([]);

  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const merged = (profiles || []).map(p => ({
      ...p,
      roles: (roles || []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
    }));
    setRows(merged);
  };
  useEffect(() => { document.title = "Users | PHD ERP"; load(); }, []);

  const setRole = async (userId: string, role: any) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("user_roles").insert({ user_id: userId, role });
    toast.success("Role updated"); load();
  };

  const removeRoles = async (userId: string) => {
    if (!confirm("Revoke all access for this user?")) return;
    await supabase.from("user_roles").delete().eq("user_id", userId);
    load();
  };

  const createUser = async () => {
    if (!form.email || !form.password || !form.role) return toast.error("Email, password & role required");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", { body: form });
    setBusy(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message || "Failed");
    toast.success("User created");
    setOpen(false);
    setForm({ email: "", password: "", display_name: "", phone: "", role: "engineer" });
    load();
  };

  const openPw = (u: any) => { setPwUser(u); setPwValue(""); setPwOpen(true); };
  const savePw = async () => {
    if (!pwUser || pwValue.length < 6) return toast.error("Password must be at least 6 characters");
    setPwBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-set-password", { body: { user_id: pwUser.user_id, password: pwValue } });
    setPwBusy(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message || "Failed");
    toast.success("Password updated"); setPwOpen(false);
  };

  const openProf = (u: any) => { setProfUser(u); setProfForm(u); setProfOpen(true); };
  const saveProf = async () => {
    setBusy(true);
    const { error } = await (supabase as any).from("profiles").update({
      father_name: profForm.father_name,
      aadhar_number: profForm.aadhar_number,
      pan_number: profForm.pan_number,
      monthly_salary: +(profForm.monthly_salary || 0),
    }).eq("user_id", profUser.user_id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile details updated");
    setProfOpen(false); load();
  };

  // --- Permissions ---
  const openPerms = async (u: any) => {
    setPermUser(u);
    const lp = emptyPerms();
    const { data } = await (supabase as any).from("user_permissions").select("*").eq("user_id", u.user_id);
    (data || []).forEach((p: any) => {
      if (lp[p.module as PermModule]) {
        lp[p.module as PermModule] = {
          can_view: p.can_view, can_view_all: p.can_view_all || false,
          can_create: p.can_create, can_edit: p.can_edit, can_delete: p.can_delete,
        };
      }
    });
    setLocalPerms(lp);
    setPermOpen(true);
  };

  const togglePerm = (module: PermModule, key: keyof LocalPerms[PermModule]) => {
    setLocalPerms(prev => ({ ...prev, [module]: { ...prev[module], [key]: !prev[module][key] } }));
  };

  const toggleAllForModule = (module: PermModule, checked: boolean) => {
    setLocalPerms(prev => ({
      ...prev,
      [module]: { can_view: checked, can_view_all: checked, can_create: checked, can_edit: checked, can_delete: checked },
    }));
  };

  const savePerms = async () => {
    if (!permUser) return;
    setPermBusy(true);
    const upsertRows = PERM_MODULES.map(m => ({
      user_id: permUser.user_id, module: m.key, ...localPerms[m.key],
    }));
    const { error } = await (supabase as any).from("user_permissions").upsert(upsertRows, { onConflict: "user_id,module" });
    setPermBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Permissions saved!"); setPermOpen(false);
  };

  // --- Activity Logs ---
  const openActivity = async (u: any) => {
    setActUser(u);
    const { data } = await (supabase as any)
      .from("activity_logs")
      .select("*")
      .eq("user_id", u.user_id)
      .order("created_at", { ascending: false })
      .limit(200);
    setActLogs(data || []);
    setActOpen(true);
  };

  return (
    <AdminLayout title="Users & Roles">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm text-muted-foreground">Create staff accounts and manage their roles and permissions.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-foreground text-background hover:bg-foreground/90">
              <Plus className="h-4 w-4 mr-1" /> New User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Display Name</Label><Input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Password *</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
                <div><Label>Role *</Label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={createUser} disabled={busy} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
                {busy ? "Creating…" : "Create User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-muted/30 text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-6 py-4 text-left">Name</th>
                <th className="px-6 py-4 text-left">Phone</th>
                <th className="px-6 py-4 text-left">Role</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map(u => (
                <tr key={u.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium">{u.display_name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{u.phone || "—"}</td>
                  <td className="px-6 py-4">
                    <Select value={u.roles[0] || ""} onValueChange={(v) => setRole(u.user_id, v)}>
                      <SelectTrigger className="h-8 w-40"><SelectValue placeholder="No role" /></SelectTrigger>
                      <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    {u.roles.includes("engineer") && (
                      <>
                        <Button variant="ghost" size="icon" title="Manage Permissions" onClick={() => openPerms(u)}>
                          <Shield className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" title="View Activity Log" onClick={() => openActivity(u)}>
                          <History className="h-4 w-4 text-purple-500" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" title="Edit Profile Details" onClick={() => openProf(u)}>
                      <PenTool className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Change Password" onClick={() => openPw(u)}>
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Revoke Access" onClick={() => removeRoles(u.user_id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Password Dialog ── */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change Password{pwUser ? ` — ${pwUser.display_name || ""}` : ""}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>New Password</Label><Input type="text" value={pwValue} onChange={e => setPwValue(e.target.value)} placeholder="Min 6 characters" /></div>
            <Button onClick={savePw} disabled={pwBusy} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
              {pwBusy ? "Saving…" : "Update Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Profile Dialog ── */}
      <Dialog open={profOpen} onOpenChange={setProfOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Profile — {profUser?.display_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Father's Name</Label><Input value={profForm.father_name || ""} onChange={e => setProfForm({ ...profForm, father_name: e.target.value })} /></div>
            <div><Label>Aadhar Card Number</Label><Input value={profForm.aadhar_number || ""} onChange={e => setProfForm({ ...profForm, aadhar_number: e.target.value })} /></div>
            <div><Label>PAN Card Number</Label><Input value={profForm.pan_number || ""} onChange={e => setProfForm({ ...profForm, pan_number: e.target.value.toUpperCase() })} /></div>
            <div><Label>Monthly Salary (₹)</Label><Input type="number" value={profForm.monthly_salary || 0} onChange={e => setProfForm({ ...profForm, monthly_salary: e.target.value })} /></div>
            <Button onClick={saveProf} disabled={busy} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
              {busy ? "Saving…" : "Save Profile Details"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Permissions Dialog ── */}
      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Permissions — {permUser?.display_name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">Control what this engineer can do in each module.</p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="py-2 text-left font-medium text-muted-foreground pl-1">Module</th>
                  <th className="py-2 text-center font-medium text-muted-foreground w-14">All</th>
                  {PERM_ACTIONS.map(a => (
                    <th key={a.key} className="py-2 text-center font-medium text-muted-foreground w-20">
                      <span title={a.hint || ""}>{a.label}</span>
                      {a.key === "can_view_all" && (
                        <div className="text-[9px] font-normal text-orange-500 leading-none mt-0.5">company-wide</div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {PERM_MODULES.map(m => {
                  const mp = localPerms[m.key];
                  const allChecked = mp.can_view && mp.can_view_all && mp.can_create && mp.can_edit && mp.can_delete;
                  return (
                    <tr key={m.key} className="hover:bg-muted/20">
                      <td className="py-3 font-medium pl-1">{m.label}</td>
                      <td className="py-3 text-center">
                        <Checkbox checked={allChecked} onCheckedChange={(c) => toggleAllForModule(m.key, !!c)} />
                      </td>
                      {PERM_ACTIONS.map(a => (
                        <td key={a.key} className="py-3 text-center">
                          <Checkbox
                            checked={mp[a.key] || false}
                            onCheckedChange={() => togglePerm(m.key, a.key)}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3 bg-muted/30 rounded-xl p-2.5">
              <span className="font-medium text-orange-600">View All</span> = engineer ko poori company ka data dikhega (sabke documents).
              Sirf <span className="font-medium">View</span> = sirf apne banaye documents dikhenge.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="rounded-full" onClick={() => setPermOpen(false)}>Cancel</Button>
            <Button onClick={savePerms} disabled={permBusy} className="rounded-full bg-foreground text-background hover:bg-foreground/90">
              {permBusy ? "Saving…" : "Save Permissions"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Activity Log Dialog ── */}
      <Dialog open={actOpen} onOpenChange={setActOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-purple-500" />
              Activity Log — {actUser?.display_name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {actLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No activity recorded yet.</p>
            ) : (
              actLogs.map(log => (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize shrink-0 ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600"}`}>
                    {log.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium capitalize">{(log.entity_type || "").replace("_", " ")}</span>
                    {log.entity_label && (
                      <span className="text-sm text-muted-foreground ml-1.5">— {log.entity_label}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(log.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
