import { motion } from "framer-motion";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { v: "10+", l: "Years experience" },
  { v: "1500+", l: "Machines serviced" },
  { v: "Pan-India", l: "Service coverage" },
];

export const Hero = () => {
  return (
    <section id="top" className="relative pt-32 md:pt-40 pb-24 md:pb-32 overflow-hidden bg-hero">
      <div className="absolute inset-0 bg-grid pointer-events-none" aria-hidden />
      <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-accent/10 blur-3xl" aria-hidden />
      <div className="absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-[hsl(var(--accent-glow)/0.1)] blur-3xl" aria-hidden />

      <div className="container relative grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            CNC · VMC · HMC · Spare Parts
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]"
          >
            Precision repair &amp;{" "}
            <span className="text-gradient">maintenance</span> for advanced machine tools.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl"
          >
            PHD Automations keeps your CNC, VMC and HMC machines running at peak accuracy — with
            certified engineers, OEM-grade spare parts and rapid breakdown response across India.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <a href="#contact">
              <Button size="lg" className="rounded-full bg-foreground text-background hover:bg-foreground/90 group">
                Request Service
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </a>
            <a href="tel:+910000000000">
              <Button size="lg" variant="outline" className="rounded-full">
                <Phone className="mr-1 h-4 w-4" />
                Call Now
              </Button>
            </a>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-12 grid grid-cols-3 gap-6 max-w-lg"
          >
            {stats.map((s) => (
              <div key={s.l}>
                <dt className="font-display text-2xl sm:text-3xl font-semibold">{s.v}</dt>
                <dd className="text-xs sm:text-sm text-muted-foreground mt-1">{s.l}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="lg:col-span-5 relative"
        >
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <div className="absolute inset-0 rounded-[2rem] bg-card shadow-card-elev ring-gradient" />
            <div className="absolute inset-6 rounded-3xl bg-hero" />
            {/* Animated gear svg */}
            <svg
              viewBox="0 0 200 200"
              className="absolute inset-0 m-auto h-[78%] w-[78%] animate-spin-slow text-foreground/80"
              aria-hidden
            >
              <defs>
                <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(210 100% 52%)" />
                  <stop offset="100%" stopColor="hsl(195 100% 60%)" />
                </linearGradient>
              </defs>
              <g fill="none" stroke="url(#g1)" strokeWidth="1.2">
                <circle cx="100" cy="100" r="78" />
                <circle cx="100" cy="100" r="58" />
                <circle cx="100" cy="100" r="34" />
                {Array.from({ length: 24 }).map((_, i) => {
                  const a = (i * Math.PI * 2) / 24;
                  const x1 = 100 + Math.cos(a) * 80;
                  const y1 = 100 + Math.sin(a) * 80;
                  const x2 = 100 + Math.cos(a) * 92;
                  const y2 = 100 + Math.sin(a) * 92;
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
                })}
              </g>
              <circle cx="100" cy="100" r="6" fill="hsl(210 100% 52%)" />
            </svg>

            {/* Floating chips */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-4 top-10 rounded-2xl border border-border bg-card/80 backdrop-blur px-4 py-3 shadow-soft"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Spindle Health</div>
              <div className="mt-1 font-display text-lg font-semibold text-foreground">98.6%</div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-4 bottom-10 rounded-2xl border border-border bg-card/80 backdrop-blur px-4 py-3 shadow-soft"
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Response</div>
              <div className="mt-1 font-display text-lg font-semibold text-foreground">&lt; 24 hrs</div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
