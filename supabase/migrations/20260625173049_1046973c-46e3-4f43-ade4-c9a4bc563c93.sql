GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;