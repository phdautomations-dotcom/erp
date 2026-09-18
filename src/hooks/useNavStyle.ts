import { useEffect, useState } from "react";

// Per-browser layout preference: a persistent left sidebar (like most SaaS
// admin panels) vs. the original tile launcher as the "/admin" landing page.
// Stored in localStorage (not company_settings) since it's a personal
// display preference, not shared company data.
export type NavStyle = "sidebar" | "tiles";
const KEY = "asta_nav_style";
const EVENT = "asta:nav-style-change";

export function getNavStyle(): NavStyle {
  const v = localStorage.getItem(KEY);
  return v === "tiles" ? "tiles" : "sidebar";
}

export function setNavStyle(style: NavStyle) {
  localStorage.setItem(KEY, style);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: style }));
}

export function useNavStyle(): NavStyle {
  const [style, setStyle] = useState<NavStyle>(getNavStyle());

  useEffect(() => {
    const onChange = (e: Event) => setStyle((e as CustomEvent<NavStyle>).detail);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setStyle(getNavStyle()); };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return style;
}
