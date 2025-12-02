-- Create function to handle user signup from invitation
-- This assigns the role from the invitation when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_from_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Check if there's a pending invitation for this email
  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE email = NEW.email
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  -- If invitation found, assign the role
  IF invitation_record.id IS NOT NULL THEN
    -- Insert user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invitation_record.role);
    
    -- Mark invitation as accepted
    UPDATE public.invitations
    SET accepted_at = now()
    WHERE id = invitation_record.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to run when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_from_invitation();