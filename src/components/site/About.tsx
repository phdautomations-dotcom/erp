import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

const stats = [
  { v: 10, suffix: "+", l: "Years of expertise" },
  { v: 1500, suffix: "+", l: "Machines serviced" },
  { v: 200, suffix: "+", l: "Happy clients" },
  { v: 25, suffix: "+", l: "Cities covered" },
];

const industries = ["Automotive", "Aerospace", "Die & Mould", "Defence", "Heavy Engineering", "Job Work"];

const Counter = ({ to, suffix }: { to: number; suffix: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1400;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);

  return (
    <span ref={ref} className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
      {val}
      {suffix}
    </span>
  );
};

export const About = () => {
  return (
    <section id="about" className="relative py-24 sm:py-32">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent font-medium">About</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              Built by engineers, trusted by manufacturers.
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              PHD Automations was founded with a single mission — give Indian manufacturers a partner
              that genuinely understands CNC, VMC and HMC machines. From critical spindle rebuilds
              to multi-machine AMC programmes, we combine deep technical know-how with reliable
              parts logistics so your shopfloor never waits.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {industries.map((i) => (
                <span
                  key={i}
                  className="rounded-full border border-border/60 bg-card/40 backdrop-blur px-4 py-2 text-xs font-medium text-muted-foreground transition-all duration-300 hover:bg-accent hover:text-accent-foreground hover:border-accent cursor-default hover:-translate-y-0.5 hover:shadow-md"
                >
                  {i}
                </span>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="grid grid-cols-2 gap-px rounded-3xl overflow-hidden border border-border bg-border shadow-card-elev"
          >
            {stats.map((s) => (
              <div key={s.l} className="bg-card p-8">
                <Counter to={s.v} suffix={s.suffix} />
                <p className="mt-2 text-sm text-muted-foreground">{s.l}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
