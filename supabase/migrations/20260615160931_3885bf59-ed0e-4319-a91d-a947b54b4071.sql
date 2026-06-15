ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS planned_date_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_planned_date timestamptz,
  ADD COLUMN IF NOT EXISTS pending_planned_date_reason text;