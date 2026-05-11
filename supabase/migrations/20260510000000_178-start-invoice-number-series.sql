-- Force invoice series for FY 2026-27 to start at 178
INSERT INTO public.number_series (doc_type, fy, prefix, next_number, padding)
VALUES ('invoice', '2026-27', 'PHD/INV/2026-27/', 178, 4)
ON CONFLICT (doc_type, fy) DO UPDATE SET next_number = 178, prefix = 'PHD/INV/2026-27/';
