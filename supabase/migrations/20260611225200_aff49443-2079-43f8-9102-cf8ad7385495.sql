
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS dev_person_id uuid NULL REFERENCES public.resources(id) ON DELETE SET NULL;

INSERT INTO public.resource_lookups (kind, name)
SELECT 'category', 'Person'
WHERE NOT EXISTS (
  SELECT 1 FROM public.resource_lookups WHERE kind = 'category' AND name = 'Person'
);
