-- Add estimated_duration_days column to npi_design_transfer_items
ALTER TABLE public.npi_design_transfer_items 
ADD COLUMN estimated_duration_days integer DEFAULT 5;

-- Add comment for clarity
COMMENT ON COLUMN public.npi_design_transfer_items.estimated_duration_days IS 'Estimated number of days to complete this task. Used for Gantt chart visualization.';