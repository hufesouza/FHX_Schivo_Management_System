ALTER TABLE public.npi_parts
  ADD COLUMN IF NOT EXISTS kanban_stage text NOT NULL DEFAULT 'Material and Tooling',
  ADD COLUMN IF NOT EXISTS setter_id uuid,
  ADD COLUMN IF NOT EXISTS stage_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.npi_setters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setter_name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.npi_setters TO authenticated;
GRANT ALL ON public.npi_setters TO service_role;

ALTER TABLE public.npi_setters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view setters" ON public.npi_setters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create setters" ON public.npi_setters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update setters" ON public.npi_setters FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete setters" ON public.npi_setters FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_npi_setters_updated
  BEFORE UPDATE ON public.npi_setters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.npi_parts
  ADD CONSTRAINT npi_parts_setter_id_fkey FOREIGN KEY (setter_id)
  REFERENCES public.npi_setters(id) ON DELETE SET NULL;