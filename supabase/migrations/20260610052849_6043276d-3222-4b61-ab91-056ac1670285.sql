
CREATE TABLE public.parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  part_number TEXT NOT NULL,
  revision TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX parts_part_number_revision_key
  ON public.parts (part_number, COALESCE(revision, ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parts TO authenticated;
GRANT ALL ON public.parts TO service_role;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view parts" ON public.parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert parts" ON public.parts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update parts" ON public.parts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete parts" ON public.parts FOR DELETE TO authenticated USING (true);
CREATE TRIGGER parts_set_updated_at BEFORE UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.part_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  operation_number INTEGER NOT NULL,
  operation_name TEXT NOT NULL,
  resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  setup_time_hours NUMERIC NOT NULL DEFAULT 0,
  cycle_time_seconds NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (part_id, operation_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.part_operations TO authenticated;
GRANT ALL ON public.part_operations TO service_role;
ALTER TABLE public.part_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view part_operations" ON public.part_operations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert part_operations" ON public.part_operations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update part_operations" ON public.part_operations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete part_operations" ON public.part_operations FOR DELETE TO authenticated USING (true);
CREATE TRIGGER part_operations_set_updated_at BEFORE UPDATE ON public.part_operations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX part_operations_part_id_idx ON public.part_operations (part_id, operation_number);
