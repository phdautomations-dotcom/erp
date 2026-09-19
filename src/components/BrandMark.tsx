import { Building2 } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useUITheme } from "@/lib/uiTheme";

// App mark — Material: solid primary "A" monogram · Minimal: violet→indigo gradient tile ·
// iOS: blue gradient app-icon squircle with a glossy top edge
export function BrandMark({ className }: { className?: string }) {
  const theme = useUITheme();

  if (theme === "material") {
    return (
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-primary text-primary-foreground", className)}>
        <span className="font-display text-[19px] font-bold leading-none">A</span>
      </div>
    );
  }

  if (theme === "ios") {
    return (
      <div
        className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[24%] text-white", className)}
        style={{
          backgroundImage: "linear-gradient(160deg, #5AC8FA 0%, #007AFF 100%)",
          boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.5), 0 4px 12px rgb(0 122 255 / 0.35)",
        }}
      >
        <span className="font-display text-[20px] font-bold leading-none">A</span>
      </div>
    );
  }

  return (
    <div
      className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white", className)}
      style={{ backgroundImage: "var(--gradient-brand)", boxShadow: "0 2px 10px hsl(243 75% 59% / 0.4)" }}
    >
      <Building2 className="h-4 w-4" />
    </div>
  );
}
