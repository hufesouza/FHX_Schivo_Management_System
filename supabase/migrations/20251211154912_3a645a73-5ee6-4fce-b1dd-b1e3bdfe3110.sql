-- Create npi_jobs table (one row per NPI project/part)
CREATE TABLE public.npi_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  row_index INTEGER,
  npi_pm TEXT,
  customer TEXT,
  mc_cell TEXT,
  mc TEXT,
  part TEXT,
  dp1 TEXT,
  dp2 TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  days NUMERIC,
  status TEXT,
  gate_commit_date DATE,
  percent_complete NUMERIC,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create npi_prereq table (pre-requisites to start machining)
CREATE TABLE public.npi_prereq (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.npi_jobs(id) ON DELETE CASCADE,
  doc_control TEXT,
  po_printed TEXT,
  packaging TEXT,
  material TEXT,
  tooling TEXT,
  mc_prep TEXT,
  metr_prg TEXT,
  metr_fix TEXT,
  gauges TEXT,
  additional_reqs TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create npi_post_mc table (post machining activities)
CREATE TABLE public.npi_post_mc (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.npi_jobs(id) ON DELETE CASCADE,
  work_instructions TEXT,
  production_ims TEXT,
  qc_ims TEXT,
  fair TEXT,
  re_rev_closure TEXT,
  aging_days NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.npi_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npi_prereq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npi_post_mc ENABLE ROW LEVEL SECURITY;

-- RLS policies for npi_jobs
CREATE POLICY "Authenticated users can view npi_jobs"
ON public.npi_jobs FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert npi_jobs"
ON public.npi_jobs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete npi_jobs"
ON public.npi_jobs FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can update npi_jobs"
ON public.npi_jobs FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- RLS policies for npi_prereq
CREATE POLICY "Authenticated users can view npi_prereq"
ON public.npi_prereq FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert npi_prereq"
ON public.npi_prereq FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete npi_prereq"
ON public.npi_prereq FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can update npi_prereq"
ON public.npi_prereq FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- RLS policies for npi_post_mc
CREATE POLICY "Authenticated users can view npi_post_mc"
ON public.npi_post_mc FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert npi_post_mc"
ON public.npi_post_mc FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete npi_post_mc"
ON public.npi_post_mc FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can update npi_post_mc"
ON public.npi_post_mc FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Create indexes for better query performance
CREATE INDEX idx_npi_jobs_customer ON public.npi_jobs(customer);
CREATE INDEX idx_npi_jobs_mc_cell ON public.npi_jobs(mc_cell);
CREATE INDEX idx_npi_jobs_status ON public.npi_jobs(status);
CREATE INDEX idx_npi_jobs_npi_pm ON public.npi_jobs(npi_pm);
CREATE INDEX idx_npi_prereq_job_id ON public.npi_prereq(job_id);
CREATE INDEX idx_npi_post_mc_job_id ON public.npi_post_mc(job_id);

-- Create trigger for updated_at
CREATE TRIGGER update_npi_jobs_updated_at
BEFORE UPDATE ON public.npi_jobs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();