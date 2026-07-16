import { useEffect, useState } from "react";
import { Menu, X, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const links = [
  { href: "#services", label: "Services" },
  { href: "#parts", label: "Spare Parts" },
  { href: "#about", label: "About" },
  { href: "#why", label: "Why Us" },
  { href: "#contact", label: "Contact" },
];

export const SiteNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 bg-background transition-shadow duration-300",
        scrolled ? "border-b border-border shadow-sm" : "border-b border-transparent",
      )}
    >
      <div className="hidden md:flex items-center justify-end gap-6 border-b border-border/70 bg-primary px-6 py-1.5 text-xs text-primary-foreground/90">
        <a href="tel:+919999502399" className="flex items-center gap-1.5 hover:text-primary-foreground">
          <Phone className="h-3 w-3" /> +91 99995 02399
        </a>
        <span className="opacity-40">|</span>
        <a href="mailto:contact@phdautomations.in" className="hover:text-primary-foreground">contact@phdautomations.in</a>
      </div>

      <nav className="container flex h-16 items-center justify-between">
        <a href="#top" className="flex items-center gap-2">
          <img src={logo} alt="PHD Automations" className="h-9 md:h-10 w-auto object-contain" />
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <a href="#contact">
            <Button className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-5">
              Get a Quote
            </Button>
          </a>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-border"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container py-4 flex flex-col gap-1">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2.5 text-sm font-medium border-b border-border/60 last:border-0">
                {l.label}
              </a>
            ))}
            <a href="#contact" onClick={() => setOpen(false)} className="mt-3">
              <Button className="w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                Get a Quote
              </Button>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
