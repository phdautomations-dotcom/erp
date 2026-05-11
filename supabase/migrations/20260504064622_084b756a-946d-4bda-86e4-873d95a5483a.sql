
CREATE TYPE public.visit_type AS ENUM ('installation','repair','maintenance','inspection','other');
CREATE TYPE public.visit_status AS ENUM ('scheduled','in_progress','completed','cancelled');

CREATE TABLE public.service_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  engineer_user_id UUID,
  engineer_name TEXT NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_type visit_type NOT NULL DEFAULT 'repair',
  machine_details TEXT,
  work_description TEXT NOT NULL,
  parts_used TEXT,
  status visit_status NOT NULL DEFAULT 'completed',
  charges NUMERIC NOT NULL DEFAULT 0,
  next_visit_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_visits_party ON public.service_visits(party_id, visit_date DESC);

ALTER TABLE public.service_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Biz read visits" ON public.service_visits FOR SELECT USING (can_read_biz(auth.uid()));
CREATE POLICY "Biz write visits" ON public.service_visits FOR INSERT WITH CHECK (can_write_biz(auth.uid()));
CREATE POLICY "Biz update visits" ON public.service_visits FOR UPDATE USING (can_write_biz(auth.uid()));
CREATE POLICY "Admin delete visits" ON public.service_visits FOR DELETE USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER set_service_visits_updated_at BEFORE UPDATE ON public.service_visits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
