import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { z } from "zod";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import logo from "@/assets/logo.png";

const FEATURES = [
  "Full operational control",
  "Role-based access for every team",
  "Manage parties, staff & inventory",
];

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
    <main className="min-h-screen w-full flex bg-background overflow-hidden">
      {/* Left: brand / product panel — hidden below lg, where the form takes the full screen */}
      <div
        className="hidden lg:flex lg:w-[68%] xl:w-[70%] relative flex-col justify-between p-12 xl:p-16 text-white overflow-hidden"
        style={{ backgroundImage: "var(--gradient-brand)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 55% 45% at 25% 15%, hsl(212 90% 60% / 0.55), transparent 60%)" }}
        />

        <Link to="/" className="relative z-10 flex items-center gap-3 w-fit">
          <div className="flex items-center gap-2 bg-white rounded-full pl-2 pr-4 py-1.5 shadow-lg">
            <div className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ backgroundImage: "var(--gradient-brand)" }}>
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-black tracking-tight text-foreground">ASTA One</span>
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">Admin</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 max-w-lg">
          <h1 className="font-display text-4xl xl:text-5xl font-black leading-[1.1] tracking-tight mb-5">
            Run your entire business from one dashboard.
          </h1>
          <p className="text-white/80 text-base leading-relaxed mb-8">
            Sales, purchases, inventory, payments, HR — everything your business needs, in one place.
          </p>
          <ul className="space-y-3">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm font-medium text-white/90">
                <CheckCircle2 className="h-4 w-4 text-white/70 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="relative z-10 flex items-center gap-3 text-white/50 text-xs">
          <img src={logo} alt="PHD Automations" className="h-6 w-auto object-contain brightness-0 invert opacity-70" />
          <span>© {new Date().getFullYear()} Saffyre Intelligence Labs. All rights reserved.</span>
        </div>
      </div>

      {/* Right: sign-in form */}
      <div className="flex-1 lg:w-[32%] xl:w-[30%] flex flex-col items-center justify-center p-6 sm:p-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm">
          {/* Compact brand header — only shown where the left panel is hidden */}
          <div className="lg:hidden flex flex-col items-center gap-2 mb-8">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-lg shadow-accent/30" style={{ backgroundImage: "var(--gradient-brand)" }}>
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-display text-2xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ASTA One
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">One Platform. Every Business.</p>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Admin Login</h2>
          <p className="text-sm text-muted-foreground mt-1">Sign in to access the admin panel</p>

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

          {/* Powered by footer — only shown where the left panel's copyright line is hidden */}
          <div className="lg:hidden flex flex-col items-center gap-0.5 mt-10 opacity-60">
            <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium">Powered by</div>
            <div className="flex items-center gap-1.5 text-[11px] font-display font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
              <Sparkles className="h-2.5 w-2.5 text-blue-500" />
              Saffyre Intelligence Labs
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
