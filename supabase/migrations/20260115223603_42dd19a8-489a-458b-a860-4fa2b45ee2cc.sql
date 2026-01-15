-- Add quote_status column to enquiry_parts to track quotation progress
ALTER TABLE public.enquiry_parts 
ADD COLUMN quote_status text DEFAULT 'pending';

-- Add comment for clarity
COMMENT ON COLUMN public.enquiry_parts.quote_status IS 'Status of the part quotation: pending, quoted';