ALTER TABLE public.npi_parts
DROP COLUMN IF EXISTS total_required_time;

ALTER TABLE public.npi_parts
ADD COLUMN total_required_time NUMERIC GENERATED ALWAYS AS (
  COALESCE(development_time, 0) + (COALESCE(cycle_time, 0) * COALESCE(qty, 0))
) STORED;