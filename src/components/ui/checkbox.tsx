import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "@/lib/icons";

import { cn } from "@/lib/utils";
import { useUITheme, type UITheme } from "@/lib/uiTheme";

const ROOT: Record<UITheme, string> = {
  minimal:
    "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  // Material 3 checkbox: 18px, 2px outline, filled primary when checked
  material:
    "peer h-[18px] w-[18px] shrink-0 rounded-[3px] border-2 border-muted-foreground bg-transparent ring-offset-background transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40",
  // iOS: round tick circle, like Reminders
  ios: "peer h-[22px] w-[22px] shrink-0 rounded-full border-[1.5px] border-black/25 bg-transparent transition-all duration-200 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-40",
};

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => {
  const theme = useUITheme();
  return (
    <CheckboxPrimitive.Root ref={ref} className={cn(ROOT[theme], className)} {...props}>
      <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
        {theme === "minimal" ? <Check className="h-4 w-4" /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
