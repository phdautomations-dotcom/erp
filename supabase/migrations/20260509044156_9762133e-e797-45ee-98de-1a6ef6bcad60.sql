ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_party_id_fkey;
ALTER TABLE public.documents ADD CONSTRAINT documents_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_party_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.parties(id) ON DELETE CASCADE;

-- Ensure stock-reversal trigger fires before document deletion (cascade from parties)
DROP TRIGGER IF EXISTS trg_reverse_stock_on_doc_delete ON public.documents;
CREATE TRIGGER trg_reverse_stock_on_doc_delete
BEFORE DELETE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.reverse_stock_on_doc_delete();