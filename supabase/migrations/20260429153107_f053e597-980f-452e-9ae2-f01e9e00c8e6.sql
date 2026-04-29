ALTER TABLE public.npi_parts
  ADD COLUMN IF NOT EXISTS material_ordered_at timestamptz,
  ADD COLUMN IF NOT EXISTS material_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS tooling_ordered_at timestamptz,
  ADD COLUMN IF NOT EXISTS tooling_received_at timestamptz;