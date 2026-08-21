// Calls the Vercel serverless proxy (api/ai-chat.js), which holds the
// Gemini free-tier API key server-side. Never called with the key itself
// in the browser.
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

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
