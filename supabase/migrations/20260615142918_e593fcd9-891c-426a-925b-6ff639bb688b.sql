ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS best_commence_date timestamptz,
  ADD COLUMN IF NOT EXISTS latest_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS schedule_risk text NOT NULL DEFAULT 'On Track';