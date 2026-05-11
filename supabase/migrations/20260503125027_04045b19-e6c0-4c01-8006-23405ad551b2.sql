
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'accountant', 'staff', 'viewer');
CREATE TYPE public.party_type AS ENUM ('customer', 'vendor', 'both');
CREATE TYPE public.item_type AS ENUM ('service', 'product');
CREATE TYPE public.doc_type AS ENUM ('quotation', 'proforma', 'invoice', 'challan', 'purchase_order', 'purchase_bill');
CREATE TYPE public.doc_status AS ENUM ('draft', 'sent', 'partial', 'paid', 'cancelled');
CREATE TYPE public.payment_direction AS ENUM ('received', 'made');
CREATE TYPE public.payment_mode AS ENUM ('cash', 'upi', 'bank_transfer', 'cheque', 'card');
CREATE TYPE public.stock_movement AS ENUM ('in', 'out', 'adjust');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

-- can read business data: any authenticated role
CREATE OR REPLACE FUNCTION public.can_read_biz(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

-- can write business data: admin/accountant/staff
CREATE OR REPLACE FUNCTION public.can_write_biz(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','accountant','staff'))
$$;

-- ============ AUTO PROFILE + FIRST ADMIN ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), NEW.raw_user_meta_data->>'phone');

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ COMPANY SETTINGS ============
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'PHD AUTOMATIONS',
  gstin TEXT,
  pan TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  state_code TEXT,
  pincode TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_ifsc TEXT,
  bank_branch TEXT,
  upi_id TEXT,
  logo_url TEXT,
  signature_url TEXT,
  terms TEXT DEFAULT 'Goods once sold will not be taken back. Interest @ 18% p.a. will be charged if payment is not made within 15 days.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.company_settings (name) VALUES ('PHD AUTOMATIONS');

-- ============ PARTIES ============
CREATE TABLE public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type party_type NOT NULL DEFAULT 'customer',
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  pan TEXT,
  billing_address TEXT,
  shipping_address TEXT,
  city TEXT,
  state TEXT,
  state_code TEXT,
  pincode TEXT,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit_limit NUMERIC(14,2),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_parties_name ON public.parties(name);
CREATE INDEX idx_parties_gstin ON public.parties(gstin);

-- ============ ITEMS ============
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type item_type NOT NULL DEFAULT 'product',
  name TEXT NOT NULL,
  description TEXT,
  hsn_code TEXT,
  barcode TEXT UNIQUE,
  unit TEXT NOT NULL DEFAULT 'Nos',
  sale_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  purchase_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18,
  opening_stock NUMERIC(14,3) NOT NULL DEFAULT 0,
  current_stock NUMERIC(14,3) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(14,3) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_items_name ON public.items(name);
CREATE INDEX idx_items_hsn ON public.items(hsn_code);

-- ============ NUMBER SERIES ============
CREATE TABLE public.number_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type doc_type NOT NULL,
  fy TEXT NOT NULL, -- e.g. '2026-27'
  prefix TEXT NOT NULL,
  next_number INT NOT NULL DEFAULT 1,
  padding INT NOT NULL DEFAULT 4,
  UNIQUE (doc_type, fy)
);
ALTER TABLE public.number_series ENABLE ROW LEVEL SECURITY;

-- function to get next number atomically
CREATE OR REPLACE FUNCTION public.next_doc_number(_doc_type doc_type, _fy TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec RECORD;
  default_prefix TEXT;
BEGIN
  default_prefix := CASE _doc_type
    WHEN 'invoice' THEN 'PHD/INV/'
    WHEN 'quotation' THEN 'PHD/QTN/'
    WHEN 'proforma' THEN 'PHD/PRO/'
    WHEN 'challan' THEN 'PHD/DC/'
    WHEN 'purchase_order' THEN 'PHD/PO/'
    WHEN 'purchase_bill' THEN 'PHD/PB/'
  END;

  INSERT INTO public.number_series (doc_type, fy, prefix)
  VALUES (_doc_type, _fy, default_prefix || _fy || '/')
  ON CONFLICT (doc_type, fy) DO NOTHING;

  UPDATE public.number_series
  SET next_number = next_number + 1
  WHERE doc_type = _doc_type AND fy = _fy
  RETURNING * INTO rec;

  RETURN rec.prefix || lpad((rec.next_number - 1)::TEXT, rec.padding, '0');
END;
$$;

-- ============ DOCUMENTS ============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type doc_type NOT NULL,
  doc_number TEXT NOT NULL,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
  status doc_status NOT NULL DEFAULT 'draft',
  is_igst BOOLEAN NOT NULL DEFAULT false,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst NUMERIC(14,2) NOT NULL DEFAULT 0,
  round_off NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  linked_doc_id UUID REFERENCES public.documents(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doc_type, doc_number)
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_docs_party ON public.documents(party_id);
CREATE INDEX idx_docs_date ON public.documents(doc_date);

-- ============ DOCUMENT LINES ============
CREATE TABLE public.document_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id),
  description TEXT NOT NULL,
  hsn_code TEXT,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 1,
  unit TEXT,
  rate NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18,
  taxable NUMERIC(14,2) NOT NULL DEFAULT 0,
  cgst NUMERIC(14,2) NOT NULL DEFAULT 0,
  sgst NUMERIC(14,2) NOT NULL DEFAULT 0,
  igst NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  position INT NOT NULL DEFAULT 0
);
ALTER TABLE public.document_lines ENABLE ROW LEVEL SECURITY;

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction payment_direction NOT NULL,
  payment_number TEXT NOT NULL UNIQUE,
  party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14,2) NOT NULL,
  mode payment_mode NOT NULL DEFAULT 'bank_transfer',
  reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL
);
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

