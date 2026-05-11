import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";

const ROLES = ["admin", "accountant", "staff", "viewer"] as const;

export default function Users() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>({ email: "", password: "", display_name: "", phone: "", role: "staff" });
  const [pwOpen, setPwOpen] = useState(false);
  const [pwUser, setPwUser] = useState<any>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const merged = (profiles || []).map(p => ({ ...p, roles: (roles || []).filter(r => r.user_id === p.user_id).map(r => r.role) }));
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
    if (error || (data as any)?.error) {
      return toast.error((data as any)?.error || error?.message || "Failed");
    }
    toast.success("User created");
    setOpen(false);
    setForm({ email: "", password: "", display_name: "", phone: "", role: "staff" });
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

  return (
    <AdminLayout title="Users & Roles">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm text-muted-foreground">Create staff accounts and manage their roles.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-foreground text-background hover:bg-foreground/90"><Plus className="h-4 w-4 mr-1" /> New User</Button>
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
              <Button onClick={createUser} disabled={busy} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">{busy ? "Creating…" : "Create User"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-muted/40 text-xs"><tr><th className="text-left p-3">Name</th><th className="text-left">Phone</th><th className="text-left">Role</th><th></th></tr></thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3">{u.display_name}</td>
                <td>{u.phone || "—"}</td>
                <td>
                  <Select value={u.roles[0] || ""} onValueChange={(v) => setRole(u.user_id, v)}>
                    <SelectTrigger className="h-8 w-40"><SelectValue placeholder="No role" /></SelectTrigger>
                    <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon" title="Change password" onClick={() => openPw(u)}><KeyRound className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" title="Revoke access" onClick={() => removeRoles(u.user_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change Password{pwUser ? ` — ${pwUser.display_name || ""}` : ""}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>New Password</Label><Input type="text" value={pwValue} onChange={e => setPwValue(e.target.value)} placeholder="Min 6 characters" /></div>
            <Button onClick={savePw} disabled={pwBusy} className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">{pwBusy ? "Saving…" : "Update Password"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
