import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
   <footer className="relative border-t border-border bg-background overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="container py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <img src={logo} alt="PHD Automations" className="h-12 w-auto object-contain" />
          <p className="mt-4 text-sm text-muted-foreground max-w-md">
            Repair, maintenance and OEM-grade spare parts for CNC, VMC and HMC machines across India.
          </p>
          <Link to="/admin" className="mt-4 inline-block text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            Admin Portal
          </Link>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold">Company</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><a href="#services" className="hover:text-foreground">Services</a></li>
            <li><a href="#parts" className="hover:text-foreground">Spare Parts</a></li>
            <li><a href="#about" className="hover:text-foreground">About</a></li>
            <li><a href="#contact" className="hover:text-foreground">Contact</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold">Reach us</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>+91 9999502399</li>
            <li>contact@phdautomations.in</li>
            <li>India</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container py-5 flex flex-col lg:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
            <p>© {new Date().getFullYear()} PHD Automations. All rights reserved.</p>
            <p className="hidden sm:block opacity-50">•</p>
            <p>GSTIN: </p>
          </div>
          <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity mt-2 lg:mt-0">
            <span>Powered by</span>
            <span className="flex items-center gap-1 font-display font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent cursor-default">
              <Sparkles className="h-3 w-3 text-blue-500" />
              Saffyre Intelligence Labs
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