-- ============ STOCK LEDGER ============
CREATE TABLE public.stock_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  movement stock_movement NOT NULL,
  quantity NUMERIC(14,3) NOT NULL,
  reference_doc UUID REFERENCES public.documents(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;

-- ============ EXPENSES ============
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL,
  mode payment_mode NOT NULL DEFAULT 'cash',
  reference TEXT,
  attachment_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- ============ TIMESTAMP TRIGGERS ============
CREATE TRIGGER set_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_company_settings_updated BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_parties_updated BEFORE UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_items_updated BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- company_settings
CREATE POLICY "Biz read settings" ON public.company_settings FOR SELECT USING (public.can_read_biz(auth.uid()));
CREATE POLICY "Admin update settings" ON public.company_settings FOR UPDATE USING (public.has_any_role(auth.uid(), ARRAY['admin','accountant']::app_role[]));
CREATE POLICY "Admin insert settings" ON public.company_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));

-- parties
CREATE POLICY "Biz read parties" ON public.parties FOR SELECT USING (public.can_read_biz(auth.uid()));
CREATE POLICY "Biz write parties" ON public.parties FOR INSERT WITH CHECK (public.can_write_biz(auth.uid()));
CREATE POLICY "Biz update parties" ON public.parties FOR UPDATE USING (public.can_write_biz(auth.uid()));
CREATE POLICY "Admin delete parties" ON public.parties FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- items
CREATE POLICY "Biz read items" ON public.items FOR SELECT USING (public.can_read_biz(auth.uid()));
CREATE POLICY "Biz write items" ON public.items FOR INSERT WITH CHECK (public.can_write_biz(auth.uid()));
CREATE POLICY "Biz update items" ON public.items FOR UPDATE USING (public.can_write_biz(auth.uid()));
CREATE POLICY "Admin delete items" ON public.items FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- number_series
CREATE POLICY "Biz read series" ON public.number_series FOR SELECT USING (public.can_read_biz(auth.uid()));
CREATE POLICY "Biz write series" ON public.number_series FOR ALL USING (public.can_write_biz(auth.uid())) WITH CHECK (public.can_write_biz(auth.uid()));

-- documents
CREATE POLICY "Biz read docs" ON public.documents FOR SELECT USING (public.can_read_biz(auth.uid()));
CREATE POLICY "Biz write docs" ON public.documents FOR INSERT WITH CHECK (public.can_write_biz(auth.uid()));
CREATE POLICY "Biz update docs" ON public.documents FOR UPDATE USING (public.can_write_biz(auth.uid()));
CREATE POLICY "Admin delete docs" ON public.documents FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- document_lines
CREATE POLICY "Biz read lines" ON public.document_lines FOR SELECT USING (public.can_read_biz(auth.uid()));
CREATE POLICY "Biz write lines" ON public.document_lines FOR ALL USING (public.can_write_biz(auth.uid())) WITH CHECK (public.can_write_biz(auth.uid()));

-- payments
CREATE POLICY "Biz read payments" ON public.payments FOR SELECT USING (public.can_read_biz(auth.uid()));
CREATE POLICY "Biz write payments" ON public.payments FOR INSERT WITH CHECK (public.can_write_biz(auth.uid()));
CREATE POLICY "Biz update payments" ON public.payments FOR UPDATE USING (public.can_write_biz(auth.uid()));
CREATE POLICY "Admin delete payments" ON public.payments FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- payment_allocations
CREATE POLICY "Biz read allocs" ON public.payment_allocations FOR SELECT USING (public.can_read_biz(auth.uid()));
CREATE POLICY "Biz write allocs" ON public.payment_allocations FOR ALL USING (public.can_write_biz(auth.uid())) WITH CHECK (public.can_write_biz(auth.uid()));

-- stock_ledger
CREATE POLICY "Biz read stock" ON public.stock_ledger FOR SELECT USING (public.can_read_biz(auth.uid()));
CREATE POLICY "Biz write stock" ON public.stock_ledger FOR INSERT WITH CHECK (public.can_write_biz(auth.uid()));

-- expenses
CREATE POLICY "Biz read expenses" ON public.expenses FOR SELECT USING (public.can_read_biz(auth.uid()));
CREATE POLICY "Biz write expenses" ON public.expenses FOR INSERT WITH CHECK (public.can_write_biz(auth.uid()));
CREATE POLICY "Biz update expenses" ON public.expenses FOR UPDATE USING (public.can_write_biz(auth.uid()));
CREATE POLICY "Admin delete expenses" ON public.expenses FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- update leads policy: allow biz to read/manage
DROP POLICY IF EXISTS "Anyone can submit leads" ON public.leads;
CREATE POLICY "Anyone can submit leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Biz read leads" ON public.leads FOR SELECT USING (public.can_read_biz(auth.uid()));
CREATE POLICY "Biz update leads" ON public.leads FOR UPDATE USING (public.can_write_biz(auth.uid()));
CREATE POLICY "Admin delete leads" ON public.leads FOR DELETE USING (public.has_role(auth.uid(),'admin'));
