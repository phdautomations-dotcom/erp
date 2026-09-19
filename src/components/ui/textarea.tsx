import * as React from "react";

import { cn } from "@/lib/utils";
import { useUITheme, type UITheme } from "@/lib/uiTheme";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const AREA: Record<UITheme, string> = {
  minimal:
    "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  material:
    "flex min-h-[80px] w-full rounded-[6px] border border-input bg-transparent px-3 py-2 text-sm text-foreground transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-foreground/80 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40",
  ios:
    "flex min-h-[88px] w-full rounded-xl border-0 bg-black/[0.05] px-3.5 py-2.5 text-[15px] text-foreground transition-[background-color,box-shadow] duration-200 placeholder:text-muted-foreground/70 hover:bg-black/[0.07] focus-visible:outline-none focus-visible:bg-white/80 focus-visible:ring-2 focus-visible:ring-primary/45 disabled:cursor-not-allowed disabled:opacity-40",
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  const theme = useUITheme();
  return <textarea className={cn(AREA[theme], className)} ref={ref} {...props} />;
});
Textarea.displayName = "Textarea";

export { Textarea };
