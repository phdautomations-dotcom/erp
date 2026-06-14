import { motion } from "framer-motion";

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
    <section id="parts" className="relative py-24 sm:py-32 bg-secondary/40">
      <div className="container">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 max-w-5xl">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium">Spare Parts</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              OEM-grade spares for every critical assembly.
            </h2>
          </div>
          <p className="text-muted-foreground max-w-md">
            Genuine and reconditioned components sourced from trusted OEMs, tested and warrantied —
            ready to ship across India.
          </p>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {parts.map((p, i) => (
            <motion.div
              key={p}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.04 }}
              className="group relative rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              <span className="relative z-10 font-medium group-hover:text-foreground transition-colors">{p}</span>
              <span className="relative z-10 text-xs font-semibold text-muted-foreground group-hover:text-accent transition-colors flex items-center gap-1 group-hover:translate-x-1">
                Enquire →
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
