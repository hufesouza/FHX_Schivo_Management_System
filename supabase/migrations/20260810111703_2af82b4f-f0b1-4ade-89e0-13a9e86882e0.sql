-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.sched_job_status AS ENUM ('planned','in_progress','completed','on_hold','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sched_job_priority AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- MACHINES
CREATE TABLE public.sched_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  daily_hours NUMERIC NOT NULL DEFAULT 24 CHECK (daily_hours >= 0 AND daily_hours <= 24),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sched_machines TO authenticated;
GRANT ALL ON public.sched_machines TO service_role;
ALTER TABLE public.sched_machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sched_machines_read" ON public.sched_machines FOR SELECT TO authenticated USING (true);
CREATE POLICY "sched_machines_write" ON public.sched_machines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER sched_machines_updated_at BEFORE UPDATE ON public.sched_machines FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- SETTERS
CREATE TABLE public.sched_setters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_time TIME NOT NULL DEFAULT '07:30',
  end_time TIME NOT NULL DEFAULT '16:00',
  break_minutes INTEGER NOT NULL DEFAULT 30 CHECK (break_minutes >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sched_setters TO authenticated;
GRANT ALL ON public.sched_setters TO service_role;
ALTER TABLE public.sched_setters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sched_setters_read" ON public.sched_setters FOR SELECT TO authenticated USING (true);
CREATE POLICY "sched_setters_write" ON public.sched_setters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER sched_setters_updated_at BEFORE UPDATE ON public.sched_setters FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- SETTER WORKING DAYS (0=Sunday ... 6=Saturday)
CREATE TABLE public.sched_setter_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setter_id UUID NOT NULL REFERENCES public.sched_setters(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  hours NUMERIC NOT NULL DEFAULT 0 CHECK (hours >= 0 AND hours <= 24),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (setter_id, day_of_week)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sched_setter_days TO authenticated;
GRANT ALL ON public.sched_setter_days TO service_role;
ALTER TABLE public.sched_setter_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sched_setter_days_read" ON public.sched_setter_days FOR SELECT TO authenticated USING (true);
CREATE POLICY "sched_setter_days_write" ON public.sched_setter_days FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER sched_setter_days_updated_at BEFORE UPDATE ON public.sched_setter_days FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- HOLIDAYS / UNAVAILABLE DATES
CREATE TABLE public.sched_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL,
  label TEXT,
  setter_id UUID REFERENCES public.sched_setters(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES public.sched_machines(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sched_holidays_date_idx ON public.sched_holidays (holiday_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sched_holidays TO authenticated;
GRANT ALL ON public.sched_holidays TO service_role;
ALTER TABLE public.sched_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sched_holidays_read" ON public.sched_holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "sched_holidays_write" ON public.sched_holidays FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER sched_holidays_updated_at BEFORE UPDATE ON public.sched_holidays FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- JOBS
CREATE TABLE public.sched_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT NOT NULL UNIQUE,
  part_number TEXT,
  customer TEXT,
  machine_id UUID REFERENCES public.sched_machines(id) ON DELETE SET NULL,
  setter_id UUID REFERENCES public.sched_setters(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  development_hours NUMERIC NOT NULL DEFAULT 0 CHECK (development_hours >= 0),
  priority public.sched_job_priority NOT NULL DEFAULT 'medium',
  status public.sched_job_status NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sched_jobs_start_idx ON public.sched_jobs (start_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sched_jobs TO authenticated;
GRANT ALL ON public.sched_jobs TO service_role;
ALTER TABLE public.sched_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sched_jobs_read" ON public.sched_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "sched_jobs_write" ON public.sched_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER sched_jobs_updated_at BEFORE UPDATE ON public.sched_jobs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- DAILY ALLOCATIONS (derived from scheduling engine, regenerated on job save)
CREATE TABLE public.sched_job_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.sched_jobs(id) ON DELETE CASCADE,
  setter_id UUID REFERENCES public.sched_setters(id) ON DELETE SET NULL,
  machine_id UUID REFERENCES public.sched_machines(id) ON DELETE SET NULL,
  alloc_date DATE NOT NULL,
  hours NUMERIC NOT NULL CHECK (hours >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, alloc_date)
);
CREATE INDEX sched_alloc_date_idx ON public.sched_job_allocations (alloc_date);
CREATE INDEX sched_alloc_setter_idx ON public.sched_job_allocations (setter_id, alloc_date);
CREATE INDEX sched_alloc_machine_idx ON public.sched_job_allocations (machine_id, alloc_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sched_job_allocations TO authenticated;
GRANT ALL ON public.sched_job_allocations TO service_role;
ALTER TABLE public.sched_job_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sched_alloc_read" ON public.sched_job_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "sched_alloc_write" ON public.sched_job_allocations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- AUDIT LOG
CREATE TABLE public.sched_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  entity_label TEXT,
  previous_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sched_audit_created_idx ON public.sched_audit_log (created_at DESC);
GRANT SELECT, INSERT ON public.sched_audit_log TO authenticated;
GRANT ALL ON public.sched_audit_log TO service_role;
ALTER TABLE public.sched_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sched_audit_read" ON public.sched_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "sched_audit_insert" ON public.sched_audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- REALTIME
ALTER TABLE public.sched_machines REPLICA IDENTITY FULL;
ALTER TABLE public.sched_setters REPLICA IDENTITY FULL;
ALTER TABLE public.sched_setter_days REPLICA IDENTITY FULL;
ALTER TABLE public.sched_holidays REPLICA IDENTITY FULL;
ALTER TABLE public.sched_jobs REPLICA IDENTITY FULL;
ALTER TABLE public.sched_job_allocations REPLICA IDENTITY FULL;
ALTER TABLE public.sched_audit_log REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.sched_machines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sched_setters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sched_setter_days;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sched_holidays;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sched_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sched_job_allocations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sched_audit_log;