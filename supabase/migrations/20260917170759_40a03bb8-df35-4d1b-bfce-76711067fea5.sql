-- partner-assets: logos, banners, inline microsite images (viewable by everyone)
CREATE POLICY "Anyone can view partner assets"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'partner-assets');

CREATE POLICY "Admins can upload partner assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'partner-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update partner assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'partner-assets' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'partner-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete partner assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'partner-assets' AND public.has_role(auth.uid(), 'admin'));

-- partner-files: downloadable documents (signed-in users only)
CREATE POLICY "Signed-in users can view partner files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'partner-files');

CREATE POLICY "Admins can upload partner files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'partner-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update partner files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'partner-files' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'partner-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete partner files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'partner-files' AND public.has_role(auth.uid(), 'admin'));