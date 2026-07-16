import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const parts = [
  "Spindles & Cartridges",
  "Servo Drives",
  "Servo & Spindle Motors",
  "ATC & Tool Changers",
  "Ball Screws & LM Guides",
  "Encoders & Sensors",
  "Control Boards & PCBs",
  "Hydraulic & Pneumatic",
  "Coolant & Lubrication",
];

export const SpareParts = () => {
  return (
    <section id="parts" className="py-20 sm:py-28 bg-secondary/50 border-y border-border">
      <div className="container">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 max-w-5xl">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Spare Parts</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              OEM-grade spares for every critical assembly.
            </h2>
          </div>
          <p className="text-muted-foreground max-w-md">
            Genuine and reconditioned components sourced from trusted OEMs, tested and warrantied —
            ready to ship across India.
          </p>
        </div>

        <div className="mt-12 grid gap-px sm:grid-cols-2 lg:grid-cols-3 border border-border bg-border">
          {parts.map((p, i) => (
            <motion.div
              key={p}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.03 }}
              className="group bg-background p-5 flex items-center justify-between transition-colors hover:bg-secondary/60"
            >
              <span className="font-medium text-sm">{p}</span>
              <span className="text-xs font-semibold text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Enquire <ArrowRight className="h-3 w-3" />
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
