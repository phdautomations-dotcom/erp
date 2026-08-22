import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { chatRemote, extractDocDraft } from "@/lib/ai/remote";
import { fmtINR, calcLineTax } from "@/lib/format";
import {
  getDashboardSnapshot, findParties, getPartyBalance, getCashLedgerSummary, getRecentDocuments,
} from "@/lib/ai/tools";

export type Msg = { role: "user" | "assistant"; content: string };

export interface MatchedDraftLine {
  item_id?: string; description: string; hsn_code?: string; quantity: number;
  unit?: string; rate: number; discount_pct: number; gst_rate: number;
  taxable: number; cgst: number; sgst: number; igst: number; total: number;
}
export interface MatchedDraft {
  doc_type: string; party_id: string; party_name: string; notes?: string;
  lines: MatchedDraftLine[];
}

// "invoice banao ABC ke liye 5 bearing @500" — plain-JS intent check, kept
// separate from buildFacts() so a Q&A question never gets misrouted here.
const wantsCreateDoc = (q: string) =>
  /\b(banao|bana\s*do|banado|bnado|create|generate)\b/.test(q) &&
  /\b(invoice|bill|quotation|quote|purchase|proforma|challan)\b/.test(q);

const SYSTEM_PROMPT =
  "You are a helpful assistant built into PHD Automations' internal ERP app. " +
  "Answer briefly and only using the FACTS given to you below the user's question — never invent numbers. " +
  "If no facts are given, answer generally and helpfully in 1-3 sentences. Reply in the same language style (Hindi/English mix is fine) as the question.";

// Cheap keyword-based intent routing — the model is unreliable at picking
// tools itself, so retrieval is done in plain JS and the model is only
// asked to phrase the result.
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

// doc_type -> which admin route section it lives under
const ROUTE_SECTION: Record<string, string> = {
  invoice: "sales", quotation: "sales", proforma: "sales", challan: "sales",
  purchase_bill: "purchases", purchase_order: "purchases",
};

export function useAIAssistant(onDraftReady?: (draft: MatchedDraft) => void) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const partiesRef = useRef<any[] | null>(null);
  const itemsRef = useRef<any[] | null>(null);
  const navigate = useNavigate();

  const getParties = async () => {
    if (!partiesRef.current) {
      const { data } = await supabase.from("parties").select("id, name, opening_balance");
      partiesRef.current = data || [];
    }
    return partiesRef.current;
  };

  const getItems = async () => {
    if (!itemsRef.current) {
      const { data } = await supabase.from("items").select("id, name, hsn_code, sale_price, gst_rate, unit");
      itemsRef.current = data || [];
    }
    return itemsRef.current;
  };

  // "AI banata hai" — but it never saves anything itself. It only produces
  // a draft that pre-fills the real create-document form (admin: navigates
  // there; engineer: hands off via onDraftReady since it's the same page),
  // so numbering/validation/review all still go through the existing,
  // already-hardened save path — see [[project_erp_features]] doc numbering.
  const createDocDraft = async (question: string): Promise<string> => {
    const [parties, items] = await Promise.all([getParties(), getItems()]);
    const draft = await extractDocDraft(question, parties.map((p: any) => p.name));
    if (!draft) return "Samajh nahi paya. Try: \"invoice banao ABC Traders ke liye 5 bearing @500 rate\".";

    const partyNameLc = draft.party_name.toLowerCase();
    const party = parties.find((p: any) => p.name.toLowerCase() === partyNameLc)
      || parties.find((p: any) => p.name.toLowerCase().includes(partyNameLc) || partyNameLc.includes(p.name.toLowerCase()));
    if (!party) return `"${draft.party_name}" naam ka party nahi mila. Pehle Parties mein add karo, ya sahi naam bata do.`;

    const lines: MatchedDraftLine[] = draft.lines.map((l) => {
      const descLc = l.description.toLowerCase();
      const item = items.find((it: any) => it.name.toLowerCase() === descLc)
        || items.find((it: any) => it.name.toLowerCase().includes(descLc) || descLc.includes(it.name.toLowerCase()));
      const quantity = l.quantity || 1;
      const rate = l.rate || Number(item?.sale_price || 0);
      const gst_rate = Number(item?.gst_rate ?? 18);
      const taxes = calcLineTax(quantity, rate, 0, gst_rate, false);
      return {
        item_id: item?.id, description: item?.name || l.description, hsn_code: item?.hsn_code || "",
        quantity, unit: item?.unit || "Nos", rate, discount_pct: 0, gst_rate, ...taxes,
      };
    });

    const matched: MatchedDraft = { doc_type: draft.doc_type, party_id: party.id, party_name: party.name, notes: draft.notes, lines };

    if (onDraftReady) {
      onDraftReady(matched);
    } else {
      sessionStorage.setItem("ai_doc_draft", JSON.stringify(matched));
      navigate(`/admin/${ROUTE_SECTION[draft.doc_type] || "sales"}/new?type=${draft.doc_type}`);
    }
    return `Draft ready — ${party.name} ke liye ${draft.doc_type.replace("_", " ")} form khul raha hai (${lines.length} line item). Review karke Save karna.`;
  };

  const ask = useCallback(async (question: string) => {
    if (!question.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: question }]);
    setThinking(true);
    try {
      if (wantsCreateDoc(question.toLowerCase())) {
        const reply = await createDocDraft(question);
        setMessages(prev => [...prev, { role: "assistant", content: reply }]);
        return;
      }
      const parties = await getParties();
      const facts = await buildFacts(question, parties);
      const reply = await chatRemote([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${question}\n\nFACTS:\n${facts}` },
      ]);
      setMessages(prev => [...prev, { role: "assistant", content: reply || "Sorry, I couldn't generate a response." }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `AI request failed: ${err?.message || err}` }]);
    } finally {
      setThinking(false);
    }
  }, []);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, ask, clear, thinking };
}
