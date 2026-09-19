import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";
import { useUITheme, type UITheme } from "@/lib/uiTheme";

const TRACK: Record<UITheme, string> = {
  minimal: "relative h-2 w-full grow overflow-hidden rounded-full bg-secondary",
  material: "relative h-1 w-full grow overflow-hidden rounded-full bg-secondary",
  ios: "relative h-1 w-full grow overflow-hidden rounded-full bg-black/[0.12]",
};

const THUMB: Record<UITheme, string> = {
  minimal:
    "block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  material:
    "block h-5 w-5 rounded-full bg-primary shadow-md ring-offset-background transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40",
  ios: "block h-7 w-7 rounded-full bg-white shadow-[0_2px_8px_rgb(0_0_0/0.25),0_0_0_0.5px_rgb(0_0_0/0.08)] transition-transform active:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-40",
};

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  const theme = useUITheme();
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className={TRACK[theme]}>
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={THUMB[theme]} />
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
