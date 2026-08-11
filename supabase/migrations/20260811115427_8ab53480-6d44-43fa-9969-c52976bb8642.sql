ALTER TABLE public.sched_jobs
  ADD COLUMN IF NOT EXISTS is_npi boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_production boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS production_type text NOT NULL DEFAULT 'npi_production',
  ADD COLUMN IF NOT EXISTS production_setter_id uuid REFERENCES public.sched_setters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS setup_hours numeric NOT NULL DEFAULT 0;

UPDATE public.sched_jobs
SET is_production = true
WHERE production_quantity > 0 AND is_production = false;

CREATE INDEX IF NOT EXISTS sched_jobs_prod_setter_idx ON public.sched_jobs(production_setter_id);