import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AdminLayout, NAV } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  useEffect(() => { document.title = "Home | PHD ERP"; }, []);

  const tiles = NAV.filter(n => !n.adminOnly || hasRole("admin"));

  return (
    <AdminLayout>
      <div className="h-full flex flex-col">
        <div className="flex-1 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 auto-rows-fr gap-4">
          {tiles.map((tile, i) => (
            <motion.button
              key={tile.to}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              onClick={() => navigate(tile.to)}
              className="group shine-hover rounded-2xl border border-border/50 bg-card/50 shadow-sm backdrop-blur-xl flex flex-col items-center justify-center gap-3 p-4 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/20 hover:border-accent/50"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-foreground/70 transition-all group-hover:text-white group-hover:[background-image:var(--gradient-brand)]"
              >
                <tile.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold text-center text-foreground/85">{tile.label}</span>
            </motion.button>
          ))}
        </div>

        <p className="shrink-0 pt-6 text-xs text-muted-foreground/60 text-center">
          Made by <span className="font-semibold text-foreground/70">Saffyre Intelligence Labs</span>
        </p>
      </div>
    </AdminLayout>
  );
}
