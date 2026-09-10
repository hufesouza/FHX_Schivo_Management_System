CREATE POLICY "Authenticated can read purchase order files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'purchase-orders');
CREATE POLICY "Authenticated can upload purchase order files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'purchase-orders');
CREATE POLICY "Authenticated can update purchase order files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'purchase-orders');
CREATE POLICY "Authenticated can delete purchase order files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'purchase-orders');