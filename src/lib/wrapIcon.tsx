import { forwardRef } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import { useUITheme, useUIDesign } from "@/lib/uiTheme";
import { getIosGlyph } from "@/lib/iosIcons";
import { getSapGlyph, SAP_VIEWBOX } from "@/lib/sapLoader";

const VIEWBOX = "0 0 56 56";

// Renders the Lucide icon everywhere except the iOS theme (SF-Symbols-style glyph) and the SAP
// design (SAP Fiori icon). Sizing works the same (className / size props).
export function wrapIcon(name: string, Base: LucideIcon): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, LucideProps>((props, ref) => {
    const theme = useUITheme();
    const sap = useUIDesign() === "sap";
    const d = sap ? getSapGlyph(name) : theme === "ios" ? getIosGlyph(name) : undefined;
    if (!d) return <Base ref={ref} {...props} />;

    // Stroke-related props only make sense for outline icons — drop them for filled glyphs
    const { size = 24, color, strokeWidth, absoluteStrokeWidth, className, children, ...rest } = props;
    void strokeWidth; void absoluteStrokeWidth; void children;
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={sap ? SAP_VIEWBOX : VIEWBOX}
        width={size}
        height={size}
        fill={color ?? "currentColor"}
        className={className}
        aria-hidden="true"
        {...rest}
      >
        <path d={d} />
      </svg>
    );
  });
  Icon.displayName = name;
  return Icon as unknown as LucideIcon;
}
