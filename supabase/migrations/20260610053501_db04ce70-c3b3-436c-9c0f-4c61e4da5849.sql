
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_number TEXT NOT NULL UNIQUE,
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  due_date DATE NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal',
  status TEXT NOT NULL DEFAULT 'Planned',
  development_time_hours NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  planned_start TIMESTAMPTZ,
  planned_finish TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view jobs" ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update jobs" ON public.jobs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete jobs" ON public.jobs FOR DELETE TO authenticated USING (true);
CREATE TRIGGER jobs_set_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.job_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  operation_number INTEGER NOT NULL,
  operation_name TEXT NOT NULL,
  resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  setup_time_hours NUMERIC NOT NULL DEFAULT 0,
  cycle_time_seconds NUMERIC NOT NULL DEFAULT 0,
  total_time_hours NUMERIC NOT NULL DEFAULT 0,
  sequence_order INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_operations TO authenticated;
GRANT ALL ON public.job_operations TO service_role;
ALTER TABLE public.job_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view job_operations" ON public.job_operations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert job_operations" ON public.job_operations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update job_operations" ON public.job_operations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete job_operations" ON public.job_operations FOR DELETE TO authenticated USING (true);
CREATE TRIGGER job_operations_set_updated_at BEFORE UPDATE ON public.job_operations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE INDEX job_operations_job_id_idx ON public.job_operations (job_id, sequence_order);
