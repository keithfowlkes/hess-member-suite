-- Directly fix the password for fowlkes@thecoalition.us by calling our edge function
-- Since we can't call edge functions from SQL, we'll use a simpler approach

-- Create a temporary function to help with the password fix
CREATE OR REPLACE FUNCTION public.get_user_password_info(user_email TEXT)
RETURNS TABLE(
  auth_user_id UUID,
  stored_password TEXT,
  user_exists BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as auth_user_id,
    pr.password_hash as stored_password,
    (u.id IS NOT NULL) as user_exists
  FROM auth.users u
  RIGHT JOIN pending_registrations pr ON u.email = pr.email
  WHERE pr.email = user_email 
    AND pr.approval_status = 'approved'
    AND pr.password_hash IS NOT NULL;
END;
$$;