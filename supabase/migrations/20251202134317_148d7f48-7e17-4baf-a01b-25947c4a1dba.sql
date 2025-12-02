-- Allow department users to view all profiles for workflow collaboration
CREATE POLICY "Department users can view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'engineering'::app_role) OR
  has_role(auth.uid(), 'operations'::app_role) OR
  has_role(auth.uid(), 'quality'::app_role) OR
  has_role(auth.uid(), 'npi'::app_role) OR
  has_role(auth.uid(), 'supply_chain'::app_role)
);