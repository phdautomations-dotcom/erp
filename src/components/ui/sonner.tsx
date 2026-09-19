import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useUITheme, type UITheme } from "@/lib/uiTheme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const TOAST: Record<UITheme, NonNullable<NonNullable<ToasterProps["toastOptions"]>["classNames"]>> = {
  minimal: {
    toast:
      "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
    description: "group-[.toast]:text-muted-foreground",
    actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
    cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
  },
  // Material 3 snackbar: dark "inverse surface", small radius, text-button action
  material: {
    toast:
      "group toast group-[.toaster]:bg-inverse-surface group-[.toaster]:text-inverse-on-surface group-[.toaster]:border-0 group-[.toaster]:rounded-lg group-[.toaster]:shadow-lg group-[.toaster]:font-sans",
    description: "group-[.toast]:text-inverse-on-surface/70",
    actionButton: "group-[.toast]:bg-transparent group-[.toast]:text-inverse-primary group-[.toast]:font-medium",
    cancelButton: "group-[.toast]:bg-transparent group-[.toast]:text-inverse-on-surface/70",
  },
  // iOS notification banner: frosted glass, big corners
  ios: {
    toast: "group toast ios-glass-strong group-[.toaster]:text-foreground group-[.toaster]:rounded-[22px] group-[.toaster]:font-sans",
    description: "group-[.toast]:text-muted-foreground",
    actionButton: "group-[.toast]:bg-transparent group-[.toast]:text-primary group-[.toast]:font-semibold",
    cancelButton: "group-[.toast]:bg-transparent group-[.toast]:text-muted-foreground",
  },
};

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const uiTheme = useUITheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{ classNames: TOAST[uiTheme] }}
      {...props}
    />
  );
};

export { Toaster, toast };
