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
              whileHover={{ y: -8 }}
              className="group relative rounded-3xl border border-border/60 bg-card/40 backdrop-blur-sm p-8 transition-all duration-500 hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/10 overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-foreground group-hover:bg-accent group-hover:text-accent-foreground group-hover:scale-110 transition-all duration-300 shadow-sm">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="relative z-10 mt-6 font-display text-xl font-semibold tracking-tight group-hover:text-accent transition-colors">{s.title}</h3>
              <p className="relative z-10 mt-3 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
