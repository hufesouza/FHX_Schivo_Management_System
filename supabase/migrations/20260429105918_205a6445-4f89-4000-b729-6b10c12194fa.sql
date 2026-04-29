-- Add cost + PO tracking to tooling line items
ALTER TABLE public.npi_tooling_tracker
  ADD COLUMN IF NOT EXISTS po text,
  ADD COLUMN IF NOT EXISTS qty numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catalog_tool_id uuid;

-- Reusable tools catalog
CREATE TABLE IF NOT EXISTS public.npi_tools_catalog (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_code text,
  description text NOT NULL,
  supplier text,
  unit_cost numeric DEFAULT 0,
  lead_time_days integer DEFAULT 0,
  notes text,
  times_used integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS npi_tools_catalog_code_unique
  ON public.npi_tools_catalog (lower(tool_code))
  WHERE tool_code IS NOT NULL;

ALTER TABLE public.npi_tools_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_npi_tools_catalog" ON public.npi_tools_catalog
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_insert_npi_tools_catalog" ON public.npi_tools_catalog
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_npi_tools_catalog" ON public.npi_tools_catalog
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_delete_npi_tools_catalog" ON public.npi_tools_catalog
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_npi_tools_catalog_updated
  BEFORE UPDATE ON public.npi_tools_catalog
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();