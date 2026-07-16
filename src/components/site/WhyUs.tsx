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
    <section id="why" className="py-20 sm:py-28 bg-secondary/50 border-y border-border">
      <div className="container">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Why PHD</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Engineered for uptime, priced for partnership.
          </h2>
        </div>

        <div className="mt-12 grid gap-px sm:grid-cols-2 lg:grid-cols-4 border border-border bg-border">
          {items.map((i, idx) => (
            <motion.div
              key={i.t}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="bg-background p-7"
            >
              <CheckCircle2 className="h-6 w-6 text-accent" />
              <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">{i.t}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{i.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
