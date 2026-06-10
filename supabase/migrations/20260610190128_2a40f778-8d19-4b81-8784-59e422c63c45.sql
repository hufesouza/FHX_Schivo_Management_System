CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.resource_lookups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('category','type')),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_lookups TO authenticated;
GRANT ALL ON public.resource_lookups TO service_role;

ALTER TABLE public.resource_lookups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read resource lookups"
  ON public.resource_lookups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert resource lookups"
  ON public.resource_lookups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update resource lookups"
  ON public.resource_lookups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete resource lookups"
  ON public.resource_lookups FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_resource_lookups_updated_at
  BEFORE UPDATE ON public.resource_lookups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.resource_lookups (kind, name) VALUES
  ('category','Machining'),
  ('category','Subcontractor'),
  ('type','Swiss Turning'),
  ('type','Turning'),
  ('type','Milling'),
  ('type','Inspection'),
  ('type','Deburr'),
  ('type','Assembly'),
  ('type','Laser'),
  ('type','Other')
ON CONFLICT DO NOTHING;