import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { getUITheme, useUITheme } from "@/lib/uiTheme";

const minimalVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2.5",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const materialVariants = cva(
  "md-ripple md-state inline-flex items-center justify-center rounded-full text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-outline bg-transparent",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2.5",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const iosVariants = cva(
  "inline-flex items-center justify-center rounded-full text-[14px] font-medium transition-[transform,background-color] duration-200 active:scale-[0.96] hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-40 data-[state=on]:bg-primary/[0.14] data-[state=on]:text-primary",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "ios-glass-btn",
      },
      size: {
        default: "h-10 px-3.5",
        sm: "h-9 px-3",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const toggleVariants = (opts?: Parameters<typeof materialVariants>[0]) => {
  const theme = getUITheme();
  return (theme === "ios" ? iosVariants : theme === "material" ? materialVariants : minimalVariants)(opts);
};

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof materialVariants>
>(({ className, variant, size, ...props }, ref) => {
  useUITheme();
  return <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ variant, size, className }))} {...props} />;
});

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
