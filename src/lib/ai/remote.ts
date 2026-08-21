// Calls the Vercel serverless proxy (api/ai-chat.js), which holds the
// Gemini free-tier API key server-side. Never called with the key itself
// in the browser. Throws on any failure so callers can fall back to the
// fully-local model (engine.ts) — e.g. during local dev without the
// function running, or if the daily free quota is used up.
import type { ChatMessage } from "./engine";

export const chatRemote = async (messages: ChatMessage[]): Promise<string> => {
  const res = await fetch("/api/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `AI request failed (${res.status})`);
  return String(data?.reply || "").trim();
};
