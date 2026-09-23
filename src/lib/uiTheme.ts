import { useSyncExternalStore } from "react";
import { loadIosIcons } from "./iosIcons";

// Four selectable designs, remembered per browser:
//   "material" — Google Material 3: tonal surfaces, pill buttons, Google Sans / Roboto
//   "minimal"  — the earlier flat indigo design
//   "ios"      — iOS "Liquid Glass": translucent blurred glass, SF-style icons, capsule controls
//   "orion"    — (default) calm glassmorphism: gradient squircle cards, glass bubbles, muted map backdrop.
//                A *skin* over the iOS structure — components still see UITheme "ios" (same
//                chrome, glass classes, icons); CSS restyles it under <html data-ui-skin="orion">.
// The structural theme is mirrored to <html data-ui-theme="…"> so CSS tokens switch
// instantly, and components subscribe via useUITheme() for their class choices.
export type UITheme = "material" | "minimal" | "ios";
export type UIDesign = UITheme | "orion";
const KEY = "asta_ui_theme";
// One-time switch to Orion when it became the app-wide default (2026-09-23): every browser,
// including ones that had picked another design earlier, starts on Orion once. A design
// picked in Settings afterwards sticks as before. index.html's pre-paint script does the
// same, so there is no flash of the old design.
const ORION_DEFAULT_KEY = "asta_ui_theme_orion_default";

function read(): UIDesign {
  try {
    if (!localStorage.getItem(ORION_DEFAULT_KEY)) {
      localStorage.setItem(KEY, "orion");
      localStorage.setItem(ORION_DEFAULT_KEY, "1");
    }
    const v = localStorage.getItem(KEY);
    return v === "material" || v === "minimal" || v === "ios" ? v : "orion";
  } catch {
    return "orion";
  }
}

const structural = (d: UIDesign): UITheme => (d === "orion" ? "ios" : d);

let design: UIDesign = read();
let current: UITheme = structural(design);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function apply(d: UIDesign) {
  design = d;
  current = structural(d);
  const root = document.documentElement;
  root.dataset.uiTheme = current;
  if (d === "orion") root.dataset.uiSkin = "orion";
  else delete root.dataset.uiSkin;
}

export const getUITheme = () => current;
export const getUIDesign = () => design;

export function setUITheme(t: UIDesign) {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* private mode — the choice still applies for this session */
  }
  // The iOS icon set is fetched on demand; wait for it so icons never flash back to Lucide
  if (structural(t) === "ios") {
    loadIosIcons().finally(() => {
      apply(t);
      emit();
    });
  } else {
    apply(t);
    emit();
  }
}

// Call once before the first render
export function initUITheme() {
  apply(read());
  // Keep other open tabs in sync
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      const t = read();
      if (structural(t) === "ios") loadIosIcons().finally(() => { apply(t); emit(); });
      else { apply(t); emit(); }
    }
  });
}

export function useUITheme(): UITheme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getUITheme,
    () => "ios" as UITheme,
  );
}

// The chosen design including skins ("orion") — for pickers and skin-only extras
export function useUIDesign(): UIDesign {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getUIDesign,
    () => "orion" as UIDesign,
  );
}
