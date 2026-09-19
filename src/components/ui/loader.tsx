import { cn } from "@/lib/utils";
import { useUITheme } from "@/lib/uiTheme";

// Material → Android circular indeterminate progress (a rounded arc that grows and
// shrinks while the ring keeps turning). iOS → the 12-spoke UIActivityIndicator.
// Minimal → the simple ring spinner it always had.
export function Loader({ size = 40, className, label = "Loading" }: { size?: number; className?: string; label?: string }) {
  const theme = useUITheme();

  if (theme === "minimal") {
    return (
      <div
        role="status"
        aria-label={label}
        className={cn("animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  if (theme === "ios") {
    return (
      <svg
        role="status"
        aria-label={label}
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={cn("ios-spinner shrink-0 text-muted-foreground", className)}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <line
            key={i}
            x1="12" y1="2.6" x2="12" y2="6.6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity={0.14 + (i / 11) * 0.86}
            transform={`rotate(${i * 30} 12 12)`}
          />
        ))}
      </svg>
    );
  }

  return (
    <svg
      role="status"
      aria-label={label}
      viewBox="0 0 66 66"
      width={size}
      height={size}
      className={cn("md-loader shrink-0 text-primary", className)}
    >
      <circle className="md-loader-arc" cx="33" cy="33" r="30" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
    </svg>
  );
}

// Centred loader that fills the space it is given (route/page loading)
export function PageLoader({ className, size = 48 }: { className?: string; size?: number }) {
  return (
    <div className={cn("flex min-h-[40vh] w-full items-center justify-center", className)}>
      <Loader size={size} />
    </div>
  );
}
