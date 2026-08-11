ALTER TABLE public.sched_job_allocations
  DROP CONSTRAINT IF EXISTS sched_job_allocations_job_id_alloc_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS sched_job_allocations_job_type_date_key
  ON public.sched_job_allocations (job_id, alloc_type, alloc_date);