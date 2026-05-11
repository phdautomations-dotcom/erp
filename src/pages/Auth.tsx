import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Min 6 characters"),
});

export default function Auth() {
  const { user, loading, signIn } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Admin Login | PHD Automations";
    if (!loading && user) nav("/admin", { replace: true });
  }, [user, loading, nav]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setBusy(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Welcome back"); nav("/admin"); }
  };

  return (
    <main className="min-h-screen bg-hero flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex justify-center mb-8">
          <img src={logo} alt="PHD Automations" className="h-20 w-auto object-contain" />
        </Link>
        <div className="rounded-3xl bg-card shadow-card-elev ring-gradient p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-center">Admin Portal</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">Sign in to manage billing & operations</p>

          <form onSubmit={handleLogin} className="space-y-4 mt-6">
            <div><Label>Email</Label><Input name="email" type="email" required autoComplete="email" /></div>
            <div><Label>Password</Label><Input name="password" type="password" required autoComplete="current-password" /></div>
            <Button type="submit" disabled={busy} className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-full">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </motion.div>
    </main>
  );
}
