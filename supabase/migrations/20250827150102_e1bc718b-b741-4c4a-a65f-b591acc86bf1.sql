-- Fix the token generation function using available PostgreSQL functions
CREATE OR REPLACE FUNCTION public.generate_secure_token()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT encode(sha256(random()::text::bytea || clock_timestamp()::text::bytea), 'base64');
$$;