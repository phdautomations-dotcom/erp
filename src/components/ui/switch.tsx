import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";
import { useUITheme, type UITheme } from "@/lib/uiTheme";

const ROOT: Record<UITheme, string> = {
  minimal:
    "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
  // Material 3 switch: 52×32 track, 16px thumb (off) growing to 24px (on)
  material:
    "peer inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:border-outline data-[state=unchecked]:bg-surface-container-highest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40",
  // iOS switch: 51×31, systemGreen when on, big white thumb
  ios: "peer inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 data-[state=checked]:bg-[#34C759] data-[state=unchecked]:bg-black/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-40",
};

const THUMB: Record<UITheme, string> = {
  minimal:
    "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
  material:
    "pointer-events-none block rounded-full ring-0 transition-all duration-200 data-[state=checked]:h-6 data-[state=checked]:w-6 data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-primary-foreground data-[state=unchecked]:h-4 data-[state=unchecked]:w-4 data-[state=unchecked]:translate-x-[6px] data-[state=unchecked]:bg-outline",
  ios: "pointer-events-none block h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.25),0_0_1px_rgb(0_0_0/0.3)] ring-0 transition-transform duration-300 data-[state=checked]:translate-x-[20px] data-[state=unchecked]:translate-x-0",
};

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => {
  const theme = useUITheme();
  return (
    <SwitchPrimitives.Root className={cn(ROOT[theme], className)} {...props} ref={ref}>
      <SwitchPrimitives.Thumb className={cn(THUMB[theme])} />
    </SwitchPrimitives.Root>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
