import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAIAssistant, type MatchedDraft } from "@/hooks/useAIAssistant";

// Floating in-app AI assistant. Answers come from Google Gemini's free
// tier via a Vercel serverless proxy (api/ai-chat.js) — the API key
// never reaches the browser. Shared between the admin and engineer apps.
//
// onDraftReady: when the user asks it to create an invoice/purchase/etc,
// the AI never saves anything itself — it only produces a matched draft.
// Pass this to have the draft handed to your own create-document UI
// (e.g. EngineerApp opens its doc sheet prefilled). Omit it (admin) and
// the hook falls back to navigating to the admin create-document route.
export const AIAssistant = ({ onDraftReady }: { onDraftReady?: (draft: MatchedDraft) => void }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, ask, thinking } = useAIAssistant(onDraftReady);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 z-[60] h-14 w-14 rounded-full bg-foreground text-background shadow-xl shadow-black/20 flex items-center justify-center"
        title="AI Assistant"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
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
            <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2 bg-foreground text-background">
              <Sparkles className="h-4 w-4" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">AI Assistant</p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 px-4 py-3 overflow-y-auto">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Pooch sakte ho — jaise "is mahine ka sales kitna hua" ya "customer XYZ ka balance kya hai".
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
              <Button size="icon" onClick={send} disabled={thinking || !input.trim()} className="rounded-full h-10 w-10 shrink-0 bg-foreground text-background hover:bg-foreground/90">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
