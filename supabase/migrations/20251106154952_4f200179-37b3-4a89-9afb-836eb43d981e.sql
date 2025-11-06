-- Grant INSERT permission to anon and authenticated roles
GRANT INSERT ON public.member_registration_updates TO anon, authenticated;

-- Grant SELECT permission so they can see the inserted row with .select().single()
GRANT SELECT ON public.member_registration_updates TO anon, authenticated;