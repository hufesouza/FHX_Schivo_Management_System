CREATE TABLE IF NOT EXISTS public.npi_parts_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number TEXT NOT NULL,
  part_revision TEXT,
  description TEXT,
  customer_id UUID,
  customer_name TEXT,
  material TEXT,
  material_lead_time NUMERIC DEFAULT 0,
  material_supplier_id UUID,
  material_supplier_name TEXT,
  tooling TEXT,
  tooling_lead_time NUMERIC DEFAULT 0,
  cycle_time NUMERIC DEFAULT 0,
  development_time NUMERIC DEFAULT 0,
  backend_time NUMERIC DEFAULT 0,
  subcon BOOLEAN DEFAULT false,
  subcon_supplier_id UUID,
  supplier_name TEXT,
  type_of_service TEXT,
  subcon_lead_time NUMERIC DEFAULT 0,
  sales_price NUMERIC DEFAULT 0,
  notes TEXT,
  dev_allow_weekends BOOLEAN DEFAULT false,
  prod_allow_weekends BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_npi_parts_catalog_pn_rev
  ON public.npi_parts_catalog (part_number, COALESCE(part_revision, ''));
CREATE INDEX IF NOT EXISTS idx_npi_parts_catalog_pn ON public.npi_parts_catalog (part_number);

ALTER TABLE public.npi_parts_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read parts catalog"
  ON public.npi_parts_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert parts catalog"
  ON public.npi_parts_catalog FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update parts catalog"
  ON public.npi_parts_catalog FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete parts catalog"
  ON public.npi_parts_catalog FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_npi_parts_catalog_updated
  BEFORE UPDATE ON public.npi_parts_catalog
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();