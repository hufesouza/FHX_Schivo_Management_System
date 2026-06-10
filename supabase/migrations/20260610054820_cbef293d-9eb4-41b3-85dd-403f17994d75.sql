ALTER TABLE public.job_operations
  ADD COLUMN IF NOT EXISTS has_conflict boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sequence_warning boolean NOT NULL DEFAULT false;