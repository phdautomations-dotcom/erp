import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAIAssistant, type MatchedDraft } from "@/hooks/useAIAssistant";
import saffyreLogo from "@/assets/saffyre-logo-256.png";

// Floating in-app AI assistant. Answers come from Google Gemini's free
// tier via a Vercel serverless proxy (api/ai-chat.js) — the API key
// never reaches the browser. Shared between the admin and engineer apps.
//
// onDraftReady: when the user asks it to create an invoice/purchase/etc,
// the AI never saves anything itself — it only produces a matched draft.
// Pass this to have the draft handed to your own create-document UI
// (e.g. EngineerApp opens its doc sheet prefilled). Omit it (admin) and
// the hook falls back to navigating to the admin create-document route.
const POS_KEY = "saffyre_ai_btn_pos";

export const AIAssistant = ({ onDraftReady }: { onDraftReady?: (draft: MatchedDraft) => void }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, ask, thinking } = useAIAssistant(onDraftReady);
  const scrollRef = useRef<HTMLDivElement>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  // Dragged position persists per-browser (fixed bottom-5 right-5 is the
  // origin; x/y are just the offset from there) so it stays where you left
  // it across reloads.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const dragDistance = useRef(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) {
        const { x: sx, y: sy } = JSON.parse(saved);
        x.set(sx);
        y.set(sy);
      }
    } catch { /* localStorage unavailable — just start at the default spot */ }
  }, []);

  const persistPosition = () => {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({ x: x.get(), y: y.get() }));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const send = () => {
    if (!input.trim() || thinking) return;
    ask(input.trim());
    setInput("");
  };

  return (
    <>
      {/* Full-viewport, invisible — just gives the button somewhere to be dragged within */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[59]" />

      <motion.button
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.05}
        dragMomentum={false}
        style={{ x, y }}
        onDragStart={() => { dragDistance.current = 0; }}
        onDrag={(_, info) => { dragDistance.current += Math.abs(info.delta.x) + Math.abs(info.delta.y); }}
        onDragEnd={persistPosition}
        onClick={() => { if (dragDistance.current > 6) return; setOpen(v => !v); }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 z-[60] h-24 w-24 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
        title="Saffyre AI — drag to move"
      >
        {open ? (
          <span className="h-14 w-14 rounded-full bg-foreground text-background shadow-xl shadow-black/20 flex items-center justify-center">
            <X className="h-5 w-5" />
          </span>
        ) : (
          <img
            src={saffyreLogo}
            alt="Saffyre AI"
            draggable={false}
            className="h-24 w-24 object-contain"
            style={{ filter: "drop-shadow(0 6px 18px hsl(228 70% 55% / 0.45))" }}
          />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-24 right-5 z-[60] w-[calc(100vw-2.5rem)] max-w-sm h-[70vh] max-h-[560px] bg-card border border-border/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div
              className="px-4 py-3 border-b border-border/50 flex items-center gap-2.5 text-white"
              style={{ background: "linear-gradient(135deg, hsl(212 90% 45%), hsl(243 75% 59%))" }}
            >
              <img src={saffyreLogo} alt="Saffyre AI" className="h-12 w-12 object-contain shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">Saffyre AI</p>
                <p className="text-[10px] text-white/70 leading-tight">Saffyre Intelligence Labs</p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 px-4 py-3 overflow-y-auto">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Pooch sakte ho — jaise "is mahine ka sales kitna hua", "ABC ka balance kya hai", ya "bearing 6205 ka stock kitna hai".
                </p>
              )}
              <div className="space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.role === "user" ? "bg-foreground text-background" : "bg-secondary text-foreground"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm bg-secondary text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Thinking…
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-border/50 flex items-center gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Apna sawal likho..."
                className="rounded-full h-10"
                disabled={thinking}
              />
              <Button
                size="icon"
                onClick={send}
                disabled={thinking || !input.trim()}
                className="rounded-full h-10 w-10 shrink-0 text-white hover:opacity-90"
                style={{ background: "linear-gradient(135deg, hsl(212 90% 45%), hsl(243 75% 59%))" }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
