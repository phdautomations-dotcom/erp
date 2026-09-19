import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "@/lib/icons";

import { cn } from "@/lib/utils";
import { useUITheme, type UITheme } from "@/lib/uiTheme";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const TRIGGER: Record<UITheme, string> = {
  minimal:
    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
  material:
    "flex h-10 w-full items-center justify-between rounded-[6px] border border-input bg-transparent px-3 py-2 text-sm text-foreground transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-foreground/80 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary data-[state=open]:border-primary data-[state=open]:ring-1 data-[state=open]:ring-primary disabled:cursor-not-allowed disabled:opacity-40 [&>span]:line-clamp-1",
  ios:
    "flex h-11 w-full items-center justify-between rounded-xl border-0 bg-black/[0.05] px-3.5 py-2 text-[15px] text-foreground transition-[background-color,box-shadow] duration-200 placeholder:text-muted-foreground/70 hover:bg-black/[0.07] focus:outline-none focus:bg-white/80 focus:ring-2 focus:ring-primary/45 data-[state=open]:bg-white/80 data-[state=open]:ring-2 data-[state=open]:ring-primary/45 disabled:cursor-not-allowed disabled:opacity-40 [&>span]:line-clamp-1",
};

const CHEVRON: Record<UITheme, string> = {
  minimal: "h-4 w-4 opacity-50",
  material: "h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180",
  ios: "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180",
};

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const theme = useUITheme();
  return (
    <SelectPrimitive.Trigger ref={ref} className={cn(TRIGGER[theme], className)} {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className={CHEVRON[theme]} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const ANIM =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2";

const CONTENT: Record<UITheme, string> = {
  minimal: `relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md ${ANIM}`,
  material: `relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl border-0 bg-popover text-popover-foreground shadow-lg ${ANIM}`,
  ios: `ios-glass-sheet relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-[20px] text-popover-foreground ${ANIM}`,
};

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => {
  const theme = useUITheme();
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          CONTENT[theme],
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            theme === "minimal" ? "p-1" : "p-1.5",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label ref={ref} className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)} {...props} />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const ITEM: Record<UITheme, string> = {
  minimal:
    "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
  material:
    "relative flex w-full cursor-default select-none items-center rounded-lg py-2 pl-9 pr-3 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-40 focus:bg-foreground/[0.08] data-[state=checked]:bg-secondary data-[state=checked]:text-secondary-foreground data-[state=checked]:font-medium",
  ios:
    "relative flex w-full cursor-default select-none items-center rounded-xl py-2.5 pl-9 pr-3 text-[15px] outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-40 focus:bg-black/[0.06] data-[state=checked]:font-medium data-[state=checked]:text-primary",
};

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  const theme = useUITheme();
  return (
    <SelectPrimitive.Item ref={ref} className={cn(ITEM[theme], className)} {...props}>
      <span className={cn("absolute flex h-3.5 w-3.5 items-center justify-center", theme === "minimal" ? "left-2" : "left-3")}>
        <SelectPrimitive.ItemIndicator>
          <Check className={cn("h-4 w-4", theme !== "minimal" && "text-primary")} />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
