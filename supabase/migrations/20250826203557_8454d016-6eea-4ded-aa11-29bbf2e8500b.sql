-- Ensure keith.fowlkes@hessconsortium.org always has admin privileges
-- Create a trigger to automatically grant admin role to this specific user

-- First, ensure the user has admin role if they exist
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM profiles p 
WHERE p.email = 'keith.fowlkes@hessconsortium.org'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.user_id AND ur.role = 'admin'::app_role
  );

-- Create a function to ensure keith.fowlkes@hessconsortium.org always gets admin role
CREATE OR REPLACE FUNCTION public.ensure_keith_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- If keith.fowlkes@hessconsortium.org is being inserted/updated, ensure admin role
  IF NEW.email = 'keith.fowlkes@hessconsortium.org' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table to auto-assign admin role to keith.fowlkes@hessconsortium.org
DROP TRIGGER IF EXISTS ensure_keith_admin_trigger ON public.profiles;
CREATE TRIGGER ensure_keith_admin_trigger
  AFTER INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_keith_admin();

-- Prevent deletion of keith's admin role
CREATE OR REPLACE FUNCTION public.protect_keith_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent deletion of admin role for keith.fowlkes@hessconsortium.org
  IF OLD.role = 'admin'::app_role THEN
    IF EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = OLD.user_id 
        AND p.email = 'keith.fowlkes@hessconsortium.org'
    ) THEN
      RAISE EXCEPTION 'Cannot remove admin role from keith.fowlkes@hessconsortium.org';
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to protect keith's admin role from deletion
DROP TRIGGER IF EXISTS protect_keith_admin_role_trigger ON public.user_roles;
CREATE TRIGGER protect_keith_admin_role_trigger
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_keith_admin_role();