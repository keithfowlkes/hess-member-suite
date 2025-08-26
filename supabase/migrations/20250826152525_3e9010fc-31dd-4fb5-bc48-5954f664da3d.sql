-- Update the handle_new_user function to automatically assign admin role to keith.fowlkes@hessconsortium.org
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Determine role based on email
  IF NEW.email = 'keith.fowlkes@hessconsortium.org' THEN
    user_role := 'admin';
  ELSE
    user_role := 'member';
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email
  );
  
  -- Assign appropriate role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;