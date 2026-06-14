import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { z } from "zod";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Min 6 characters"),
});

export default function Auth() {
  const { user, loading, signIn, roles } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/admin";
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Admin Login | PHD Automations";
    if (!loading && user && roles.length > 0) {
      let target = from;
      if (target === "/admin" && (roles as string[]).includes("engineer") && !(roles as string[]).includes("admin")) {
        target = "/engineer";
      }
      nav(target, { replace: true });
    }
  }, [user, loading, nav, from, roles]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setBusy(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else { 
      toast.success("Welcome back");
      // Navigation is handled by the useEffect above once roles are loaded,
      // ensuring engineers are correctly routed to /engineer
    }
  };

  return (
    <main className="min-h-screen bg-background relative flex items-center justify-center p-6 overflow-hidden">
      {/* Animated Glowing Background */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15], rotate: [0, 90, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-accent/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1], rotate: [0, -90, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: 2 }} className="absolute top-[40%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-blue-500/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Animated CNC Gears Background behind the card */}
        <div className="absolute -right-12 -top-12 text-accent/10 pointer-events-none flex items-center justify-center mix-blend-multiply dark:mix-blend-lighten z-0">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}>
            <Settings className="h-48 w-48" strokeWidth={1} />
          </motion.div>
          <motion.div initial={{ rotate: 22.5 }} animate={{ rotate: -337.5 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="-ml-16 mt-20">
            <Settings className="h-48 w-48" strokeWidth={1} />
          </motion.div>
        </div>

        <Link to="/" className="flex justify-center mb-8 relative z-10">
          <img src={logo} alt="PHD Automations" className="h-14 w-auto object-contain" />
        </Link>
        <div className="relative z-10 rounded-3xl bg-card/60 backdrop-blur-xl border border-border/50 shadow-2xl ring-gradient p-8 transition-all hover:shadow-accent/10">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-center bg-gradient-to-r from-foreground via-foreground/80 to-accent bg-clip-text text-transparent">PHD Login</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">Sign in to manage billing & operations</p>

          <form onSubmit={handleLogin} className="space-y-4 mt-6">
            <div><Label className="text-muted-foreground">Email</Label><Input name="email" type="email" required autoComplete="email" className="bg-background/50 border-border/50 focus:border-accent" /></div>
            <div><Label className="text-muted-foreground">Password</Label><Input name="password" type="password" required autoComplete="current-password" className="bg-background/50 border-border/50 focus:border-accent" /></div>
            <Button type="submit" disabled={busy} className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 rounded-full font-medium transition-all shadow-md hover:shadow-lg mt-2">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </motion.div>

      {/* Powered by Footer */}
      <div className="absolute bottom-6 left-0 right-0 z-10 flex flex-col items-center justify-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity">
        <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium">
          Powered by
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-display font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
          <Sparkles className="h-2.5 w-2.5 text-blue-500" />
          Saffyre Intelligence Labs
        </div>
      </div>
    </main>
  );
}
