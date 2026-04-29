-- Site-wide calendar settings (single-row, but keyed by id for flexibility)
CREATE TABLE IF NOT EXISTS public.npi_planner_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL DEFAULT 'IE',
  country_label text NOT NULL DEFAULT 'Ireland',
  weekend_days int[] NOT NULL DEFAULT ARRAY[0,6], -- 0=Sun, 6=Sat
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.npi_planner_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read planner settings"
  ON public.npi_planner_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert planner settings"
  ON public.npi_planner_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update planner settings"
  ON public.npi_planner_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete planner settings"
  ON public.npi_planner_settings FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_npi_planner_settings_updated_at
  BEFORE UPDATE ON public.npi_planner_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.npi_planner_settings (country_code, country_label, weekend_days, is_active)
SELECT 'IE', 'Ireland', ARRAY[0,6], true
WHERE NOT EXISTS (SELECT 1 FROM public.npi_planner_settings);

-- Part-level weekend rules
ALTER TABLE public.npi_parts
  ADD COLUMN IF NOT EXISTS dev_allow_weekends boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prod_allow_weekends boolean NOT NULL DEFAULT true;