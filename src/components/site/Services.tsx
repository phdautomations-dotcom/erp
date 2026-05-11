import { motion } from "framer-motion";
import { Wrench, Settings2, Cog, ShieldCheck, Truck, Zap } from "lucide-react";

const services = [
  { icon: Wrench, title: "CNC Repair", desc: "Diagnostics, retrofits and breakdown repair for all CNC machines and controllers." },
  { icon: Cog, title: "VMC Repair", desc: "Spindle, ATC and axis repair for vertical machining centers with precision alignment." },
  { icon: Settings2, title: "HMC Repair", desc: "Pallet changer, B-axis and rotary table service for horizontal machining centers." },
  { icon: ShieldCheck, title: "AMC Contracts", desc: "Annual maintenance plans with scheduled visits, priority response and reporting." },
  { icon: Truck, title: "Installation & Commissioning", desc: "Site preparation, installation, geometry alignment and trial production handover." },
  { icon: Zap, title: "Breakdown Support", desc: "Pan-India rapid response with on-call certified engineers to minimise downtime." },
];

export const Services = () => {
  return (
    <section id="services" className="relative py-24 sm:py-32">
      <div className="container">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium">Services</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Everything your shopfloor needs — under one roof.
          </h2>
          <p className="mt-4 text-muted-foreground">
            From emergency breakdowns to long-term maintenance contracts, we deliver predictable
            uptime for CNC, VMC and HMC machines.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <motion.article
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-soft hover-lift overflow-hidden"
            >
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground group-hover:bg-accent-gradient group-hover:text-accent-foreground transition-colors">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
