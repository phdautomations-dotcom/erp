import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// @ts-ignore - bwip-js browser bundle
import bwipjs from "bwip-js/browser";
import { numberToWords, fmtDate } from "./format";
import logoUrl from "@/assets/logo.png";
import logoWhiteUrl from "@/assets/logo-white.png";
import logoPdfHeaderUrl from "@/assets/logo-pdf-header.png";
import signatureUrl from "@/assets/signature.png";

const _logoCache: Record<string, string | null> = {};
const loadLogo = async (src: string): Promise<string | null> => {
  if (src in _logoCache) return _logoCache[src];
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onloadend = () => {
        _logoCache[src] = fr.result as string;
        resolve(_logoCache[src]);
      };
      fr.onerror = () => {
        _logoCache[src] = null;
        resolve(null);
      };
      fr.readAsDataURL(blob);
    });
  } catch {
    _logoCache[src] = null;
    return null;
  }
};

// jsPDF helvetica doesn't support ₹ glyph. Use "Rs." prefix + Indian grouping.
const fmtRs = (n: number | string | null | undefined) => {
  const v = Number(n || 0);
  const s = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  return `Rs. ${s}`;
};
const fmtNum = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));

interface Line {
  description: string; hsn_code?: string; quantity: number; unit?: string;
  rate: number; discount_pct: number; gst_rate: number;
  taxable: number; cgst: number; sgst: number; igst: number; total: number;
}
interface Doc {
  id?: string; doc_type: string; doc_number: string; doc_date: string; due_date?: string;
  is_igst: boolean; subtotal: number; discount: number; cgst: number; sgst: number; igst: number;
  round_off: number; total: number; paid?: number; notes?: string; terms?: string;
  po_number?: string; po_date?: string;
}
interface Party {
  name: string; gstin?: string; billing_address?: string; shipping_address?: string;
  city?: string; state?: string; state_code?: string; pincode?: string; phone?: string; email?: string;
}
export interface Settings {
  name: string; gstin?: string; pan?: string;
  address_line1?: string; address_line2?: string; city?: string; state?: string; state_code?: string; pincode?: string;
  phone?: string; email?: string; website?: string;
  bank_name?: string; bank_account?: string; bank_ifsc?: string; bank_branch?: string; upi_id?: string;
  terms?: string;
}

const titleFor = (t: string) => ({
  invoice: "TAX INVOICE", quotation: "QUOTATION", proforma: "PROFORMA INVOICE",
  challan: "DELIVERY CHALLAN", purchase_order: "PURCHASE ORDER", purchase_bill: "PURCHASE BILL",
} as Record<string, string>)[t] || t.toUpperCase();

const whiteLogoDocTypes = new Set(["invoice", "quotation", "proforma", "challan"]);

