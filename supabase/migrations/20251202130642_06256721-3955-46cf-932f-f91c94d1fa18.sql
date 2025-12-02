-- Drop the existing delete policy
DROP POLICY IF EXISTS "Users can delete their own work orders" ON public.work_orders;

-- Create new policy: Only admins can delete work orders
CREATE POLICY "Only admins can delete work orders" 
ON public.work_orders 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));