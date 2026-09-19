import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { useUITheme } from "@/lib/uiTheme";

const minimalLabel = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");
// Material + iOS share the small muted form-label style
const softLabel = cva(
  "text-[13px] font-medium leading-none tracking-[0.01em] text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof minimalLabel>
>(({ className, ...props }, ref) => {
  const theme = useUITheme();
  return <LabelPrimitive.Root ref={ref} className={cn((theme === "minimal" ? minimalLabel : softLabel)(), className)} {...props} />;
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
