ALTER TABLE public.sched_machines
  ADD COLUMN IF NOT EXISTS effective_machines numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS planned_hours_per_day numeric NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS days_per_week numeric NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS weeks_per_month numeric NOT NULL DEFAULT 4.33,
  ADD COLUMN IF NOT EXISTS availability_pct numeric NOT NULL DEFAULT 85,
  ADD COLUMN IF NOT EXISTS working_days integer[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}';

UPDATE public.sched_machines SET planned_hours_per_day = COALESCE(NULLIF(daily_hours, 0), 18);

ALTER TABLE public.sched_jobs
  ADD COLUMN IF NOT EXISTS scrap_pct numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.sched_machine_part_cycle_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.sched_machines(id) ON DELETE CASCADE,
  part_number text NOT NULL,
  cycle_time numeric NOT NULL DEFAULT 0,
  cycle_time_unit text NOT NULL DEFAULT 'minutes',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (machine_id, part_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sched_machine_part_cycle_times TO authenticated;
GRANT ALL ON public.sched_machine_part_cycle_times TO service_role;

ALTER TABLE public.sched_machine_part_cycle_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view machine part cycle times"
  ON public.sched_machine_part_cycle_times FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can manage machine part cycle times"
  ON public.sched_machine_part_cycle_times FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER sched_machine_part_cycle_times_updated_at
  BEFORE UPDATE ON public.sched_machine_part_cycle_times
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.sched_machine_part_cycle_times;