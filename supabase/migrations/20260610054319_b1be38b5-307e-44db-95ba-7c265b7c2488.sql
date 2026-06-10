ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS planned_start timestamptz,
  ADD COLUMN IF NOT EXISTS planned_finish timestamptz,
  ADD COLUMN IF NOT EXISTS schedule_status text NOT NULL DEFAULT 'Unscheduled';

ALTER TABLE public.job_operations
  ADD COLUMN IF NOT EXISTS planned_start timestamptz,
  ADD COLUMN IF NOT EXISTS planned_finish timestamptz,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sequence_order integer;