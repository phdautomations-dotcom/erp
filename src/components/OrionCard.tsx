import { Children, isValidElement, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { ArrowUpRight } from "@/lib/icons";
import { cn } from "@/lib/utils";

// Orion design's signature card: a translucent gradient squircle with a white glyph,
// a light title, "subtitle • meta" line and a soap-bubble arrow button. Styles live in
// index.css (`.orion-card*`, `.orion-bubble`) and scale with the card's own width.
export type OrionTone = "lime" | "mocha" | "sky" | "peach" | "mint" | "lilac" | "sun" | "graphite" | "pearl";

// Colour is used sparingly, like the reference: one lime hero, one mocha glass card,
// and everything after that is calm pearl glass. Rainbow grids read as "candy", not premium.
export const ORION_TONES: OrionTone[] = ["lime", "mocha"];
export const orionTone = (i: number): OrionTone => ORION_TONES[i] ?? "pearl";

export function OrionCard({
  tone,
  icon: Icon,
  title,
  subtitle,
  meta,
  compact,
  hero,
  strip,
  className,
  onClick,
}: {
  tone: OrionTone;
  icon: ComponentType<{ className?: string }>;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  compact?: boolean;
  /** Tall glass pane laid out like the reference (Receivable / Payable) */
  hero?: boolean;
  /** Short horizontal pane: icon · number over label · bubble (dashboard mini stats) */
  strip?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("orion-card", `orion-card--${tone}`, compact && "orion-card--compact", hero && "orion-card--hero", strip && "orion-card--strip", className)}
    >
      {/* A pane of tinted glass: fill (translucent colour) → pour (hover-only swirl) →
          content → edge glow (::after) → glass edge hairline (::before). Fill and pour
          are real elements so both pseudo-elements stay free for the glass itself; see
          the "Orion glass cards" notes in index.css. */}
      <span className="orion-card__fill" aria-hidden />
      <span className="orion-card__pour" aria-hidden />
      <span className="orion-card__inner">
        <span className="orion-card__icon">
          <Icon />
        </span>
        <span className="orion-card__text">
          <span className="orion-card__title">{title}</span>
          {(subtitle || meta) && (
            <span className="orion-card__sub">
              {subtitle && <span>{subtitle}</span>}
              {subtitle && meta && <span className="orion-card__dot">•</span>}
              {meta && <span className="orion-card__meta">{meta}</span>}
            </span>
          )}
        </span>
        <span className="orion-bubble" aria-hidden>
          <ArrowUpRight />
        </span>
      </span>
    </button>
  );
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

// Card grid that never leaves a half-empty last row. It measures its own width, fits
// as many `minItem`-wide columns as it can (≤ maxCols), then prefers a column count
// that divides the card count evenly; if none does, the last row's cards stretch to
// fill the width. Row height comes from the card's aspect ratio (width / height).
export function OrionGrid({
  children,
  minItem,
  maxCols,
  gap,
  aspect,
  className,
}: {
  children: ReactNode;
  minItem: number;
  maxCols: number;
  gap: number;
  aspect: number | ((cellWidth: number) => number);
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const items = Children.toArray(children);
  const n = items.length;
  const fit = Math.max(1, Math.min(maxCols, n, Math.floor((width + gap) / (minItem + gap))));
  const cols = [fit, fit - 1].find((c) => c >= 2 && n % c === 0) ?? fit;
  const rem = n % cols;
  // Shared track count so both full rows (cols per row) and the last row (rem) divide it
  const tracks = rem ? (cols * rem) / gcd(cols, rem) : cols;
  const cellW = width ? (width - (cols - 1) * gap) / cols : 0;
  const ratio = typeof aspect === "function" ? aspect(cellW) : aspect;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        display: "grid",
        gap,
        gridTemplateColumns: `repeat(${tracks}, minmax(0, 1fr))`,
        gridAutoRows: cellW ? `${Math.round(cellW / ratio)}px` : undefined,
        visibility: width ? undefined : "hidden",
      }}
    >
      {items.map((child, i) => (
        <div
          key={isValidElement(child) && child.key != null ? child.key : i}
          className="orion-cell flex min-w-0"
          style={{ gridColumn: `span ${rem && i >= n - rem ? tracks / rem : tracks / cols}` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
