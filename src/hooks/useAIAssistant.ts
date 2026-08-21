import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { chat, type ChatMessage, type ModelProgress } from "@/lib/ai/engine";
import { fmtINR } from "@/lib/format";
import {
  getDashboardSnapshot, findParties, getPartyBalance, getCashLedgerSummary, getRecentDocuments,
} from "@/lib/ai/tools";

export type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT =
  "You are a helpful assistant built into PHD Automations' internal ERP app. " +
  "Answer briefly and only using the FACTS given to you below the user's question — never invent numbers. " +
  "If no facts are given, answer generally and helpfully in 1-3 sentences. Reply in the same language style (Hindi/English mix is fine) as the question.";

// Cheap keyword-based intent routing — small local models are unreliable at
// picking tools themselves, so retrieval is done in plain JS and the model
// is only asked to phrase the result.
const buildFacts = async (question: string, parties: any[]): Promise<string> => {
  const q = question.toLowerCase();
  const facts: string[] = [];

  const wantsBalance = /balance|baaki|udhaar|due|outstanding/.test(q);
  const matchedParty = wantsBalance
    ? parties.find(p => q.includes(String(p.name).toLowerCase()))
    : null;

  if (matchedParty) {
    const bal = await getPartyBalance(supabase, matchedParty.id, matchedParty.opening_balance || 0);
    facts.push(`${matchedParty.name}'s current balance is ${fmtINR(bal)} (positive = they owe us, negative = we owe them).`);
  } else if (wantsBalance && /party|customer|vendor|grahak/.test(q) === false) {
    // no specific party matched but question is about a party — try a fuzzy search
    const words = question.split(/\s+/).filter(w => w.length > 2);
    for (const w of words) {
      const found = await findParties(supabase, w, 3);
      if (found.length) {
        for (const p of found) {
          const bal = await getPartyBalance(supabase, p.id, p.opening_balance || 0);
          facts.push(`${p.name}'s current balance is ${fmtINR(bal)}.`);
        }
        break;
      }
    }
  }

  if (/cash/.test(q)) {
    const snap = await getDashboardSnapshot(supabase);
    const summary = await getCashLedgerSummary(supabase, 30);
    facts.push(`Current cash wallet balance is ${fmtINR(snap.cashBalance)}. In the last 30 days: credit ${fmtINR(summary.credit)}, debit ${fmtINR(summary.debit)}, across ${summary.entries} entries.`);
  }

  if (/sale|invoice|bikri|bill/.test(q) && !/purchase/.test(q)) {
    const snap = await getDashboardSnapshot(supabase);
    const recent = await getRecentDocuments(supabase, "invoice", 5);
    facts.push(`This month's total sales so far: ${fmtINR(snap.monthSales)}. Total receivable (unpaid) across all invoices: ${fmtINR(snap.receivable)}.`);
    if (recent.length) facts.push(`Most recent invoices: ${recent.map((d: any) => `${d.doc_number} (${fmtINR(d.total)}, ${d.parties?.name || "-"})`).join("; ")}.`);
  }

  if (/stock|inventory|item/.test(q)) {
    const snap = await getDashboardSnapshot(supabase);
    facts.push(`${snap.lowStock} item(s) are currently at or below their low-stock threshold.`);
  }

  if (/expense|kharch|expenditure/.test(q)) {
    const snap = await getDashboardSnapshot(supabase);
    facts.push(`Total expenses recorded this month: ${fmtINR(snap.monthExpenses)}.`);
  }

  if (facts.length === 0) {
    const snap = await getDashboardSnapshot(supabase);
    facts.push(
      `General business snapshot — Receivable: ${fmtINR(snap.receivable)}, This month's sales: ${fmtINR(snap.monthSales)}, ` +
      `This month's expenses: ${fmtINR(snap.monthExpenses)}, Cash wallet balance: ${fmtINR(snap.cashBalance)}, Low stock items: ${snap.lowStock}.`,
    );
  }

  return facts.join("\n");
};

export function useAIAssistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loadingModel, setLoadingModel] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [thinking, setThinking] = useState(false);
  const partiesRef = useRef<any[] | null>(null);

  const getParties = async () => {
    if (!partiesRef.current) {
      const { data } = await supabase.from("parties").select("id, name, opening_balance");
      partiesRef.current = data || [];
    }
    return partiesRef.current;
  };

  const ask = useCallback(async (question: string) => {
    if (!question.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: question }]);
    setThinking(true);
    try {
      const parties = await getParties();
      const facts = await buildFacts(question, parties);
      const chatMessages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${question}\n\nFACTS:\n${facts}` },
      ];
      const onProgress = (p: ModelProgress) => {
        if (p.status === "progress" && typeof p.progress === "number") {
          setLoadingModel(true);
          setModelProgress(p.progress);
        }
        if (p.status === "ready" || p.status === "done") setLoadingModel(false);
      };
      const reply = await chat(chatMessages, { onProgress });
      setLoadingModel(false);
      setMessages(prev => [...prev, { role: "assistant", content: reply || "Sorry, I couldn't generate a response." }]);
    } catch (err: any) {
      setLoadingModel(false);
      setMessages(prev => [...prev, { role: "assistant", content: `Something went wrong loading the AI model: ${err?.message || err}` }]);
    } finally {
      setThinking(false);
    }
  }, []);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, ask, clear, thinking, loadingModel, modelProgress };
}
