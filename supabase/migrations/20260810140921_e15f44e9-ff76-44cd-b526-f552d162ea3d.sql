ALTER TABLE public.sched_jobs ADD COLUMN IF NOT EXISTS po_number text;

UPDATE public.sched_jobs
SET po_number = COALESCE(NULLIF(po_number, ''), 'PO-' || upper(substr(replace(id::text,'-',''), 1, 8)))
WHERE po_number IS NULL OR po_number = '';

ALTER TABLE public.sched_jobs ALTER COLUMN po_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sched_jobs_po_number_key ON public.sched_jobs (po_number);