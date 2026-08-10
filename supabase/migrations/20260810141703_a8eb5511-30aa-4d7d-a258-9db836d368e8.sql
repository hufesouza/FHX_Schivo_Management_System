ALTER TABLE public.sched_jobs
  ADD COLUMN IF NOT EXISTS programmer_id uuid REFERENCES public.sched_setters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS programming_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS programming_start date,
  ADD COLUMN IF NOT EXISTS programming_end date,
  ADD COLUMN IF NOT EXISTS programming_status text NOT NULL DEFAULT 'not_scheduled';

CREATE INDEX IF NOT EXISTS sched_jobs_programmer_idx ON public.sched_jobs (programmer_id);
CREATE INDEX IF NOT EXISTS sched_job_allocations_type_idx ON public.sched_job_allocations (alloc_type, alloc_date);