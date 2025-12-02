-- Fix #1: Profiles table - restrict to own profile or admin access
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix #2: Work orders - restrict UPDATE to relevant department roles, admins, or creator
DROP POLICY IF EXISTS "Users can update any work order" ON public.work_orders;

CREATE POLICY "Creator can update own work order"
ON public.work_orders
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any work order"
ON public.work_orders
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Department users can update work orders"
ON public.work_orders
FOR UPDATE
USING (
  has_role(auth.uid(), 'engineering'::app_role) OR
  has_role(auth.uid(), 'operations'::app_role) OR
  has_role(auth.uid(), 'quality'::app_role) OR
  has_role(auth.uid(), 'npi'::app_role) OR
  has_role(auth.uid(), 'supply_chain'::app_role)
);