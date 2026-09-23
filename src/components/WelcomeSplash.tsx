import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "@/lib/icons";

// Welcome card shown after every sign-in. Auth marks the fresh login (sessionStorage, so
// it lives in the tab that just signed in); the app shell shows the card until the user
// taps "Enter ASTA One". The card is liquid glass whose water and colour keep drifting —
// styles are `.welcome-*` in index.css.
const KEY = "asta_welcome_pending";

export const markFreshLogin = () => {
  try { sessionStorage.setItem(KEY, "1"); } catch { /* private mode — no welcome, no harm */ }
};

export const isWelcomePending = () => {
  try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; }
};

export function WelcomeSplash() {
  const [open, setOpen] = useState(isWelcomePending);

  const enter = () => {
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") enter(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="welcome-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
            className="welcome-card"
            initial={{ opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.97 }}
            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
          >
            <span className="welcome-liquid" aria-hidden>
              <i /><i /><i /><i /><i />
            </span>
            <span className="welcome-light" aria-hidden />

            <div className="welcome-body">
              <span className="welcome-mark" aria-hidden>A</span>
              <p className="welcome-kicker">Welcome to</p>
              <h2 id="welcome-title" className="welcome-title">ASTA One</h2>
              <p className="welcome-lead">The best-looking ERP in its segment.</p>
              <p className="welcome-copy">
                Sales, inventory, payments, service and your whole team, beautifully in one place.
                Crafted to make every number feel effortless.
              </p>
              <button type="button" className="welcome-enter" onClick={enter}>
                Enter ASTA One <ArrowRight />
              </button>
              <p className="welcome-by">
                <Sparkles /> Made by Saffyre Intelligence Labs
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
