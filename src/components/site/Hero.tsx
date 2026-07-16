import { motion } from "framer-motion";
import { ArrowRight, Phone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { v: "10+", l: "Years experience" },
  { v: "1500+", l: "Machines serviced" },
  { v: "Pan-India", l: "Service coverage" },
];

const highlights = ["Certified engineers", "OEM-grade parts", "24-hr response"];

export const Hero = () => {
  return (
    <section id="top" className="relative pt-40 md:pt-48 pb-20 md:pb-28 bg-background">
      <div className="container grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary"
          >
            CNC · VMC · HMC · Spare Parts
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-5 font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold tracking-tight leading-[1.1] text-foreground"
          >
            Precision repair &amp; maintenance for advanced machine tools.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl"
          >
            PHD Automations keeps your CNC, VMC and HMC machines running at peak accuracy — with
            certified engineers, OEM-grade spare parts and rapid breakdown response across India.
          </motion.p>

          <motion.ul
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-6 flex flex-wrap gap-x-6 gap-y-2"
          >
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                <CheckCircle2 className="h-4 w-4 text-accent" /> {h}
              </li>
            ))}
          </motion.ul>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <a href="#contact">
              <Button size="lg" className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 group">
                Request Service
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </a>
            <a href="tel:+919999502399">
              <Button size="lg" variant="outline" className="rounded-md border-border">
                <Phone className="mr-2 h-4 w-4" />
                +91 99995 02399
              </Button>
            </a>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 grid grid-cols-3 gap-6 max-w-lg border-t border-border pt-6"
          >
            {stats.map((s) => (
              <div key={s.l}>
                <dt className="font-display text-2xl sm:text-3xl font-semibold text-primary">{s.v}</dt>
                <dd className="text-xs sm:text-sm text-muted-foreground mt-1">{s.l}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="lg:col-span-5"
        >
          <div className="rounded-lg border border-border bg-primary text-primary-foreground p-8 sm:p-10">
            <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/60 font-semibold">
              Machine Health Snapshot
            </p>
            <div className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <div className="font-display text-3xl font-semibold">98.6%</div>
                <div className="mt-1 text-sm text-primary-foreground/70">Spindle Health</div>
              </div>
              <div>
                <div className="font-display text-3xl font-semibold">&lt; 24 hrs</div>
                <div className="mt-1 text-sm text-primary-foreground/70">Avg. Response</div>
              </div>
              <div>
                <div className="font-display text-3xl font-semibold">99.2%</div>
                <div className="mt-1 text-sm text-primary-foreground/70">Repair Success</div>
              </div>
              <div>
                <div className="font-display text-3xl font-semibold">25+</div>
                <div className="mt-1 text-sm text-primary-foreground/70">Cities Covered</div>
              </div>
            </div>
            <div className="mt-8 border-t border-primary-foreground/15 pt-6 text-sm text-primary-foreground/70">
              Trusted by manufacturers across automotive, aerospace, die &amp; mould and heavy engineering.
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
