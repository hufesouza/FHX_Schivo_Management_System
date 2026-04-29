-- Materials catalog (resource library, mirrors npi_tooling_catalog)
CREATE TABLE IF NOT EXISTS public.npi_materials_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_code text,
  material_description text NOT NULL,
  supplier text,
  supplier_id uuid REFERENCES public.npi_suppliers(id) ON DELETE SET NULL,
  default_unit_cost numeric DEFAULT 0,
  default_lead_time_days integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.npi_materials_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read materials catalog"
  ON public.npi_materials_catalog FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert materials catalog"
  ON public.npi_materials_catalog FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update materials catalog"
  ON public.npi_materials_catalog FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated can delete materials catalog"
  ON public.npi_materials_catalog FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER trg_npi_materials_catalog_updated_at
  BEFORE UPDATE ON public.npi_materials_catalog
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Link from part -> catalog material (one material per part, but catalog-driven)
ALTER TABLE public.npi_parts
  ADD COLUMN IF NOT EXISTS material_catalog_id uuid
  REFERENCES public.npi_materials_catalog(id) ON DELETE SET NULL;

-- Seed catalog from existing distinct materials on parts
INSERT INTO public.npi_materials_catalog (material_description, default_lead_time_days)
SELECT DISTINCT btrim(material), MAX(material_lead_time)
FROM public.npi_parts
WHERE material IS NOT NULL AND btrim(material) <> ''
GROUP BY btrim(material)
ON CONFLICT DO NOTHING;

-- Link parts to the seeded catalog rows by name match
UPDATE public.npi_parts p
SET material_catalog_id = c.id
FROM public.npi_materials_catalog c
WHERE p.material_catalog_id IS NULL
  AND p.material IS NOT NULL
  AND lower(btrim(p.material)) = lower(btrim(c.material_description));