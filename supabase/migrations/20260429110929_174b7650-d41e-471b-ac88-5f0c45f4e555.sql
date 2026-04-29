-- Suppliers catalog
CREATE TABLE IF NOT EXISTS public.npi_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  default_lead_time_days INTEGER,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS npi_suppliers_name_uniq ON public.npi_suppliers (lower(supplier_name));

ALTER TABLE public.npi_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view suppliers" ON public.npi_suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert suppliers" ON public.npi_suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update suppliers" ON public.npi_suppliers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete suppliers" ON public.npi_suppliers FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_npi_suppliers_updated_at BEFORE UPDATE ON public.npi_suppliers
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Per-tool lead time on tooling tracker
ALTER TABLE public.npi_tooling_tracker
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER,
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.npi_suppliers(id) ON DELETE SET NULL;

-- Link tools catalog to supplier
ALTER TABLE public.npi_tools_catalog
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.npi_suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;