export const addPdfBranding = async (pdf: jsPDF, title: string, s: Settings, overrideLogoSrc?: string): Promise<number> => {
  const W = pdf.internal.pageSize.getWidth();
  
  // Header band
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, W, 28, "F");

  // Logo (top-left, on dark band)
  const logoData = await loadLogo(overrideLogoSrc || logoPdfHeaderUrl);
  if (logoData) {
    try { pdf.addImage(logoData, "PNG", 10, 4.5, 62, 11.3); } catch {}
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
  const addr = [s.address_line1, s.address_line2, [s.city, s.state, s.pincode].filter(Boolean).join(", ")].filter(Boolean).join(" | ");
  const headerAddr = addr ? pdf.splitTextToSize(addr, 100) : [];
  if (headerAddr.length) pdf.text(headerAddr, 10, 18.5);
  const headerContact = [s.phone, s.email].filter(Boolean).join("  |  ");
  if (headerContact) pdf.text(pdf.splitTextToSize(headerContact, 100), 10, 24.5);

  pdf.setFont("helvetica", "normal"); pdf.setFontSize(14);
  pdf.text(title, W - 12, 12, { align: "right" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
  if (s.gstin) pdf.text(`GSTIN: ${s.gstin}`, W - 12, 17, { align: "right" });
  if (s.pan) pdf.text(`PAN: ${s.pan}`, W - 12, 21, { align: "right" });

  pdf.setTextColor(15, 23, 42);
  return 34; // Y position to start the rest of the document
};

export const generateDocPDF = async (doc: Doc, lines: Line[], party: Party, s: Settings) => {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const logoSrc = whiteLogoDocTypes.has(doc.doc_type) ? logoPdfHeaderUrl : logoUrl;
  let y = await addPdfBranding(pdf, titleFor(doc.doc_type), s, logoSrc);

  // Doc meta + Bill to
  const leftX = 12;
  const leftWidth = W / 2 - 18;
  const rightX = W / 2 + 4;
  const rightWidth = W / 2 - 16;
  const lineGap = 4.6;
  const partyNameLines = pdf.splitTextToSize(party.name || "", leftWidth);
  const partyAddr = pdf.splitTextToSize(
    [party.billing_address, [party.city, party.state, party.pincode].filter(Boolean).join(", ")].filter(Boolean).join("\n"),
    leftWidth
  );
  const leftRows = [
    { label: "BILL TO", lines: [""], size: 8, weight: "normal" as const, gap: 0 },
    { label: "", lines: partyNameLines.length ? partyNameLines : ["-"], size: 10, weight: "normal" as const, gap: 1 },
    { label: "", lines: partyAddr.length ? partyAddr : ["-"], size: 8, weight: "normal" as const, gap: 1.5 },
    ...(party.gstin ? [{ label: "", lines: [`GSTIN: ${party.gstin}`], size: 8, weight: "normal" as const, gap: 1.5 }] : []),
    ...(party.phone ? [{ label: "", lines: [`Ph: ${party.phone}`], size: 8, weight: "normal" as const, gap: 1.5 }] : []),
  ];
  const leftHeight = leftRows.reduce((sum, row) => sum + row.lines.length * lineGap + row.gap, 0) + 5;

  const docNumberLines = pdf.splitTextToSize(doc.doc_number || "-", rightWidth - 2);
  const dateLines = pdf.splitTextToSize(fmtDate(doc.doc_date) || "-", 30);
  const dueDateLines = doc.due_date ? pdf.splitTextToSize(fmtDate(doc.due_date), 30) : [];
  const poNumberLines = doc.po_number ? pdf.splitTextToSize(doc.po_number, 45) : [];
  const poDateLines = doc.po_date ? pdf.splitTextToSize(fmtDate(doc.po_date), 30) : [];
  const placeSupplyLines = pdf.splitTextToSize(`${party.state || "-"} (${party.state_code || "-"})`, rightWidth - 2);
  
  let rightHeight = 28 + Math.max(0, docNumberLines.length - 1) * lineGap + Math.max(0, placeSupplyLines.length - 1) * lineGap + Math.max(0, dueDateLines.length - 1) * lineGap;
  if (doc.po_number || doc.po_date) {
    rightHeight += 9 + Math.max(0, Math.max(poNumberLines.length, poDateLines.length) - 1) * lineGap;
  }
  const metaHeight = Math.max(34, leftHeight, rightHeight);

  pdf.setDrawColor(220);
  pdf.setLineWidth(0.2);
  pdf.rect(10, y, W - 20, metaHeight);
  pdf.line(W / 2, y, W / 2, y + metaHeight);

  let leftY = y + 5;
  leftRows.forEach((row) => {
    pdf.setFont("helvetica", row.weight);
    pdf.setFontSize(row.size);
    if (row.label) pdf.text(row.label, leftX, leftY);
    if (row.lines.length && row.lines[0]) pdf.text(row.lines, leftX, leftY + (row.label ? lineGap : 0));
    leftY += (row.label ? lineGap : 0) + row.lines.length * lineGap + row.gap;
  });

  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
  let ry = y + 5;
  pdf.text("Document #", rightX, ry);
  pdf.text(docNumberLines, rightX, ry + 4);
  ry += 9 + Math.max(0, docNumberLines.length - 1) * lineGap;
  
  pdf.text("Date", rightX, ry);
  if (doc.due_date) pdf.text("Due Date", rightX + 50, ry);
  pdf.text(dateLines, rightX, ry + 4);
  if (doc.due_date) pdf.text(dueDateLines, rightX + 50, ry + 4);
  ry += 9 + Math.max(0, dueDateLines.length - 1) * lineGap;

  if (doc.po_number || doc.po_date) {
    if (doc.po_number) pdf.text("PO Number", rightX, ry);
    if (doc.po_date) pdf.text("PO Date", rightX + 50, ry);
    if (doc.po_number) pdf.text(poNumberLines, rightX, ry + 4);
    if (doc.po_date) pdf.text(poDateLines, rightX + 50, ry + 4);
    ry += 9 + Math.max(0, Math.max(poNumberLines.length, poDateLines.length) - 1) * lineGap;
  }

  pdf.text("Place of Supply", rightX, ry);
  pdf.text(placeSupplyLines, rightX, ry + 4);

  y += metaHeight + 6;

  // ===== Lines table =====
  // Total usable width: 190 mm (10..200)
  const head = doc.is_igst
    ? [["#", "Description", "HSN", "Qty", "Rate", "Disc%", "GST%", "Taxable", "IGST", "Total"]]
    : [["#", "Description", "HSN", "Qty", "Rate", "Disc%", "GST%", "Taxable", "CGST", "SGST", "Total"]];

  const body = lines.map((l, i) => {
    const base = [
      String(i + 1),
      l.description || "",
      l.hsn_code || "-",
      `${Number.isInteger(Number(l.quantity)) ? String(Number(l.quantity)) : Number(l.quantity).toString()}`,
      fmtNum(l.rate),
      `${l.discount_pct}%`,
      `${l.gst_rate}%`,
      fmtNum(l.taxable),
    ];
    if (doc.is_igst) base.push(fmtNum(l.igst));
    else { base.push(fmtNum(l.cgst)); base.push(fmtNum(l.sgst)); }
    base.push(fmtNum(l.total));
    return base;
  });

  const colsIgst = {
    0: { cellWidth: 8, halign: "center" as const },
    1: { cellWidth: 56 },
    2: { cellWidth: 16, halign: "center" as const },
    3: { cellWidth: 16, halign: "right" as const },
    4: { cellWidth: 20, halign: "right" as const },
    5: { cellWidth: 13, halign: "right" as const },
    6: { cellWidth: 13, halign: "right" as const },
    7: { cellWidth: 20, halign: "right" as const },
    8: { cellWidth: 14, halign: "right" as const },
    9: { cellWidth: 14, halign: "right" as const },
  };
  const colsCgst = {
    0: { cellWidth: 8, halign: "center" as const },
    1: { cellWidth: 46 },
    2: { cellWidth: 14, halign: "center" as const },
    3: { cellWidth: 14, halign: "right" as const },
    4: { cellWidth: 18, halign: "right" as const },
    5: { cellWidth: 12, halign: "right" as const },
    6: { cellWidth: 12, halign: "right" as const },
    7: { cellWidth: 18, halign: "right" as const },
    8: { cellWidth: 16, halign: "right" as const },
    9: { cellWidth: 16, halign: "right" as const },
    10: { cellWidth: 16, halign: "right" as const },
  };

  autoTable(pdf, {
    startY: y,
    head, body,
    styles: { fontSize: 9, cellPadding: 1.8, valign: "middle", overflow: "linebreak" },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "normal", halign: "center", fontSize: 9 },
    bodyStyles: { textColor: [30, 30, 40] },
    columnStyles: doc.is_igst ? colsIgst : colsCgst,
    margin: { left: 10, right: 10 },
    theme: "grid",
  });

  let cy = (pdf as any).lastAutoTable.finalY + 4;

  // Totals box (right side)
  const boxW = 80;
  const boxX = W - 10 - boxW;
  const rows: [string, string][] = [
    ["Subtotal", fmtRs(doc.subtotal)],
    ...(Number(doc.discount) ? [["Discount", `- ${fmtRs(doc.discount)}`] as [string, string]] : []),
    ...(doc.is_igst
      ? [["IGST", fmtRs(doc.igst)] as [string, string]]
      : [["CGST", fmtRs(doc.cgst)] as [string, string], ["SGST", fmtRs(doc.sgst)] as [string, string]]),
    ...(Number(doc.round_off) ? [["Round Off", fmtRs(doc.round_off)] as [string, string]] : []),
  ];

  if (cy + rows.length * 6 + 12 > H - 30) { pdf.addPage(); cy = 12; }

  pdf.setDrawColor(220);
  pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
  const rowH = 7;
  rows.forEach((r, i) => {
    if (i > 0) pdf.line(boxX, cy + i * rowH, boxX + boxW, cy + i * rowH);
    pdf.text(r[0], boxX + 3, cy + i * rowH + 4.8);
    pdf.text(r[1], boxX + boxW - 3, cy + i * rowH + 4.8, { align: "right" });
  });
  const totalsH = rows.length * rowH;
  pdf.rect(boxX, cy, boxW, totalsH);
  cy += totalsH;

  // Grand total bar
  pdf.setFillColor(15, 23, 42);
  pdf.rect(boxX, cy, boxW, 11, "F");
  pdf.setTextColor(255); pdf.setFont("helvetica", "normal"); pdf.setFontSize(11);
  pdf.text("GRAND TOTAL", boxX + 3, cy + 7.2);
  pdf.text(fmtRs(doc.total), boxX + boxW - 3, cy + 7.2, { align: "right" });
  pdf.setTextColor(15, 23, 42); pdf.setFont("helvetica", "normal");

  // Amount in words (left side, aligned with totals box top)
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Amount in words:", 12, cy - totalsH + 5);
  pdf.setFont("helvetica", "normal");
  const words = pdf.splitTextToSize(numberToWords(Number(doc.total)), boxX - 16);
  pdf.text(words, 12, cy - totalsH + 10);

  cy += 14;

  // Add QR Code dynamically
  if (doc.id) {
    try {
      const verifyUrl = `${window.location.origin}/verify/${doc.id}`;
      const canvas = document.createElement("canvas");
      bwipjs.toCanvas(canvas, {
        bcid: "qrcode",
        text: verifyUrl,
        scale: 3
      });
      const qrDataUrl = canvas.toDataURL("image/png");
      pdf.addImage(qrDataUrl, "PNG", 12, H - 38, 20, 20);
      pdf.setFontSize(7);
      pdf.text("Scan to Verify", 22, H - 15, { align: "center" });
    } catch {}
  }

  // HSN summary
  if (cy > H - 60) { pdf.addPage(); cy = 12; }
  const hsnMap: Record<string, { taxable: number; cgst: number; sgst: number; igst: number; rate: number }> = {};
  lines.forEach(l => {
    const k = `${l.hsn_code || "-"}|${l.gst_rate}`;
    if (!hsnMap[k]) hsnMap[k] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, rate: l.gst_rate };
    hsnMap[k].taxable += l.taxable; hsnMap[k].cgst += l.cgst; hsnMap[k].sgst += l.sgst; hsnMap[k].igst += l.igst;
  });
  const hsnHead = doc.is_igst
    ? [["HSN/SAC", "Rate", "Taxable", "IGST"]]
    : [["HSN/SAC", "Rate", "Taxable", "CGST", "SGST"]];
  const hsnBody = Object.entries(hsnMap).map(([k, v]) => {
    const [hsn] = k.split("|");
    return doc.is_igst
      ? [hsn, `${v.rate}%`, fmtNum(v.taxable), fmtNum(v.igst)]
      : [hsn, `${v.rate}%`, fmtNum(v.taxable), fmtNum(v.cgst), fmtNum(v.sgst)];
  });
  autoTable(pdf, {
    startY: cy, head: hsnHead, body: hsnBody,
    styles: { fontSize: 9, cellPadding: 1.8 },
    headStyles: { fillColor: [240, 240, 245], textColor: 15, fontStyle: "normal", halign: "center", fontSize: 9 },
    columnStyles: doc.is_igst ? {
      0: { cellWidth: 28, halign: "center" }, 1: { cellWidth: 18, halign: "right" },
      2: { cellWidth: 32, halign: "right" }, 3: { cellWidth: 28, halign: "right" },
    } : {
      0: { cellWidth: 28, halign: "center" }, 1: { cellWidth: 18, halign: "right" },
      2: { cellWidth: 30, halign: "right" }, 3: { cellWidth: 24, halign: "right" }, 4: { cellWidth: 24, halign: "right" },
    },
    margin: { left: 10, right: 10 },
    theme: "grid",
    tableWidth: "wrap",
  });
  cy = (pdf as any).lastAutoTable.finalY + 6;

  // Bank + Terms
  if (cy > H - 60) { pdf.addPage(); cy = 12; }
  const colW = (W - 24) / 2;
  pdf.setFontSize(11); pdf.setFont("helvetica", "normal");
  pdf.text("Bank Details", 12, cy);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
  const bank = [
    s.bank_name && `Bank: ${s.bank_name}`,
    s.bank_account && `A/c No: ${s.bank_account}`,
    s.bank_ifsc && `IFSC: ${s.bank_ifsc}`,
    s.bank_branch && `Branch: ${s.bank_branch}`,
    s.upi_id && `UPI: ${s.upi_id}`,
  ].filter(Boolean) as string[];
  bank.forEach((b, i) => pdf.text(b, 12, cy + 6 + i * 5));

  pdf.setFont("helvetica", "normal"); pdf.setFontSize(11);
  pdf.text("Terms & Conditions", 12 + colW, cy);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
  const terms = pdf.splitTextToSize(doc.terms || s.terms || "1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged on overdue bills.\n3. Subject to local jurisdiction.", colW - 4);
  pdf.text(terms, 12 + colW, cy + 6);

  // Footer signature with signature image
  const sigData = await loadLogo(signatureUrl);
  pdf.setFontSize(9);
  pdf.text(`For ${s.name || "PHD AUTOMATIONS"}`, W - 12, H - 30, { align: "right" });
  if (sigData) {
    try { pdf.addImage(sigData, "PNG", W - 52, H - 28, 40, 14); } catch {}
  }
  pdf.text("Authorised Signatory", W - 12, H - 10, { align: "right" });

  pdf.save(`${doc.doc_number.replace(/\//g, "_")}.pdf`);
};

