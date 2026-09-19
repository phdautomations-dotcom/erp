import { useSyncExternalStore } from "react";
import { loadIosIcons } from "./iosIcons";

// Three selectable designs, remembered per browser:
//   "material" — Google Material 3 (default): tonal surfaces, pill buttons, Google Sans / Roboto
//   "minimal"  — the earlier flat indigo design
//   "ios"      — iOS "Liquid Glass": translucent blurred glass, SF-style icons, capsule controls
// The active theme is mirrored to <html data-ui-theme="…"> so CSS tokens switch
// instantly, and components subscribe via useUITheme() for their class choices.
export type UITheme = "material" | "minimal" | "ios";
const KEY = "asta_ui_theme";

function read(): UITheme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "minimal" || v === "ios" ? v : "material";
  } catch {
    return "material";
  }
}

let current: UITheme = read();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function apply(t: UITheme) {
  current = t;
  document.documentElement.dataset.uiTheme = t;
}

export const getUITheme = () => current;

export function setUITheme(t: UITheme) {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* private mode — the choice still applies for this session */
  }
  // The iOS icon set is fetched on demand; wait for it so icons never flash back to Lucide
  if (t === "ios") {
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
      if (t === "ios") loadIosIcons().finally(() => { apply(t); emit(); });
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
    () => "material" as UITheme,
  );
}
