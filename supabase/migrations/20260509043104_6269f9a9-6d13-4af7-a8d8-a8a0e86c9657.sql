-- 1) Invoice series start at 178 for FY 2026-27
INSERT INTO public.number_series (doc_type, fy, prefix, next_number, padding)
VALUES ('invoice', '2026-27', 'PHD/INV/2026-27/', 178, 4)
ON CONFLICT (doc_type, fy) DO UPDATE SET next_number = 178, prefix = 'PHD/INV/2026-27/';

-- 2) Cascade FKs so deleting a document cleans up children
ALTER TABLE public.stock_ledger DROP CONSTRAINT IF EXISTS stock_ledger_reference_doc_fkey;
ALTER TABLE public.stock_ledger
  ADD CONSTRAINT stock_ledger_reference_doc_fkey
  FOREIGN KEY (reference_doc) REFERENCES public.documents(id) ON DELETE CASCADE;

ALTER TABLE public.document_lines DROP CONSTRAINT IF EXISTS document_lines_document_id_fkey;
ALTER TABLE public.document_lines
  ADD CONSTRAINT document_lines_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;

ALTER TABLE public.payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_document_id_fkey;
ALTER TABLE public.payment_allocations
  ADD CONSTRAINT payment_allocations_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;

-- 3) Trigger: reverse stock movements before document delete
CREATE OR REPLACE FUNCTION public.reverse_stock_on_doc_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT item_id, movement, quantity FROM public.stock_ledger WHERE reference_doc = OLD.id LOOP
    IF r.movement = 'out' THEN
      UPDATE public.items SET current_stock = current_stock + r.quantity WHERE id = r.item_id;
    ELSIF r.movement = 'in' THEN
      UPDATE public.items SET current_stock = current_stock - r.quantity WHERE id = r.item_id;
    END IF;
  END LOOP;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverse_stock_on_doc_delete ON public.documents;
CREATE TRIGGER trg_reverse_stock_on_doc_delete
BEFORE DELETE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.reverse_stock_on_doc_delete();