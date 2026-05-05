ALTER TABLE public.npi_parts
  ADD COLUMN IF NOT EXISTS part_level text NOT NULL DEFAULT 'Top Level',
  ADD COLUMN IF NOT EXISTS parent_part_id uuid REFERENCES public.npi_parts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_npi_parts_parent ON public.npi_parts(parent_part_id);
CREATE INDEX IF NOT EXISTS idx_npi_parts_level ON public.npi_parts(part_level);