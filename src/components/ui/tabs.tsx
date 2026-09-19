import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";
import { useUITheme, type UITheme } from "@/lib/uiTheme";

const Tabs = TabsPrimitive.Root;

const LIST: Record<UITheme, string> = {
  minimal: "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
  // Material 3 segmented control: outlined capsule, selected segment = secondary container
  material: "inline-flex h-10 items-center justify-center gap-0.5 rounded-full border border-border bg-card p-1 text-muted-foreground",
  // iOS segmented control: grey capsule track with a white "thumb"
  ios: "inline-flex h-10 items-center justify-center gap-0.5 rounded-full bg-black/[0.06] p-[3px] text-muted-foreground",
};

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const theme = useUITheme();
  return <TabsPrimitive.List ref={ref} className={cn(LIST[theme], className)} {...props} />;
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TRIGGER: Record<UITheme, string> = {
  minimal:
    "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  material:
    "md-ripple inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ring-offset-background transition-colors hover:text-foreground data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40",
  ios: "inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 hover:text-foreground data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_4px_rgb(0_0_0/0.16),0_0_0_0.5px_rgb(0_0_0/0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-40",
};

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const theme = useUITheme();
  return <TabsPrimitive.Trigger ref={ref} className={cn(TRIGGER[theme], className)} {...props} />;
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
