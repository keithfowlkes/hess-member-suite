-- Fix security warning for generate_secure_token function
CREATE OR REPLACE FUNCTION public.generate_secure_token()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT encode(gen_random_bytes(32), 'base64url');
$$;