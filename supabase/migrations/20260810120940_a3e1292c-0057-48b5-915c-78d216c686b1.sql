ALTER TABLE public.sched_jobs
  ADD COLUMN IF NOT EXISTS production_quantity numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cycle_time numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cycle_time_unit text NOT NULL DEFAULT 'minutes',
  ADD COLUMN IF NOT EXISTS production_start date,
  ADD COLUMN IF NOT EXISTS production_end date,
  ADD COLUMN IF NOT EXISTS production_status text NOT NULL DEFAULT 'not_scheduled';

ALTER TABLE public.sched_job_allocations
  ADD COLUMN IF NOT EXISTS alloc_type text NOT NULL DEFAULT 'development';

UPDATE public.sched_job_allocations SET alloc_type = 'development' WHERE alloc_type IS NULL;

CREATE INDEX IF NOT EXISTS sched_job_allocations_type_date_idx
  ON public.sched_job_allocations (alloc_type, alloc_date);