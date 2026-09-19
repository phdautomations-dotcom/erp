import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@/lib/icons";

import { cn } from "@/lib/utils";
import { useUITheme, type UITheme } from "@/lib/uiTheme";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const OVERLAY_ANIM =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";
const OVERLAY: Record<UITheme, string> = {
  minimal: `fixed inset-0 z-50 bg-black/80 ${OVERLAY_ANIM}`,
  // Material 3: 32% scrim
  material: `fixed inset-0 z-50 bg-black/[0.32] ${OVERLAY_ANIM}`,
  // iOS: light dim + a touch of blur behind the glass sheet
  ios: `fixed inset-0 z-50 bg-black/25 backdrop-blur-[3px] ${OVERLAY_ANIM}`,
};

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const theme = useUITheme();
  return <DialogPrimitive.Overlay ref={ref} className={cn(OVERLAY[theme], className)} {...props} />;
});
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const ANIM =
  "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]";

const CONTENT: Record<UITheme, string> = {
  minimal: `fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg ${ANIM} sm:rounded-lg`,
  // Material 3 dialog: 28px corners, tonal "surface container high" fill
  material: `fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[28px] border-0 bg-surface-container-high p-6 shadow-xl ${ANIM}`,
  // iOS: frosted glass sheet with big continuous corners
  ios: `ios-glass-sheet fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[32px] p-6 ${ANIM}`,
};

const CLOSE: Record<UITheme, string> = {
  minimal:
    "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
  material:
    "md-ripple md-state absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none",
  ios: "absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.07] text-muted-foreground transition hover:bg-black/[0.1] active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none",
};

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const theme = useUITheme();
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content ref={ref} className={cn(CONTENT[theme], className)} {...props}>
        {children}
        <DialogPrimitive.Close className={CLOSE[theme]}>
          <X className={theme === "minimal" ? "h-4 w-4" : theme === "ios" ? "h-3.5 w-3.5" : "h-[18px] w-[18px]"} />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const theme = useUITheme();
  return (
    <div
      className={cn(
        theme === "minimal" ? "flex flex-col space-y-1.5 text-center sm:text-left" : "flex flex-col space-y-2 pr-8 text-left",
        className,
      )}
      {...props}
    />
  );
};
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
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
DialogFooter.displayName = "DialogFooter";

const TITLE: Record<UITheme, string> = {
  minimal: "text-lg font-semibold leading-none tracking-tight",
  material: "font-display text-[22px] font-normal leading-7 tracking-normal text-foreground",
  ios: "font-display text-[20px] font-semibold leading-7 tracking-[-0.022em] text-foreground",
};

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  const theme = useUITheme();
  return <DialogPrimitive.Title ref={ref} className={cn(TITLE[theme], className)} {...props} />;
});
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
