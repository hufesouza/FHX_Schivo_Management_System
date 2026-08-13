ALTER TABLE public.npi_order_dashboard_data
  ADD COLUMN IF NOT EXISTS revenue_targets jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.npi_dashboard_sites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.npi_dashboard_sites TO authenticated;
GRANT ALL ON public.npi_dashboard_sites TO service_role;

ALTER TABLE public.npi_dashboard_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dashboard sites"
ON public.npi_dashboard_sites FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create dashboard sites"
ON public.npi_dashboard_sites FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update dashboard sites"
ON public.npi_dashboard_sites FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete dashboard sites"
ON public.npi_dashboard_sites FOR DELETE TO authenticated USING (true);

CREATE TRIGGER npi_dashboard_sites_set_updated_at
BEFORE UPDATE ON public.npi_dashboard_sites
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();