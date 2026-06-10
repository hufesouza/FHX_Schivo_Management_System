ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS resource_category text NOT NULL DEFAULT 'Machine',
  ADD COLUMN IF NOT EXISTS supplier_name text,
  ADD COLUMN IF NOT EXISTS lead_time_days numeric;