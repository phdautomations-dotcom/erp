// Calls the Vercel serverless proxy (api/ai-chat.js), which holds the
// Gemini free-tier API key server-side. Never called with the key itself
// in the browser.
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const callAI = async (
  messages: ChatMessage[],
  opts: { json?: boolean; maxOutputTokens?: number } = {},
): Promise<string> => {
  const res = await fetch("/api/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, json: opts.json, maxOutputTokens: opts.maxOutputTokens }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `AI request failed (${res.status})`);
  return String(data?.reply || "").trim();
};

export const chatRemote = (messages: ChatMessage[]) => callAI(messages);

// Classifies free text into one of a fixed set of options — used for
// expense/cash-ledger category suggestions. Falls back to the first
// option's absence (empty string) if the model doesn't return a clean match.
export const classifyText = async (text: string, options: string[]): Promise<string> => {
  const reply = await callAI([
    { role: "system", content: `Classify the user's text into exactly one of these categories: ${options.join(", ")}. Reply with ONLY the category name, nothing else.` },
    { role: "user", content: text },
  ], { maxOutputTokens: 300 });
  const cleaned = reply.trim();
  return options.find(o => o.toLowerCase() === cleaned.toLowerCase()) || "";
};

// Expands a short/informal line item description into a clear,
// professional one line invoice/quotation description.
export const expandDescription = async (shorthand: string, context?: string): Promise<string> => {
  return callAI([
    { role: "system", content: "Rewrite the user's short/informal note into one clear, professional invoice line-item description. Keep it brief (under 12 words), no quotes, no explanation — output only the rewritten line." },
    { role: "user", content: context ? `${shorthand}\n\nContext: ${context}` : shorthand },
  ], { maxOutputTokens: 300 });
};

// Drafts a polite payment-reminder message using only the given facts.
export const draftPaymentReminder = async (facts: string): Promise<string> => {
  return callAI([
    { role: "system", content: "Draft a short, polite payment reminder message (for WhatsApp) to a customer, in Hindi-English mix if natural, using ONLY the facts given. Keep it under 60 words, no greeting boilerplate beyond a simple hello." },
    { role: "user", content: facts },
  ], { maxOutputTokens: 500 });
};

// Extracts structured invoice/purchase draft data from a free-text request
// like "invoice banao ABC Traders ke liye 5 bearing @500". Returns null if
// the model's output isn't valid JSON.
export interface DraftDocLine { description: string; quantity: number; rate: number; }
export interface DraftDoc { doc_type: "invoice" | "quotation" | "purchase_bill" | "purchase_order"; party_name: string; lines: DraftDocLine[]; notes?: string; }

export const extractDocDraft = async (request: string, knownPartyNames: string[]): Promise<DraftDoc | null> => {
  const reply = await callAI([
    {
      role: "system",
      content:
        "Extract a sales/purchase document request into strict JSON matching this shape: " +
        '{"doc_type": "invoice"|"quotation"|"purchase_bill"|"purchase_order", "party_name": string, "lines": [{"description": string, "quantity": number, "rate": number}], "notes": string|null}. ' +
        `If the party name roughly matches one of these known parties, use the EXACT known spelling: ${knownPartyNames.slice(0, 200).join(", ") || "(none known)"}. ` +
        "If rate isn't mentioned, use 0. If quantity isn't mentioned, use 1. Output ONLY the JSON, no explanation.",
    },
    { role: "user", content: request },
  ], { json: true, maxOutputTokens: 2000 });

  try {
    const parsed = JSON.parse(reply);
    if (!parsed?.party_name || !Array.isArray(parsed?.lines)) return null;
    return parsed as DraftDoc;
  } catch {
    return null;
  }
};