export const generateReceiptPDF = async (p: any, party: Party, s: Settings) => {
  const pdf = new jsPDF();
  const W = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(15, 23, 42); pdf.rect(0, 0, W, 24, "F");
  const logoData = await loadLogo(logoUrl);
  if (logoData) { try { pdf.addImage(logoData, "PNG", 10, 5, 44, 8); } catch {} }
  pdf.setTextColor(255); pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11); pdf.text(p.direction === "received" ? "PAYMENT RECEIPT" : "PAYMENT VOUCHER", W - 12, 14, { align: "right" });
  pdf.setTextColor(15, 23, 42);
  let y = 36;
  pdf.setFontSize(10);
  pdf.text(`Receipt No: ${p.payment_number}`, 12, y);
  pdf.text(`Date: ${fmtDate(p.payment_date)}`, W - 12, y, { align: "right" }); y += 8;
  pdf.text(`${p.direction === "received" ? "Received from" : "Paid to"}: ${party.name}`, 12, y); y += 6;
  if (party.gstin) { pdf.text(`GSTIN: ${party.gstin}`, 12, y); y += 6; }
  pdf.text(`Mode: ${p.mode}`, 12, y);
  if (p.reference) pdf.text(`Ref: ${p.reference}`, W / 2, y);
  y += 10;
  pdf.setFontSize(14); pdf.setFont("helvetica", "normal");
  pdf.text(`Amount: ${fmtRs(p.amount)}`, 12, y); y += 6;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
  pdf.text(numberToWords(Number(p.amount)), 12, y); y += 12;
  if (p.notes) pdf.text(`Notes: ${p.notes}`, 12, y);
  const sigData = await loadLogo(signatureUrl);
  pdf.text(`For ${s.name}`, W - 12, 258, { align: "right" });
  if (sigData) { try { pdf.addImage(sigData, "PNG", W - 52, 260, 40, 14); } catch {} }
  pdf.text("Authorised Signatory", W - 12, 280, { align: "right" });
  pdf.save(`Receipt_${p.payment_number.replace(/\//g, "_")}.pdf`);
};
