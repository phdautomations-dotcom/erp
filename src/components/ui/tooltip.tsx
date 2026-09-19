import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";
import { useUITheme, type UITheme } from "@/lib/uiTheme";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const ANIM =
  "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";

const CONTENT: Record<UITheme, string> = {
  minimal: `z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md ${ANIM}`,
  // Material 3 plain tooltip: dark inverse surface
  material: `z-50 overflow-hidden rounded-md border-0 bg-inverse-surface px-3 py-1.5 text-xs font-medium text-inverse-on-surface shadow-md ${ANIM}`,
  // iOS: small dark glass label
  ios: `z-50 overflow-hidden rounded-lg border-0 bg-[rgb(28_28_30/0.82)] px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md ${ANIM}`,
};

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  const theme = useUITheme();
  return <TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn(CONTENT[theme], className)} {...props} />;
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
