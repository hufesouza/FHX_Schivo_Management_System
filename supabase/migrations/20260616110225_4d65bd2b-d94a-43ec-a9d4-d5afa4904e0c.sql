
-- 1. Part type on parts
ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS part_type text NOT NULL DEFAULT 'Single Part'
    CHECK (part_type IN ('Single Part','Assembly'));

-- 2. BOM components linking assemblies to their subcomponents
CREATE TABLE IF NOT EXISTS public.part_bom_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  component_part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE RESTRICT,
  quantity_per_assembly numeric NOT NULL DEFAULT 1 CHECK (quantity_per_assembly > 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT part_bom_no_self CHECK (assembly_part_id <> component_part_id),
  CONSTRAINT part_bom_unique_pair UNIQUE (assembly_part_id, component_part_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.part_bom_components TO authenticated;
GRANT ALL ON public.part_bom_components TO service_role;

ALTER TABLE public.part_bom_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read BOM" ON public.part_bom_components
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert BOM" ON public.part_bom_components
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update BOM" ON public.part_bom_components
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete BOM" ON public.part_bom_components
  FOR DELETE TO authenticated USING (true);

CREATE TRIGGER part_bom_components_set_updated_at
  BEFORE UPDATE ON public.part_bom_components
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_part_bom_assembly ON public.part_bom_components(assembly_part_id);
CREATE INDEX IF NOT EXISTS idx_part_bom_component ON public.part_bom_components(component_part_id);

-- 3. Hierarchy fields on jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS parent_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_level text NOT NULL DEFAULT 'Single Job'
    CHECK (job_level IN ('Parent Assembly','Subcomponent','Single Job'));

CREATE INDEX IF NOT EXISTS idx_jobs_parent_job_id ON public.jobs(parent_job_id);
