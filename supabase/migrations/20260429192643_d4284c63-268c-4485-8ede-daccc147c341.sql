CREATE TABLE public.npi_tooling_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_code TEXT,
  tooling_description TEXT NOT NULL,
  supplier TEXT,
  supplier_id UUID REFERENCES public.npi_suppliers(id) ON DELETE SET NULL,
  default_unit_cost NUMERIC DEFAULT 0,
  default_lead_time_days INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.npi_tooling_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_npi_tooling_catalog" ON public.npi_tooling_catalog
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_insert_npi_tooling_catalog" ON public.npi_tooling_catalog
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_npi_tooling_catalog" ON public.npi_tooling_catalog
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_delete_npi_tooling_catalog" ON public.npi_tooling_catalog
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_npi_tooling_catalog_updated
  BEFORE UPDATE ON public.npi_tooling_catalog
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_npi_tooling_catalog_desc ON public.npi_tooling_catalog (lower(tooling_description));

CREATE TABLE public.npi_part_tooling (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  part_id UUID NOT NULL REFERENCES public.npi_parts(id) ON DELETE CASCADE,
  catalog_tool_id UUID REFERENCES public.npi_tooling_catalog(id) ON DELETE SET NULL,
  tooling_description TEXT NOT NULL,
  supplier TEXT,
  supplier_id UUID REFERENCES public.npi_suppliers(id) ON DELETE SET NULL,
  qty NUMERIC DEFAULT 1,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  lead_time_days INTEGER,
  po TEXT,
  ordered_status TEXT DEFAULT 'Not Ordered',
  expected_delivery_date DATE,
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.npi_part_tooling ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_npi_part_tooling" ON public.npi_part_tooling
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_insert_npi_part_tooling" ON public.npi_part_tooling
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_npi_part_tooling" ON public.npi_part_tooling
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_delete_npi_part_tooling" ON public.npi_part_tooling
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_npi_part_tooling_updated
  BEFORE UPDATE ON public.npi_part_tooling
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_npi_part_tooling_part ON public.npi_part_tooling (part_id);
CREATE INDEX idx_npi_part_tooling_catalog ON public.npi_part_tooling (catalog_tool_id);

INSERT INTO public.npi_tooling_catalog (tooling_description, supplier, supplier_id, default_unit_cost, default_lead_time_days, notes)
SELECT
  tooling_description,
  MAX(supplier),
  (ARRAY_AGG(supplier_id) FILTER (WHERE supplier_id IS NOT NULL))[1],
  AVG(NULLIF(unit_cost, 0)),
  MAX(lead_time_days),
  MAX(notes)
FROM public.npi_tooling_tracker
WHERE tooling_description IS NOT NULL
GROUP BY tooling_description, COALESCE(supplier, '');

INSERT INTO public.npi_part_tooling (
  part_id, catalog_tool_id, tooling_description, supplier, supplier_id,
  qty, unit_cost, total_cost, lead_time_days, po, ordered_status,
  expected_delivery_date, notes, created_at, updated_at
)
SELECT
  t.part_id,
  c.id,
  t.tooling_description,
  t.supplier,
  t.supplier_id,
  COALESCE(t.qty, 1),
  COALESCE(t.unit_cost, 0),
  COALESCE(t.total_cost, 0),
  t.lead_time_days,
  t.po,
  COALESCE(t.ordered_status, 'Not Ordered'),
  t.expected_delivery_date,
  t.notes,
  t.created_at,
  t.updated_at
FROM public.npi_tooling_tracker t
LEFT JOIN public.npi_tooling_catalog c
  ON lower(c.tooling_description) = lower(t.tooling_description)
 AND COALESCE(lower(c.supplier), '') = COALESCE(lower(t.supplier), '')
WHERE t.part_id IS NOT NULL;