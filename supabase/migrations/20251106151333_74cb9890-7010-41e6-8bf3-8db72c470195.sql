-- Grant necessary permissions to anon and authenticated roles
GRANT INSERT ON public.member_registration_updates TO anon;
GRANT INSERT ON public.member_registration_updates TO authenticated;
GRANT SELECT ON public.member_registration_updates TO anon;
GRANT SELECT ON public.member_registration_updates TO authenticated;