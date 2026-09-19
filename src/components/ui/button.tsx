import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { getUITheme, useUITheme } from "@/lib/uiTheme";

// Minimal theme — the earlier flat design
const minimalVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// Material 3 theme — fully rounded, label-large text, state layers on
// hover/focus/press and a touch ripple. default = filled, secondary = filled
// tonal, outline = outlined, ghost = text button.
const materialVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium tracking-[0.006em] ring-offset-background transition-[box-shadow,background-color,color,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "md-ripple md-state bg-primary text-primary-foreground hover:shadow-sm",
        destructive: "md-ripple md-state bg-destructive text-destructive-foreground hover:shadow-sm",
        outline: "md-ripple md-state border border-outline bg-transparent text-primary",
        secondary: "md-ripple md-state bg-secondary text-secondary-foreground hover:shadow-sm",
        ghost: "md-ripple md-state bg-transparent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-3.5 text-[13px]",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// iOS Liquid Glass — capsule buttons: filled blue with a soft gloss, tinted, glass,
// and plain text; every one shrinks slightly while pressed.
const iosVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[15px] font-semibold tracking-[-0.011em] transition-[transform,opacity,background-color,box-shadow] duration-200 active:scale-[0.97] active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_6px_16px_rgb(0_122_255/0.30)]",
        destructive: "bg-destructive text-destructive-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_6px_16px_rgb(255_59_48/0.28)]",
        outline: "ios-glass-btn text-primary",
        secondary: "bg-primary/[0.13] text-primary",
        ghost: "bg-transparent hover:bg-black/[0.05]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-[14px]",
        lg: "h-[52px] px-7 text-[17px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// Callable outside React too (e.g. AlertDialogAction) — uses whichever theme is active right now
const buttonVariants = (opts?: Parameters<typeof materialVariants>[0]) => {
  const theme = getUITheme();
  return (theme === "ios" ? iosVariants : theme === "material" ? materialVariants : minimalVariants)(opts);
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof materialVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    useUITheme(); // re-render when the user switches theme
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
