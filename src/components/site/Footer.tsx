import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <img src={logo} alt="PHD Automations" className="h-11 w-auto object-contain brightness-0 invert" />
          <p className="mt-4 text-sm text-primary-foreground/70 max-w-md">
            Repair, maintenance and OEM-grade spare parts for CNC, VMC and HMC machines across India.
          </p>
          <Link to="/admin" className="mt-4 inline-block text-xs text-primary-foreground/60 hover:text-primary-foreground underline-offset-4 hover:underline">
            Admin Portal
          </Link>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold">Company</h4>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/70">
            <li><a href="#services" className="hover:text-primary-foreground">Services</a></li>
            <li><a href="#parts" className="hover:text-primary-foreground">Spare Parts</a></li>
            <li><a href="#about" className="hover:text-primary-foreground">About</a></li>
            <li><a href="#contact" className="hover:text-primary-foreground">Contact</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold">Reach us</h4>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/70">
            <li>+91 9999502399</li>
            <li>contact@phdautomations.in</li>
            <li>India</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10">
        <div className="container py-5 flex flex-col lg:flex-row items-center justify-between gap-4 text-xs text-primary-foreground/60">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
            <p>© {new Date().getFullYear()} PHD Automations. All rights reserved.</p>
            <p className="hidden sm:block opacity-50">•</p>
            <p>GSTIN: </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Powered by Saffyre Intelligence Labs</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
