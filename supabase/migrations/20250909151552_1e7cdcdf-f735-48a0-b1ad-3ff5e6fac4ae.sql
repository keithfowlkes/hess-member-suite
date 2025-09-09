-- Fix the immediate password issue for fowlkes@thecoalition.us
-- Set their password to what they entered during registration using the change-user-password function

-- First, let's create a function to fix pending users with stored passwords
CREATE OR REPLACE FUNCTION public.fix_user_password_from_registration()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
  auth_user_id uuid;
  result_text TEXT := '';
BEGIN
  -- Find users who were created from pending registrations but may not have correct passwords
  FOR user_record IN 
    SELECT pr.email, pr.password_hash, pr.first_name, pr.last_name
    FROM pending_registrations pr
    WHERE pr.approval_status = 'approved' 
    AND pr.password_hash IS NOT NULL
    AND pr.email = 'fowlkes@thecoalition.us'
  LOOP
    -- Get the auth user ID
    SELECT id INTO auth_user_id 
    FROM auth.users 
    WHERE email = user_record.email;
    
    IF auth_user_id IS NOT NULL THEN
      result_text := result_text || 'Found user: ' || user_record.email || ' (ID: ' || auth_user_id || ')' || chr(10);
      
      -- Note: We cannot directly update auth.users password from SQL
      -- This will need to be done via the change-user-password edge function
      result_text := result_text || 'Password stored in registration: ' || 
        CASE WHEN user_record.password_hash IS NOT NULL THEN 'Yes' ELSE 'No' END || chr(10);
    END IF;
  END LOOP;
  
  IF result_text = '' THEN
    result_text := 'No approved registrations found that need password fixing.';
  END IF;
  
  RETURN result_text;
END;
$$;