import { useEffect, useState } from "react";
import { markFreshLogin } from "@/components/WelcomeSplash";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { BrandMark } from "@/components/BrandMark";
import { toast } from "sonner";
import { Eye, EyeOff, FileText, Boxes, Wallet, Wrench, Users, BarChart3 } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useUITheme } from "@/lib/uiTheme";
import logo from "@/assets/logo.png";

// What the platform does — shown beside the sign-in form on larger screens
const FEATURES = [
  { icon: FileText, title: "Sales & Billing", desc: "Quotations, proformas, challans and GST invoices — numbered automatically and ready to share." },
  { icon: Boxes, title: "Inventory", desc: "Live stock levels, low-stock alerts and a complete stock ledger for every item." },
  { icon: Wallet, title: "Payments", desc: "Track receivables and payables party by party, with payments allocated to invoices." },
  { icon: Wrench, title: "Service Desk", desc: "Log machine visits, AMC schedules and engineer service reports in one place." },
  { icon: Users, title: "Team & HR", desc: "Attendance, leave approvals and role-based access for every team member." },
  { icon: BarChart3, title: "Reports", desc: "Sales, purchase, expense and profit trends — always up to date." },
];

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Min 6 characters"),
});

// Filled, softly-rounded field — matches the reference sign-in form
const FIELD =
  "h-11 rounded-md border-transparent bg-muted/70 text-sm hover:border-transparent hover:bg-muted focus-visible:border-accent focus-visible:bg-card focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-0";

export default function Auth() {
  const { user, loading, signIn, roles } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const theme = useUITheme();
  const from = location.state?.from?.pathname || "/admin";
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Only drives the button's "ready" look — submission still reads the real
  // form values, so browser autofill works even if it never fires onChange.
  const [filled, setFilled] = useState({ email: false, password: false });

  useEffect(() => {
    document.title = "Sign in | ASTA One";
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
      // The welcome card (WelcomeSplash) greets the user once the app shell mounts
      markFreshLogin();
      // Navigation is handled by the useEffect above once roles are loaded,
      // ensuring engineers are correctly routed to /engineer
    }
  };

  const ready = filled.email && filled.password;
  const card = {
    material: "rounded-[28px] bg-card shadow-md",
    minimal: "rounded-2xl border border-border/50 bg-card shadow-sm",
    // bg-card turns into frosted glass in the iOS theme (see index.css)
    ios: "rounded-[34px] border bg-card",
  }[theme];

  return (
    <main className={cn("flex min-h-screen w-full flex-col items-center justify-center px-4 py-8 sm:px-6", theme !== "ios" && "bg-background")}>
      <div className="grid w-full max-w-[1060px] gap-6 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
        {/* ── Sign-in card ── */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
          className={cn("mx-auto flex w-full max-w-[430px] flex-col p-8 sm:p-10 lg:max-w-none", card)}
        >
          {/* Brand */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-10 w-10 rounded-xl" />
              <span className="font-display text-[30px] font-bold leading-none tracking-tight text-foreground">ASTA One</span>
            </div>
            <div className="mt-2.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>by</span>
              <img src={logo} alt="PHD Automations" className="h-[18px] w-auto object-contain" />
            </div>
          </div>

          <h1 className="mt-10 font-display text-lg font-semibold text-foreground">Sign in</h1>

          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" name="email" type="email" required autoComplete="email" placeholder="you@company.com"
                className={FIELD}
                onInput={e => { const v = e.currentTarget.value; setFilled(f => ({ ...f, email: v.trim().length > 0 })); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password" name="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" placeholder="Enter your password"
                  className={cn(FIELD, "pr-11")}
                  onInput={e => { const v = e.currentTarget.value; setFilled(f => ({ ...f, password: v.length > 0 })); }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className={cn(
                "mt-3 h-11 w-full rounded-md bg-accent text-[15px] font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-100",
                !ready && !busy && "bg-accent/45 hover:bg-accent/45",
              )}
            >
              {busy ? (
                <span className="flex items-center gap-2.5">
                  <Loader size={18} className="border-white/30 border-t-white text-white" /> Signing in…
                </span>
              ) : (
                "Continue"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            Don't have an account? <span className="font-semibold text-foreground">Ask your admin</span>
          </p>
        </motion.section>

        {/* ── What the platform does ── */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: [0.2, 0, 0, 1] }}
          className={cn("hidden content-center gap-x-14 gap-y-10 p-12 lg:grid lg:grid-cols-2", card)}
        >
          {FEATURES.map(f => (
            <div key={f.title}>
              <f.icon className="h-[22px] w-[22px] text-accent" strokeWidth={1.75} />
              <h2 className="mt-3 font-display text-[15px] font-semibold text-foreground">{f.title}</h2>
              <p className="mt-1.5 max-w-[240px] text-[13px] leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </motion.section>
      </div>

      <p className="mt-8 text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} Saffyre Intelligence Labs. All rights reserved.
      </p>
    </main>
  );
}
