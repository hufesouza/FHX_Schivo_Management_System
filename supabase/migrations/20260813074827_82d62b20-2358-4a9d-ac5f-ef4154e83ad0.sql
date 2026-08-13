CREATE TABLE public.npi_order_dashboard_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site text NOT NULL UNIQUE CHECK (site IN ('waterford', 'plainview')),
  file_name text NOT NULL,
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.npi_order_dashboard_data TO authenticated;
GRANT ALL ON public.npi_order_dashboard_data TO service_role;

ALTER TABLE public.npi_order_dashboard_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view NPI order dashboard data"
ON public.npi_order_dashboard_data
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can upload NPI order dashboard data"
ON public.npi_order_dashboard_data
FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Authenticated users can replace NPI order dashboard data"
ON public.npi_order_dashboard_data
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (uploaded_by = auth.uid());

CREATE TRIGGER update_npi_order_dashboard_data_updated_at
BEFORE UPDATE ON public.npi_order_dashboard_data
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();