-- Create production_jobs table for individual job tracking
CREATE TABLE public.production_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_order TEXT NOT NULL,
  production_order TEXT,
  machine TEXT NOT NULL,
  original_machine TEXT NOT NULL,
  department TEXT NOT NULL,
  end_product TEXT,
  item_name TEXT,
  customer TEXT,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_hours NUMERIC NOT NULL DEFAULT 0,
  original_duration_hours NUMERIC NOT NULL DEFAULT 0,
  qty INTEGER DEFAULT 0,
  days_from_today INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled',
  comments TEXT,
  is_manually_moved BOOLEAN NOT NULL DEFAULT false,
  moved_by UUID,
  moved_at TIMESTAMP WITH TIME ZONE,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT production_jobs_process_order_dept_unique UNIQUE (process_order, department)
);

-- Enable RLS
ALTER TABLE public.production_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view production jobs"
ON public.production_jobs
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert production jobs"
ON public.production_jobs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update production jobs"
ON public.production_jobs
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete production jobs"
ON public.production_jobs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_production_jobs_process_order ON public.production_jobs(process_order);
CREATE INDEX idx_production_jobs_department ON public.production_jobs(department);
CREATE INDEX idx_production_jobs_machine ON public.production_jobs(machine);

-- Create updated_at trigger
CREATE TRIGGER update_production_jobs_updated_at
BEFORE UPDATE ON public.production_jobs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create job_move_history table for audit trail
CREATE TABLE public.job_move_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.production_jobs(id) ON DELETE CASCADE,
  from_machine TEXT NOT NULL,
  to_machine TEXT NOT NULL,
  old_duration_hours NUMERIC NOT NULL,
  new_duration_hours NUMERIC NOT NULL,
  old_start_datetime TIMESTAMP WITH TIME ZONE,
  new_start_datetime TIMESTAMP WITH TIME ZONE,
  moved_by UUID NOT NULL,
  moved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT
);

-- Enable RLS for move history
ALTER TABLE public.job_move_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view job move history"
ON public.job_move_history
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert job move history"
ON public.job_move_history
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);