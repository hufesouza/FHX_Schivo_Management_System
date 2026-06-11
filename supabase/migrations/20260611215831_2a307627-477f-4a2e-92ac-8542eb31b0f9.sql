ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS planned_dev_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS planned_dev_finish TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dev_resource_id UUID REFERENCES public.resources(id);