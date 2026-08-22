import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** "destructive" (red) for deletes/revokes; "default" uses the brand gradient. */
  variant?: "default" | "destructive";
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// One dialog instance for the whole app — every page calls the same
// useConfirm() hook instead of shipping its own confirmation UI, and they
// all render through this single provider mounted once in App.tsx.
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({});
  const resolveRef = useRef<(value: boolean) => void>();

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(typeof opts === "string" ? { description: opts } : opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => { resolveRef.current = resolve; });
  }, []);

  const settle = (value: boolean) => {
    setOpen(false);
    resolveRef.current?.(value);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={(v) => { if (!v) settle(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title || "Are you sure?"}</AlertDialogTitle>
            {options.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>{options.cancelText || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => settle(true)}
              className={options.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "btn-gradient"}
            >
              {options.confirmText || "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

// Returns an async confirm() — same call shape as window.confirm (pass a
// string, or an options object for a custom title/description/variant) but
// resolves a promise instead of blocking, and renders as a styled dialog
// instead of the browser's native popup.
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm() must be used within <ConfirmDialogProvider>");
  return ctx;
}
