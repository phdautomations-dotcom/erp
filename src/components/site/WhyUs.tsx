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
              className="group relative rounded-3xl border border-border/60 bg-card/50 backdrop-blur-sm p-8 transition-all duration-500 hover:-translate-y-2 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10 overflow-hidden"
            >
              <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CheckCircle2 className="relative z-10 h-8 w-8 text-accent group-hover:scale-110 transition-transform duration-300" />
              <h3 className="relative z-10 mt-5 font-display text-xl font-semibold tracking-tight">{i.t}</h3>
              <p className="relative z-10 mt-3 text-sm text-muted-foreground leading-relaxed">{i.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
