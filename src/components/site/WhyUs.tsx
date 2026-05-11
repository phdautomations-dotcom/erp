import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const items = [
  { t: "OEM-grade spares", d: "Authentic and reconditioned parts with traceable warranty." },
  { t: "Quick turnaround", d: "Diagnostics within hours, not days. Most repairs in under a week." },
  { t: "Pan-India service", d: "On-site engineers across major manufacturing hubs." },
  { t: "Certified engineers", d: "Trained on Fanuc, Siemens, Mitsubishi, Heidenhain and more." },
];

export const WhyUs = () => {
  return (
    <section id="why" className="relative py-24 sm:py-32 bg-secondary/40">
      <div className="container">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium">Why PHD</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Engineered for uptime, priced for partnership.
          </h2>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((i, idx) => (
            <motion.div
              key={i.t}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.06 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <CheckCircle2 className="h-6 w-6 text-accent" />
              <h3 className="mt-4 font-display text-lg font-semibold">{i.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{i.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
