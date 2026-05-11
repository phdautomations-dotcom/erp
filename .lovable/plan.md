## Plan — 7 fixes for ERP

### 1. Signature image
- Copy uploaded signature → process to transparent PNG (remove white bg, crop) → save as `src/assets/signature.png`.
- In `src/lib/pdf.ts`: load it like the logo and embed above "Authorised Signatory" line on every doc (invoice / quotation / proforma / challan / receipt). Size ~32x14mm.

### 2. Date format DD/MM/YYYY in PDFs
- Add helper `fmtDate(iso)` → `dd/mm/yyyy`.
- Apply in `src/lib/pdf.ts` for `doc_date`, `due_date`, payment receipt date.
- ISO date stays in DB and forms (HTML date inputs require ISO); only the rendered PDF changes.

### 3. Invoice numbering starts at 178
- Migration: `UPDATE public.number_series SET next_number = 178 WHERE doc_type='invoice' AND fy='2026-27';` (insert row first if missing, with prefix `PHD/INV/2026-27/`).
- Padding stays 4 → next number renders as `PHD/INV/2026-27/0178`.

### 4. Delete docs without FK error + auto stock reversal
Root cause: `stock_ledger.reference_doc` has FK to `documents.id` without cascade, and stock isn't reversed on delete.

Migration:
- Drop & re-add `stock_ledger_reference_doc_fkey` with `ON DELETE CASCADE`.
- Create trigger `before delete on documents`:
  - For each `stock_ledger` row of this doc, reverse `items.current_stock` (add back if movement was `out`, subtract if `in`).
  - Then delete proceeds; cascade removes ledger rows.
- Also covers `document_lines` (already deletable; ensure FK cascade if not present).
- Same delete protection for `payment_allocations` referencing the doc → cascade or block with clear message.

Result: admin Delete button on Sales/Purchases/Parties works; stock auto-adjusts.

### 5. Quantity always shows "11" bug
Cause: controlled `<Input type="number" value={l.quantity}>` defaults to `1`; when user types `1` it appends → `11`. Same on rate/discount inputs.

Fix in `src/pages/admin/DocForm.tsx`:
- Default new line `quantity` to empty (store as string in local state or `0`), and use `onFocus={e=>e.target.select()}` on numeric inputs so typing replaces the value.
- Also ensure `quantity` in PDF prints with unit on a separate sub-line if width is tight (helps the "11" visual issue if it was wrapping).

### 6. (skipped — user numbered list jumps from 5 to 7)

### 7. PDF readability — bump font sizes
In `src/lib/pdf.ts`:
- Terms & Conditions body: 7.5 → 10.
- Bank details, HSN summary, table body, header address: bump to 9–10.
- Adjust column widths / row paddings so nothing overflows after the size increase. Re-run a sample PDF and visually QA.

---

### Files touched
- `src/assets/signature.png` (new)
- `src/lib/pdf.ts` (signature, date format, font sizes)
- `src/lib/format.ts` (fmtDate helper)
- `src/pages/admin/DocForm.tsx` (qty input UX)
- New migration: invoice series=178, FK cascade, delete trigger for stock reversal

### QA
- Generate sample invoice/quotation PDF, inspect page image: signature visible, dates DD/MM/YYYY, terms readable, no overflow.
- Delete a test invoice that had stock movement → verify stock added back and no FK error.
- Create new invoice → number = `PHD/INV/2026-27/0178`.
