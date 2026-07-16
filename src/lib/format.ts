export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
};

export const fmtINR = (n: number | string | null | undefined) => {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(v);
};

export const fmtNum = (n: number | string | null | undefined, d = 2) => {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: d, minimumFractionDigits: 0 }).format(v);
};

export const todayFY = (d = new Date()) => {
  const y = d.getFullYear();
  const m = d.getMonth();
  // April-March FY
  const start = m >= 3 ? y : y - 1;
  const end = (start + 1).toString().slice(-2);
  return `${start}-${end}`;
};

export const DOC_TYPE_CODE: Record<string, string> = {
  invoice: "INV", quotation: "QTN", proforma: "PRO",
  challan: "CHL", purchase_bill: "PB", purchase_order: "PO",
};

// "2026-27" -> "2627", kept short so doc numbers stay within the GST
// e-invoice 16-character limit (e.g. PHDINV-2627-0217).
const compactFY = (fy: string) => fy.slice(2, 4) + fy.slice(-2);

export const docNumberPrefix = (docType: string, fy: string) =>
  `PHD${DOC_TYPE_CODE[docType] || "DOC"}-${compactFY(fy)}-`;

// Read-only preview of the next number for display while a create form is
// open. Does NOT reserve/consume it, so abandoning the draft doesn't skip
// a number. The authoritative number is only assigned by reserveDocNumber.
export const peekNextDocNumber = async (supabase: any, docType: string, fy: string): Promise<string> => {
  const pfx = docNumberPrefix(docType, fy);
  const { data: ns } = await supabase.from("number_series").select("next_number").eq("doc_type", docType).eq("fy", fy).maybeSingle();
  const nextNum = ns?.next_number || 1;
  return `${pfx}${String(nextNum).padStart(4, "0")}`;
};

// Atomically reserves and returns the next document number via the
// reserve_doc_number() DB function (row-locked update), so two people
// saving a document at the same instant can never receive the same number.
export const reserveDocNumber = async (supabase: any, docType: string, fy: string): Promise<string> => {
  const pfx = docNumberPrefix(docType, fy);
  const { data, error } = await supabase.rpc("reserve_doc_number", { p_doc_type: docType, p_fy: fy, p_prefix: pfx });
  if (error) throw error;
  return data as string;
};

export const numberToWords = (num: number): string => {
  if (num === 0) return "Zero Rupees Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + inWords(n % 10000000) : "");
  };
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let s = inWords(rupees) + " Rupees";
  if (paise) s += " and " + inWords(paise) + " Paise";
  return s + " Only";
};

// GST split
export const calcLineTax = (qty: number, rate: number, discountPct: number, gstRate: number, isIgst: boolean) => {
  const gross = qty * rate;
  const discount = (gross * discountPct) / 100;
  const taxable = gross - discount;
  const tax = (taxable * gstRate) / 100;
  const cgst = isIgst ? 0 : tax / 2;
  const sgst = isIgst ? 0 : tax / 2;
  const igst = isIgst ? tax : 0;
  const total = taxable + tax;
  return {
    taxable: +taxable.toFixed(2),
    cgst: +cgst.toFixed(2),
    sgst: +sgst.toFixed(2),
    igst: +igst.toFixed(2),
    total: +total.toFixed(2),
  };
};
