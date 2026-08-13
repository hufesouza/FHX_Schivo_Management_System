CREATE TABLE public.npi_order_rows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  row_index integer NOT NULL DEFAULT 0,
  row_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX npi_order_rows_site_idx ON public.npi_order_rows (site);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.npi_order_rows TO authenticated;
GRANT ALL ON public.npi_order_rows TO service_role;

ALTER TABLE public.npi_order_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view NPI order rows"
  ON public.npi_order_rows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert NPI order rows"
  ON public.npi_order_rows FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update NPI order rows"
  ON public.npi_order_rows FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete NPI order rows"
  ON public.npi_order_rows FOR DELETE TO authenticated USING (true);

CREATE TRIGGER npi_order_rows_set_updated_at
  BEFORE UPDATE ON public.npi_order_rows
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.npi_order_rows (site, file_name, row_index, row_data, uploaded_by)
SELECT d.site, d.file_name, (e.ord - 1)::int, e.val, d.uploaded_by
FROM public.npi_order_dashboard_data d
CROSS JOIN LATERAL jsonb_array_elements(d.data) WITH ORDINALITY AS e(val, ord);
