// Material "touch ripple": a translucent circle that grows from the press point
// and fades on release. Any element with the `.md-ripple` class gets it — the
// layer is a separate absolutely-positioned child, so the host keeps its own
// overflow (badges, dropdown anchors, …) untouched.
export function initRipple() {
  if (typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  document.addEventListener(
    "pointerdown",
    (e: PointerEvent) => {
      if (e.button !== 0) return;
      // Ripples belong to the Material theme only (iOS uses press-scale instead)
      if (document.documentElement.dataset.uiTheme !== "material") return;
      const host = (e.target as HTMLElement | null)?.closest<HTMLElement>(".md-ripple");
      if (!host) return;
      if (host.hasAttribute("disabled") || host.getAttribute("aria-disabled") === "true") return;

      const rect = host.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Big enough to reach the farthest corner from the press point
      const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));

      const layer = document.createElement("span");
      layer.className = "md-ripple-layer";
      layer.setAttribute("aria-hidden", "true");
      const dot = document.createElement("span");
      dot.className = "md-ripple-dot";
      dot.style.width = dot.style.height = `${radius * 2}px`;
      dot.style.left = `${x - radius}px`;
      dot.style.top = `${y - radius}px`;
      layer.appendChild(dot);
      host.appendChild(layer);

      const release = () => {
        dot.classList.add("md-ripple-out");
        window.setTimeout(() => layer.remove(), 380);
        cleanup();
      };
      const cleanup = () => {
        window.removeEventListener("pointerup", release);
        window.removeEventListener("pointercancel", release);
      };
      window.addEventListener("pointerup", release, { once: true });
      window.addEventListener("pointercancel", release, { once: true });
      // Safety net: never leave a ripple behind if a release event is missed
      window.setTimeout(() => { if (layer.isConnected) release(); }, 1500);
    },
    { passive: true },
  );
}
