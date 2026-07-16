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
    <section id="services" className="py-20 sm:py-28 bg-background">
      <div className="container">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-accent font-semibold">Services</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Everything your shopfloor needs — under one roof.
          </h2>
          <p className="mt-4 text-muted-foreground">
            From emergency breakdowns to long-term maintenance contracts, we deliver predictable
            uptime for CNC, VMC and HMC machines.
          </p>
        </div>

        <div className="mt-12 grid gap-px sm:grid-cols-2 lg:grid-cols-3 border border-border bg-border">
          {services.map((s, i) => (
            <motion.article
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="group bg-background p-8 transition-colors hover:bg-secondary/60"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-border bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 font-display text-lg font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
