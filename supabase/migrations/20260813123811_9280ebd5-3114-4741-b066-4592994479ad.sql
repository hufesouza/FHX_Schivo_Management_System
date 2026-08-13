GRANT SELECT, INSERT, UPDATE, DELETE ON public.npi_order_dashboard_data TO authenticated;
GRANT ALL ON public.npi_order_dashboard_data TO service_role;

ALTER TABLE public.npi_order_dashboard_data DROP CONSTRAINT IF EXISTS npi_order_dashboard_data_site_check;

DROP POLICY IF EXISTS "Authenticated users can replace NPI order dashboard data" ON public.npi_order_dashboard_data;
CREATE POLICY "Authenticated users can replace NPI order dashboard data"
ON public.npi_order_dashboard_data FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);