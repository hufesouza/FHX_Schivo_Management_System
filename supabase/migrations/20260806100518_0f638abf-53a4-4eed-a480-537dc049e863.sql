ALTER TABLE public.npi_parts
  ADD COLUMN IF NOT EXISTS quotation_file_path text,
  ADD COLUMN IF NOT EXISTS quotation_file_name text;

CREATE POLICY "Authenticated can read part quotations"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'part-quotations');

CREATE POLICY "Authenticated can upload part quotations"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'part-quotations');

CREATE POLICY "Authenticated can update part quotations"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'part-quotations');

CREATE POLICY "Authenticated can delete part quotations"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'part-quotations');