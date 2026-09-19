import * as React from "react";

import { cn } from "@/lib/utils";
import { useUITheme, type UITheme } from "@/lib/uiTheme";

const FIELD: Record<UITheme, string> = {
  minimal:
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  // Material 3 outlined text field: 1px outline → on-surface on hover → 2px primary on focus
  material:
    "flex h-10 w-full rounded-[6px] border border-input bg-transparent px-3 py-2 text-base text-foreground transition-[border-color,box-shadow] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 hover:border-foreground/80 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40 md:text-sm",
  // iOS: borderless soft-grey rounded field that lifts to frosted white on focus
  ios:
    "flex h-11 w-full rounded-xl border-0 bg-black/[0.05] px-3.5 py-2 text-base text-foreground transition-[background-color,box-shadow] duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 hover:bg-black/[0.07] focus-visible:outline-none focus-visible:bg-white/80 focus-visible:ring-2 focus-visible:ring-primary/45 disabled:cursor-not-allowed disabled:opacity-40 md:text-[15px]",
};

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const theme = useUITheme();
    return <input type={type} className={cn(FIELD[theme], className)} ref={ref} {...props} />;
  },
);
Input.displayName = "Input";

export { Input };
