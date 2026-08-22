import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { z } from "zod";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);

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
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1], rotate: [0, -90, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: 2 }} className="absolute top-[40%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-[hsl(243_75%_59%)]/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
        {/* Subtle dot-grid for depth */}
        <div
          className="absolute inset-0 opacity-[0.4] dark:opacity-[0.25]"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 40%, black 40%, transparent 100%)",
            maskImage: "radial-gradient(ellipse 60% 50% at 50% 40%, black 40%, transparent 100%)",
          }}
        />
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
        <div className="relative z-10 rounded-3xl bg-card/60 backdrop-blur-xl border border-border/50 shadow-2xl ring-gradient p-9 transition-all hover:shadow-accent/10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent text-center mb-2">Enterprise ERP</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-center bg-gradient-to-r from-foreground via-accent to-[hsl(243_75%_59%)] bg-clip-text text-transparent">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-1.5">Sign in to manage billing & operations</p>

          <form onSubmit={handleLogin} className="space-y-4 mt-8">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  name="email" type="email" required autoComplete="email" placeholder="you@company.com"
                  className="h-12 rounded-xl pl-10 bg-background/50 border-border/50 focus-visible:border-accent focus-visible:ring-accent/30 focus-visible:ring-offset-0 transition-shadow"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  name="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" placeholder="••••••••"
                  className="h-12 rounded-xl pl-10 pr-11 bg-background/50 border-border/50 focus-visible:border-accent focus-visible:ring-accent/30 focus-visible:ring-offset-0 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit" disabled={busy}
              className="group w-full h-12 btn-gradient rounded-full font-semibold transition-all shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 mt-2"
            >
              <span className="relative flex items-center justify-center gap-1.5">
                {busy ? "Signing in…" : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </span>
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
