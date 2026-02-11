
-- Create storage bucket for balloon drawings
INSERT INTO storage.buckets (id, name, public) VALUES ('balloon-drawings', 'balloon-drawings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for balloon-drawings bucket
CREATE POLICY "Authenticated users can upload balloon drawings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'balloon-drawings');

CREATE POLICY "Authenticated users can view balloon drawings"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'balloon-drawings');

CREATE POLICY "Authenticated users can delete their balloon drawings"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'balloon-drawings');

-- Balloon Jobs table
CREATE TABLE public.balloon_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  standard TEXT DEFAULT 'ASME Y14.5',
  preferred_unit TEXT DEFAULT 'mm',
  report_format TEXT DEFAULT 'generic',
  total_pages INTEGER DEFAULT 0,
  current_step TEXT DEFAULT 'upload',
  error_message TEXT,
  ballooned_pdf_path TEXT,
  excel_path TEXT,
  json_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.balloon_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own balloon jobs"
ON public.balloon_jobs FOR SELECT TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Users can create balloon jobs"
ON public.balloon_jobs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own balloon jobs"
ON public.balloon_jobs FOR UPDATE TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own balloon jobs"
ON public.balloon_jobs FOR DELETE TO authenticated
USING (auth.uid() = created_by);

CREATE TRIGGER update_balloon_jobs_updated_at
BEFORE UPDATE ON public.balloon_jobs
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Balloon Features table
CREATE TABLE public.balloon_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.balloon_jobs(id) ON DELETE CASCADE,
  balloon_id INTEGER NOT NULL,
  feature_type TEXT NOT NULL DEFAULT 'dimension',
  original_text TEXT,
  nominal NUMERIC,
  tol_minus NUMERIC,
  tol_plus NUMERIC,
  unit TEXT DEFAULT 'mm',
  page_number INTEGER DEFAULT 1,
  zone TEXT,
  notes TEXT,
  is_ctq BOOLEAN DEFAULT false,
  confidence NUMERIC DEFAULT 0,
  bbox_x NUMERIC DEFAULT 0,
  bbox_y NUMERIC DEFAULT 0,
  bbox_w NUMERIC DEFAULT 0,
  bbox_h NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.balloon_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view features of their jobs"
ON public.balloon_features FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.balloon_jobs WHERE id = job_id AND created_by = auth.uid()
));

CREATE POLICY "Users can insert features for their jobs"
ON public.balloon_features FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.balloon_jobs WHERE id = job_id AND created_by = auth.uid()
));

CREATE POLICY "Users can update features of their jobs"
ON public.balloon_features FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.balloon_jobs WHERE id = job_id AND created_by = auth.uid()
));

CREATE POLICY "Users can delete features of their jobs"
ON public.balloon_features FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.balloon_jobs WHERE id = job_id AND created_by = auth.uid()
));

CREATE TRIGGER update_balloon_features_updated_at
BEFORE UPDATE ON public.balloon_features
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
