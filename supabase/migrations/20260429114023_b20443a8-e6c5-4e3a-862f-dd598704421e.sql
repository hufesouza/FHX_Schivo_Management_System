
CREATE TABLE IF NOT EXISTS public.npi_machine_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES public.npi_machines(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_npi_machine_availability_machine ON public.npi_machine_availability(machine_id);
CREATE INDEX IF NOT EXISTS idx_npi_machine_availability_dates ON public.npi_machine_availability(start_date, end_date);

ALTER TABLE public.npi_machine_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view machine availability"
  ON public.npi_machine_availability FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can insert machine availability"
  ON public.npi_machine_availability FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update machine availability"
  ON public.npi_machine_availability FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated can delete machine availability"
  ON public.npi_machine_availability FOR DELETE
  TO authenticated USING (true);

CREATE TRIGGER trg_npi_machine_availability_updated
  BEFORE UPDATE ON public.npi_machine_availability
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
