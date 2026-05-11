import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
    <footer className="border-t border-border">
      <div className="container py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <img src={logo} alt="PHD Automations" className="h-12 w-auto object-contain" />
          <p className="mt-4 text-sm text-muted-foreground max-w-md">
            Repair, maintenance and OEM-grade spare parts for CNC, VMC and HMC machines across India.
          </p>
          <Link to="/admin" className="mt-4 inline-block text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            Admin Portal →
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
            <li>+91 00000 00000</li>
            <li>contact@phdautomations.in</li>
            <li>India</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} PHD Automations. All rights reserved.</p>
          <p>GSTIN: To be added</p>
        </div>
      </div>
    </footer>
  );
};
