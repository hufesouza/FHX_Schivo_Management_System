-- Create a security definer function to get users by department for workflow assignment
CREATE OR REPLACE FUNCTION public.get_users_by_department(_department text)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    ur.user_id,
    p.email,
    p.full_name
  FROM public.user_roles ur
  JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role = _department::app_role
$$;