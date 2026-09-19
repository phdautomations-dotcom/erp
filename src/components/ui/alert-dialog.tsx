import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "@/lib/utils";
import { useUITheme, type UITheme } from "@/lib/uiTheme";
import { buttonVariants } from "@/components/ui/button";

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const OVERLAY_ANIM =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";
const OVERLAY: Record<UITheme, string> = {
  minimal: `fixed inset-0 z-50 bg-black/80 ${OVERLAY_ANIM}`,
  material: `fixed inset-0 z-50 bg-black/[0.32] ${OVERLAY_ANIM}`,
  ios: `fixed inset-0 z-50 bg-black/25 backdrop-blur-[3px] ${OVERLAY_ANIM}`,
};

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const theme = useUITheme();
  return <AlertDialogPrimitive.Overlay className={cn(OVERLAY[theme], className)} {...props} ref={ref} />;
});
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const ANIM =
  "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]";

const CONTENT: Record<UITheme, string> = {
  minimal: `fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg ${ANIM} sm:rounded-lg`,
  material: `fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[28px] border-0 bg-surface-container-high p-6 shadow-xl ${ANIM}`,
  ios: `ios-glass-sheet fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[32px] p-6 ${ANIM}`,
};

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => {
  const theme = useUITheme();
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content ref={ref} className={cn(CONTENT[theme], className)} {...props} />
    </AlertDialogPortal>
  );
});
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const theme = useUITheme();
  return (
    <div
      className={cn(
        theme === "minimal" ? "flex flex-col space-y-2 text-center sm:text-left" : "flex flex-col space-y-2 text-left",
        className,
      )}
      {...props}
    />
  );
};
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const theme = useUITheme();
  return (
    <div
      className={cn(
        theme === "minimal"
          ? "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2"
          : "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
};
AlertDialogFooter.displayName = "AlertDialogFooter";

const TITLE: Record<UITheme, string> = {
  minimal: "text-lg font-semibold",
  material: "font-display text-[22px] font-normal leading-7",
  ios: "font-display text-[20px] font-semibold leading-7 tracking-[-0.022em]",
};

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  const theme = useUITheme();
  return <AlertDialogPrimitive.Title ref={ref} className={cn(TITLE[theme], className)} {...props} />;
});
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => {
  useUITheme();
  return <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />;
});
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => {
  const theme = useUITheme();
  return (
    <AlertDialogPrimitive.Cancel
      ref={ref}
      className={cn(
        theme === "material"
          ? cn(buttonVariants({ variant: "ghost" }), "text-primary")
          : theme === "ios"
            ? buttonVariants({ variant: "secondary" })
            : cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0"),
        className,
      )}
      {...props}
    />
  );
});
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
