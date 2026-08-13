GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.npi_order_dashboard_data TO authenticated;
GRANT ALL ON TABLE public.npi_order_dashboard_data TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.npi_dashboard_sites TO authenticated;
GRANT ALL ON TABLE public.npi_dashboard_sites TO service_role;