
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_name TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  available_hours_per_day NUMERIC NOT NULL DEFAULT 8,
  number_of_shifts INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view resources" ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert resources" ON public.resources FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update resources" ON public.resources FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete resources" ON public.resources FOR DELETE TO authenticated USING (true);

CREATE TRIGGER resources_set_updated_at
BEFORE UPDATE ON public.resources
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
